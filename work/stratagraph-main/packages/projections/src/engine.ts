// packages/projections/src/engine.ts

import type {
  TimeSlice,
  ProjectionItem,
  ProjectionVersion,
  ProjectionProject,
  ProjectionComment,
  VarianceResult,
  AlertSeverity,
  AlertType,
  ProjectionAlert,
  AlertsResult,
  PhaseHistoryPoint,
  SummaryRow,
  SummaryResult,
  FinancialSummary,
} from './types';
import { classifyMetric } from './metrics/resolver';
import type { Metric } from './metrics/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const makeLineKey = (...parts: string[]): string =>
  parts.map((p) => p.trim()).join('|');

export const VARIANCE_THRESHOLD_PCT = 5;

// ---------------------------------------------------------------------------
// Slice derivation
// ---------------------------------------------------------------------------

export const blankSlice = (): TimeSlice => ({
  qty: 0,
  hours: 0,
  upm: 0,
  mpu: 0,
  uc: 0,
  cost: 0,
});

export function deriveSlice(s: TimeSlice): TimeSlice {
  const out = { ...s };
  if (out.qty > 0) {
    const derived = out.cost / out.qty;
    out.uc = derived !== 0 ? derived : out.uc || 0;
    out.mpu = out.hours / out.qty;
    out.upm = out.hours > 0 ? out.qty / out.hours : 0;
  } else {
    out.uc = out.uc || 0;
    out.mpu = 0;
    out.upm = 0;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Item derivation
// ---------------------------------------------------------------------------

export function deriveItem(
  item: ProjectionItem,
  prevF: TimeSlice | null = null,
): ProjectionItem {
  const CTP = deriveSlice(item.CTP);
  const CTD = deriveSlice(item.CTD);
  const Est = deriveSlice(item.Est);
  const F = deriveSlice(item.F);

  const prevForecast = prevF?.cost ?? item.Est.cost;

  const CTC = deriveSlice({
    qty: F.qty - CTD.qty,
    hours: F.hours - CTD.hours,
    cost: F.cost - CTD.cost,
    upm: 0,
    mpu: 0,
    uc: 0,
  });

  const calcHrs = CTD.cost > 0 ? (CTD.hours / CTD.cost) * F.cost : 0;
  const comp = F.cost > 0 ? (CTD.cost / F.cost) * 100 : 0;
  const wsRisk =
    CTD.qty > 0 ? F.cost - (CTD.cost * F.qty) / CTD.qty : 0;

  return { ...item, CTP, CTD, F, Est, CTC, comp, prevForecast, calcHrs, wsRisk };
}

export function blankItem(opts: {
  keyParts: string[];
  label: string;
  unitOfMeasure: string;
}): ProjectionItem {
  return {
    lineKey: makeLineKey(...opts.keyParts),
    keyParts: opts.keyParts,
    label: opts.label,
    unitOfMeasure: opts.unitOfMeasure,
    CTP: blankSlice(),
    CTD: blankSlice(),
    CTC: blankSlice(),
    F: blankSlice(),
    Est: blankSlice(),
    estVar: 0,
    comp: 0,
    prevForecast: 0,
    calcHrs: 0,
    wsRisk: 0,
    isNew: false,
    stale: false,
  };
}

// ---------------------------------------------------------------------------
// Project factory
// ---------------------------------------------------------------------------

export function createEmptyProject(name: string): ProjectionProject {
  return {
    id: uid(),
    name,
    jobNumber: '',
    customer: '',
    pm: '',
    createdAt: new Date().toISOString(),
    versions: [],
    draft: null,
    comments: {},
    alertStatus: {},
    financials: null,
  };
}

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

export function ingestDump(
  project: ProjectionProject,
  rows: ProjectionItem[],
  label: string,
): ProjectionProject {
  const latest = project.versions[project.versions.length - 1];
  const incoming = new Map(rows.map((r) => [r.lineKey, r]));

  const prevMap = new Map<string, TimeSlice>();
  if (latest) {
    for (const it of latest.items) {
      prevMap.set(it.lineKey, it.F);
    }
  }

  let items: ProjectionItem[];
  if (!latest) {
    items = rows.map((r) => ({ ...deriveItem(r, null), isNew: false, stale: false }));
  } else {
    const carriedKeys = new Set<string>();
    const carried = latest.items.map((prev) => {
      const fresh = incoming.get(prev.lineKey);
      if (fresh) {
        carriedKeys.add(prev.lineKey);
        const prevF = prevMap.get(prev.lineKey) ?? null;
        return { ...deriveItem(fresh, prevF), isNew: false, stale: false };
      }
      return { ...prev, stale: true, isNew: false };
    });

    const added: ProjectionItem[] = [];
    incoming.forEach((row, k) => {
      if (!carriedKeys.has(k))
        added.push({ ...deriveItem(row, null), isNew: true, stale: false });
    });
    items = [...carried, ...added];
  }

  const draft: ProjectionVersion = {
    id: uid(),
    label: label || autoLabel(),
    createdAt: new Date().toISOString(),
    items,
    saved: false,
  };
  return { ...project, draft };
}

export function ingestBatch(
  project: ProjectionProject,
  cycles: Array<{
    label: string;
    detectedDate?: { iso: string } | null;
    items: ProjectionItem[];
    notes?: Record<string, string>;
  }>,
  financials: FinancialSummary | null,
): ProjectionProject {
  let result = { ...project };

  if (financials) {
    result.financials = financials;
  }

  for (const cycle of cycles) {
    if (cycle.notes) {
      for (const [key, text] of Object.entries(cycle.notes)) {
        const existing = result.comments[key] ?? [];
        const isDuplicate = existing.some((c) => c.text === text);
        if (!isDuplicate) {
          result.comments = {
            ...result.comments,
            [key]: [
              ...existing,
              {
                id: uid(),
                author: 'Imported from worksheet',
                text,
                createdAt: cycle.detectedDate?.iso ?? new Date().toISOString(),
                versionLabel: cycle.label,
              },
            ],
          };
        }
      }
    }
  }

  for (const cycle of cycles) {
    const prevVersion = result.versions[result.versions.length - 1];
    const prevMap = new Map<string, TimeSlice>();
    if (prevVersion) {
      for (const it of prevVersion.items) {
        prevMap.set(it.lineKey, it.F);
      }
    }

    const incomingKeys = new Set(cycle.items.map((r) => r.lineKey));
    const carriedKeys = new Set<string>();

    const items: ProjectionItem[] = cycle.items.map((r) => {
      carriedKeys.add(r.lineKey);
      const prevF = prevMap.get(r.lineKey) ?? null;
      const isNew = prevVersion != null && !prevMap.has(r.lineKey);
      return { ...deriveItem(r, prevF), isNew, stale: false };
    });

    if (prevVersion) {
      for (const prev of prevVersion.items) {
        if (!incomingKeys.has(prev.lineKey)) {
          items.push({ ...prev, stale: true, isNew: false });
        }
      }
    }

    const version: ProjectionVersion = {
      id: uid(),
      label: cycle.label,
      createdAt: cycle.detectedDate?.iso ?? new Date().toISOString(),
      items,
      saved: true,
    };

    const existingIdx = result.versions.findIndex((v) => v.label === cycle.label);
    if (existingIdx >= 0) {
      result.versions = result.versions.map((v, i) =>
        i === existingIdx ? version : v,
      );
    } else {
      result.versions = [...result.versions, version];
    }
  }

  result.versions = [...result.versions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  return result;
}

// ---------------------------------------------------------------------------
// Draft operations
// ---------------------------------------------------------------------------

function autoLabel(): string {
  const d = new Date();
  return `${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Projection`;
}

export function findItem(
  items: ProjectionItem[],
  key: string,
): ProjectionItem | undefined {
  return items.find((it) => it.lineKey === key);
}

export function startDraft(project: ProjectionProject): ProjectionProject {
  if (project.draft) return project;
  const latest = project.versions.at(-1);
  if (!latest) return project;
  return {
    ...project,
    draft: {
      ...latest,
      id: uid(),
      label: autoLabel(),
      createdAt: new Date().toISOString(),
      saved: false,
    },
  };
}

export function saveDraft(project: ProjectionProject): ProjectionProject {
  if (!project.draft) return project;
  const saved: ProjectionVersion = { ...project.draft, saved: true };
  return { ...project, versions: [...project.versions, saved], draft: null };
}

export function discardDraft(project: ProjectionProject): ProjectionProject {
  return { ...project, draft: null };
}

export function lockVersion(
  project: ProjectionProject,
  versionId: string
): ProjectionProject {
  return {
    ...project,
    versions: project.versions.map((v) =>
      v.id === versionId ? { ...v, saved: true, label: v.label.includes('(Submitted)') ? v.label : `${v.label} (Submitted)` } : v
    ),
  };
}

function deepMerge(item: ProjectionItem, patch: Partial<ProjectionItem>): ProjectionItem {
  const next = { ...item } as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      next[k] &&
      typeof next[k] === 'object'
    ) {
      next[k] = { ...(next[k] as Record<string, unknown>), ...(v as unknown as Record<string, unknown>) };
    } else {
      next[k] = v;
    }
  }
  return next as unknown as ProjectionItem;
}

export function updateDraftItem(
  project: ProjectionProject,
  key: string,
  patch: Partial<ProjectionItem>,
): ProjectionProject {
  let p = project;
  if (!p.draft) p = startDraft(p);
  if (!p.draft) return p;
  return {
    ...p,
    draft: {
      ...p.draft,
      items: p.draft.items.map((it) =>
        it.lineKey === key ? deepMerge(it, patch) : it,
      ),
    },
  };
}

export function updateForecast(
  project: ProjectionProject,
  key: string,
  patch: { qty?: number; hours?: number; cost?: number },
): ProjectionProject {
  let p = project;
  if (!p.draft) p = startDraft(p);
  if (!p.draft) return p;
  const item = findItem(p.draft.items, key);
  if (!item) return p;

  const F: TimeSlice = { ...item.F };
  if ('qty' in patch) F.qty = patch.qty!;
  if ('hours' in patch) F.hours = patch.hours!;
  if ('cost' in patch) F.cost = patch.cost!;

  const derivedF = deriveSlice(F);

  const CTC = deriveSlice({
    qty: derivedF.qty - item.CTD.qty,
    hours: derivedF.hours - item.CTD.hours,
    cost: derivedF.cost - item.CTD.cost,
    upm: 0,
    mpu: 0,
    uc: 0,
  });

  const comp = derivedF.cost > 0 ? (item.CTD.cost / derivedF.cost) * 100 : 0;
  const calcHrs =
    item.CTD.cost > 0 ? (item.CTD.hours / item.CTD.cost) * derivedF.cost : 0;
  const wsRisk =
    item.CTD.qty > 0
      ? derivedF.cost - (item.CTD.cost * derivedF.qty) / item.CTD.qty
      : 0;

  return updateDraftItem(p, key, { F: derivedF, CTC, comp, calcHrs, wsRisk });
}

/**
 * Write a user-entered value for an editable metric. Standard editable fields
 * (qty/hours/cost on the F slice) route through updateForecast so dependent
 * derived fields recompute; everything else stores an override in item.values
 * that the resolver prefers over the computed value.
 */
export function updateMetricValue(
  project: ProjectionProject,
  key: string,
  metric: Metric,
  value: number,
): ProjectionProject {
  const cls = classifyMetric(metric);
  if (
    cls.kind === 'standard' &&
    cls.slice === 'F' &&
    (cls.field === 'qty' || cls.field === 'hours' || cls.field === 'cost')
  ) {
    return updateForecast(project, key, { [cls.field]: value });
  }

  let p = project;
  if (!p.draft) p = startDraft(p);
  if (!p.draft) return p;
  const item = findItem(p.draft.items, key);
  if (!item) return p;
  const values = { ...(item.values ?? {}), [metric.id]: value };
  return updateDraftItem(p, key, { values });
}

/** Remove an override so the column reverts to its computed/upload value. */
export function clearMetricOverride(
  project: ProjectionProject,
  key: string,
  metricId: string,
): ProjectionProject {
  let p = project;
  if (!p.draft) p = startDraft(p);
  if (!p.draft) return p;
  const item = findItem(p.draft.items, key);
  if (!item?.values || !(metricId in item.values)) return p;
  const values = { ...item.values };
  delete values[metricId];
  // Use a direct spread (not deepMerge) so the values map is fully replaced,
  // not merged — deepMerge would leave deleted keys in place.
  return {
    ...p,
    draft: {
      ...p.draft,
      items: p.draft.items.map((it) =>
        it.lineKey === key ? { ...it, values } : it,
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Variance lenses
// ---------------------------------------------------------------------------

function currentAndPrevious(project: ProjectionProject): {
  current: ProjectionVersion | null;
  previous: ProjectionVersion | null;
} {
  if (project.draft) {
    return {
      current: project.draft,
      previous: project.versions[project.versions.length - 1] ?? null,
    };
  }
  return {
    current: project.versions[project.versions.length - 1] ?? null,
    previous: project.versions[project.versions.length - 2] ?? null,
  };
}

export function lensVsPrev(
  project: ProjectionProject,
  key: string,
): VarianceResult | null {
  const { current } = currentAndPrevious(project);
  const cur = current ? findItem(current.items, key) : null;
  if (!cur) return null;
  const prevCost = cur.prevForecast ?? cur.Est.cost;
  const delta = cur.F.cost - prevCost;
  const pct = prevCost ? (delta / prevCost) * 100 : 0;
  return { delta, pct, base: prevCost, current: cur.F.cost };
}

export function lensVsOrig(
  project: ProjectionProject,
  key: string,
): VarianceResult | null {
  const { current } = currentAndPrevious(project);
  const cur = current ? findItem(current.items, key) : null;
  if (!cur) return null;
  const base = cur.Est.cost;
  const delta = cur.F.cost - base;
  const pct = base ? (delta / base) * 100 : 0;
  return { delta, pct, base, current: cur.F.cost };
}

export function lensLeftToSpend(
  project: ProjectionProject,
  key: string,
): VarianceResult | null {
  const { current, previous } = currentAndPrevious(project);
  const cur = current ? findItem(current.items, key) : null;
  if (!cur) return null;
  const delta = cur.F.cost - cur.CTD.cost;
  const pct = cur.F.cost ? (delta / cur.F.cost) * 100 : 0;
  const prev = previous ? findItem(previous.items, key) : null;
  const prevLts = prev ? prev.F.cost - prev.CTD.cost : null;
  const ltsChange = prevLts != null ? delta - prevLts : null;
  return { delta, pct, base: cur.F.cost, current: cur.CTD.cost, prevLts, ltsChange };
}

export function computeVariance(
  newForecast: number,
  prevForecast: number,
): { delta: number; pct: number; significant: boolean } {
  const delta = (newForecast ?? 0) - (prevForecast ?? 0);
  const pct = prevForecast ? (delta / prevForecast) * 100 : 0;
  const significant = Math.abs(pct) >= VARIANCE_THRESHOLD_PCT;
  return { delta, pct, significant };
}

export function varianceTone(
  delta: number,
  significant: boolean,
): 'neutral' | 'positive' | 'negative' {
  if (!significant) return 'neutral';
  return delta > 0 ? 'negative' : 'positive';
}

// ---------------------------------------------------------------------------
// Completion lenses
// ---------------------------------------------------------------------------

export function qtyComplete(item: ProjectionItem): number | null {
  const denom = item.F.qty || item.Est.qty;
  if (!denom) return null;
  return (item.CTD.qty / denom) * 100;
}

export function dollarComplete(item: ProjectionItem): number | null {
  const denom = item.F.cost || item.Est.cost;
  if (!denom) return null;
  return (item.CTD.cost / denom) * 100;
}

// ---------------------------------------------------------------------------
// Risk score
// ---------------------------------------------------------------------------

export function riskScore(
  project: ProjectionProject,
  key: string,
): {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  exposure: number;
  prevExposure: number | null;
  exposureChange: number | null;
} | null {
  const { current, previous } = currentAndPrevious(project);
  const cur = current ? findItem(current.items, key) : null;
  if (!cur) return null;
  if (cur.CTD.cost === 0 && cur.F.cost === 0) return null;

  const qPct = qtyComplete(cur);
  const dPct = dollarComplete(cur);
  const pct = qPct || dPct;

  if (!pct || pct === 0)
    return { score: 0, level: 'low', reasons: [], exposure: 0, prevExposure: null, exposureChange: null };

  const projectedCost = cur.CTD.cost / (pct / 100);
  const exposure = cur.F.cost - projectedCost;

  let prevExposure: number | null = null;
  const prev = previous ? findItem(previous.items, key) : null;
  if (prev && (prev.CTD.cost > 0 || prev.F.cost > 0)) {
    const prevPct = qtyComplete(prev) || dollarComplete(prev);
    if (prevPct && prevPct > 0) {
      const prevProjected = prev.CTD.cost / (prevPct / 100);
      prevExposure = prev.F.cost - prevProjected;
    }
  }
  const exposureChange = prevExposure != null ? exposure - prevExposure : null;

  const absExp = Math.abs(exposure);
  const level: 'low' | 'medium' | 'high' =
    exposure > 0
      ? 'low'
      : absExp > cur.F.cost * 0.1
        ? 'high'
        : absExp > cur.F.cost * 0.03
          ? 'medium'
          : 'low';

  const fmt = (n: number) =>
    '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const reasons: string[] = [];
  if (exposure < -1000) {
    reasons.push(
      `At current rate, projected ${fmt(projectedCost)} exceeds forecast by ${fmt(-exposure)}`,
    );
  } else if (exposure > 1000) {
    reasons.push(
      `At current rate, projected ${fmt(projectedCost)} — ${fmt(exposure)} under forecast`,
    );
  }

  return { score: Math.round(exposure), level, reasons, exposure, prevExposure, exposureChange };
}

// ---------------------------------------------------------------------------
// Phase history (for trend charts)
// ---------------------------------------------------------------------------

export function phaseHistory(
  project: ProjectionProject,
  key: string,
): PhaseHistoryPoint[] {
  const points: PhaseHistoryPoint[] = project.versions
    .map((v) => {
      const it = findItem(v.items, key);
      if (!it) return null;
      return {
        versionLabel: v.label,
        date: v.createdAt,
        forecast: it.F.cost,
        actualToDate: it.CTD.cost,
        estimate: it.Est.cost,
        fUC: it.F.uc,
        ctdUC: it.CTD.uc,
        estUC: it.Est.uc,
        fMPU: it.F.mpu,
        ctdMPU: it.CTD.mpu,
        estMPU: it.Est.mpu,
        fUPM: it.F.hours > 0 ? it.F.qty / it.F.hours : null,
        ctdUPM: it.CTD.hours > 0 ? it.CTD.qty / it.CTD.hours : null,
        estUPM: it.Est.hours > 0 ? it.Est.qty / it.Est.hours : null,
      };
    })
    .filter((p): p is PhaseHistoryPoint => p !== null);

  if (project.draft) {
    const it = findItem(project.draft.items, key);
    if (it) {
      points.push({
        versionLabel: `${project.draft.label} (draft)`,
        date: project.draft.createdAt,
        forecast: it.F.cost,
        actualToDate: it.CTD.cost,
        estimate: it.Est.cost,
        fUC: it.F.uc,
        ctdUC: it.CTD.uc,
        estUC: it.Est.uc,
        fMPU: it.F.mpu,
        ctdMPU: it.CTD.mpu,
        estMPU: it.Est.mpu,
        fUPM: it.F.hours > 0 ? it.F.qty / it.F.hours : null,
        ctdUPM: it.CTD.hours > 0 ? it.CTD.qty / it.CTD.hours : null,
        estUPM: it.Est.hours > 0 ? it.Est.qty / it.Est.hours : null,
      });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// Comments (persist across versions — stored on project, not version)
// ---------------------------------------------------------------------------

export function addComment(
  project: ProjectionProject,
  key: string,
  opts: { author: string; text: string },
): ProjectionProject {
  return {
    ...project,
    comments: {
      ...project.comments,
      [key]: [
        ...(project.comments[key] ?? []),
        {
          id: uid(),
          author: opts.author || 'PM',
          text: opts.text,
          createdAt: new Date().toISOString(),
          versionLabel: project.draft?.label,
        },
      ],
    },
  };
}

export function deleteComment(
  project: ProjectionProject,
  key: string,
  commentId: string,
): ProjectionProject {
  return {
    ...project,
    comments: {
      ...project.comments,
      [key]: (project.comments[key] ?? []).filter((c) => c.id !== commentId),
    },
  };
}

// ---------------------------------------------------------------------------
// Summary rows
// ---------------------------------------------------------------------------

export function computeSummaryRows(items: ProjectionItem[]): SummaryResult {
  const byType = new Map<string, ProjectionItem[]>();

  for (const item of items) {
    const ct = item.keyParts[1] ?? item.lineKey;
    if (!byType.has(ct)) byType.set(ct, []);
    byType.get(ct)!.push(item);
  }

  const sumSlice = (rows: ProjectionItem[], sliceName: keyof Pick<ProjectionItem, 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'>): TimeSlice => {
    const totals: TimeSlice = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
    for (const r of rows) {
      const s = r[sliceName];
      totals.qty += s.qty;
      totals.hours += s.hours;
      totals.cost += s.cost;
    }
    if (totals.qty > 0) {
      totals.uc = totals.cost / totals.qty;
      totals.mpu = totals.hours / totals.qty;
      totals.upm = totals.qty / totals.hours || 0;
    }
    return totals;
  };

  const summaryRows: SummaryRow[] = [];
  for (const [costType, group] of byType) {
    summaryRows.push({
      costType,
      count: group.length,
      CTP: sumSlice(group, 'CTP'),
      CTD: sumSlice(group, 'CTD'),
      CTC: sumSlice(group, 'CTC'),
      F: sumSlice(group, 'F'),
      Est: sumSlice(group, 'Est'),
    });
  }

  const grand: SummaryRow = {
    costType: 'TOTAL',
    count: items.length,
    CTP: sumSlice(items, 'CTP'),
    CTD: sumSlice(items, 'CTD'),
    CTC: sumSlice(items, 'CTC'),
    F: sumSlice(items, 'F'),
    Est: sumSlice(items, 'Est'),
  };

  return { summaryRows, grand };
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

const fmtUSD = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n ?? 0);

type AlertBuilder = (
  project: ProjectionProject,
  item: ProjectionItem,
  cycleId: string,
  thresholdPct: number,
) => ProjectionAlert | null;

const alertIdStr = (cycleId: string, key: string, type: string): string =>
  `${cycleId}::${key}::${type}`;

const SEV_RANK: Record<AlertSeverity, number> = { high: 0, medium: 1, info: 2 };

const alertBuilders: AlertBuilder[] = [
  // New service
  (_project, item, cycleId) => {
    if (!item.isNew) return null;
    const detail =
      item.F.cost > 0
        ? `${item.keyParts[1] ?? ''} added — forecast ${fmtUSD(item.F.cost)}${item.F.uc > 0 ? `, $${item.F.uc.toFixed(2)}/unit` : ''}`
        : `${item.keyParts[1] ?? ''} added in this cycle (no forecast set)`;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'new'),
      key: item.lineKey,
      type: 'new',
      severity: item.F.cost > 0 ? 'info' : 'medium',
      title: 'New service',
      detail,
    };
  },

  // Stale
  (_project, item, cycleId) => {
    if (!item.stale) return null;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'stale'),
      key: item.lineKey,
      type: 'stale',
      severity: 'medium',
      title: 'Missing from latest dump',
      detail: 'Code did not appear in this import',
    };
  },

  // Forecast vs prev month
  (project, item, cycleId, thresholdPct) => {
    const v = lensVsPrev(project, item.lineKey);
    if (!v || Math.abs(v.pct) < thresholdPct) return null;
    const up = v.delta > 0;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'var-prev'),
      key: item.lineKey,
      type: 'var-prev',
      severity: 'medium',
      title: `Forecast ${up ? 'up' : 'down'} ${Math.abs(v.pct).toFixed(1)}% vs last month`,
      detail: `Δ ${up ? '+' : ''}${fmtUSD(v.delta)} on ${item.keyParts[1] ?? ''}`,
      lens: 'vsPrev',
    };
  },

  // Forecast vs original bid
  (project, item, cycleId, thresholdPct) => {
    const v = lensVsOrig(project, item.lineKey);
    if (!v || Math.abs(v.pct) < thresholdPct) return null;
    const up = v.delta > 0;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'var-orig'),
      key: item.lineKey,
      type: 'var-orig',
      severity: 'medium',
      title: `Forecast ${up ? 'over' : 'under'} bid by ${Math.abs(v.pct).toFixed(1)}%`,
      detail: `Δ ${up ? '+' : ''}${fmtUSD(v.delta)} vs original estimate`,
      lens: 'vsOrig',
    };
  },

  // Overspend
  (_project, item, cycleId) => {
    if (!(item.CTD.cost > item.F.cost && item.F.cost > 0)) return null;
    const over = item.CTD.cost - item.F.cost;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'overspend'),
      key: item.lineKey,
      type: 'overspend',
      severity: 'high',
      title: 'Overspent vs forecast',
      detail: `CTD exceeds forecast by ${fmtUSD(over)}`,
    };
  },

  // Orphan
  (_project, item, cycleId) => {
    if (!(item.CTD.cost > 0 && item.F.cost === 0)) return null;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'orphan'),
      key: item.lineKey,
      type: 'orphan',
      severity: 'high',
      title: 'Spend with no forecast',
      detail: `${fmtUSD(item.CTD.cost)} CTD, forecast is $0 — likely needs a re-cast`,
    };
  },

  // Unit cost deviation
  (_project, item, cycleId) => {
    if (item.CTD.qty <= 0 || item.F.qty <= 0) return null;
    const ctdUC = item.CTD.cost / item.CTD.qty;
    const fUC = item.F.cost / item.F.qty;
    if (fUC === 0) return null;
    const pct = ((ctdUC - fUC) / fUC) * 100;
    if (Math.abs(pct) < 20) return null;
    const dir = pct > 0 ? 'over' : 'under';
    return {
      id: alertIdStr(cycleId, item.lineKey, 'uc-deviation'),
      key: item.lineKey,
      type: 'uc-deviation',
      severity: Math.abs(pct) >= 50 ? 'high' : 'medium',
      title: `Unit cost ${dir} forecast by ${Math.abs(pct).toFixed(0)}%`,
      detail: `CTD $${ctdUC.toFixed(2)}/unit vs forecast $${fUC.toFixed(2)}/unit`,
    };
  },

  // MH/Unit productivity deviation
  (_project, item, cycleId) => {
    if (item.CTD.qty <= 0 || item.CTD.hours <= 0) return null;
    const ctdMPU = item.CTD.hours / item.CTD.qty;
    const refSlice =
      item.Est.qty > 0 && item.Est.hours > 0 ? item.Est : item.F;
    if (refSlice.qty <= 0 || refSlice.hours <= 0) return null;
    const refMPU = refSlice.hours / refSlice.qty;
    if (refMPU === 0) return null;
    const pct = ((ctdMPU - refMPU) / refMPU) * 100;
    if (Math.abs(pct) < 25) return null;
    const refLabel = refSlice === item.Est ? 'bid' : 'forecast';
    const worse = pct > 0;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'mpu-deviation'),
      key: item.lineKey,
      type: 'mpu-deviation',
      severity: Math.abs(pct) >= 50 ? 'high' : 'medium',
      title: `Production ${worse ? 'slower' : 'faster'} than ${refLabel} by ${Math.abs(pct).toFixed(0)}%`,
      detail: `${refLabel} ${refMPU.toFixed(2)} MH/unit, running ${ctdMPU.toFixed(2)} MH/unit`,
    };
  },

  // CTC rate realism
  (_project, item, cycleId) => {
    const ctcQty = item.F.qty - item.CTD.qty;
    const ctcCost = item.F.cost - item.CTD.cost;
    if (ctcQty <= 0 || ctcCost <= 0 || item.CTD.qty <= 0) return null;
    const ctcUC = ctcCost / ctcQty;
    const ctdUC = item.CTD.cost / item.CTD.qty;
    if (ctdUC === 0) return null;
    const pct = ((ctcUC - ctdUC) / ctdUC) * 100;
    if (pct > -30) return null;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'ctc-unrealistic'),
      key: item.lineKey,
      type: 'ctc-unrealistic',
      severity: pct < -60 ? 'high' : 'medium',
      title: `Remaining work assumes ${Math.abs(pct).toFixed(0)}% cheaper unit cost`,
      detail: `CTC $${ctcUC.toFixed(2)}/unit vs CTD run rate $${ctdUC.toFixed(2)}/unit`,
    };
  },
];

export function computeAlerts(
  project: ProjectionProject,
  thresholdPct: number = VARIANCE_THRESHOLD_PCT,
): AlertsResult {
  const cycle = project.draft ?? project.versions[project.versions.length - 1] ?? null;
  if (!cycle) return { open: [], resolved: [], all: [] };

  const live: ProjectionAlert[] = [];
  for (const item of cycle.items) {
    for (const build of alertBuilders) {
      const a = build(project, item, cycle.id, thresholdPct);
      if (a) live.push(a);
    }
  }

  const status = project.alertStatus ?? {};
  const open: ProjectionAlert[] = [];
  const resolved: ProjectionAlert[] = [];

  for (const alert of live) {
    const s = status[alert.id];
    if (s?.status === 'resolved') {
      resolved.push({ ...alert, resolution: s });
    } else {
      open.push(alert);
    }
  }

  for (const [id, s] of Object.entries(status)) {
    if (s.status !== 'resolved') continue;
    if (!id.startsWith(`${cycle.id}::`)) continue;
    if (resolved.some((a) => a.id === id)) continue;
    if (s.snapshot) resolved.push({ ...s.snapshot, id, resolution: s } as ProjectionAlert);
  }

  open.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  resolved.sort(
    (a, b) =>
      new Date(b.resolution!.resolvedAt).getTime() -
      new Date(a.resolution!.resolvedAt).getTime(),
  );

  return { open, resolved, all: [...open, ...resolved] };
}

export function resolveAlert(
  project: ProjectionProject,
  alert: ProjectionAlert,
  opts: { author: string; text: string },
): ProjectionProject {
  const trimmed = (opts.text ?? '').trim();
  if (!trimmed) return project;

  const commentId = uid();
  const cycleLabel = project.draft?.label ?? project.versions.at(-1)?.label;
  const newComment: ProjectionComment = {
    id: commentId,
    author: opts.author || 'PM',
    text: trimmed,
    createdAt: new Date().toISOString(),
    versionLabel: cycleLabel,
    resolvesAlertId: alert.id,
  };

  return {
    ...project,
    comments: {
      ...project.comments,
      [alert.key]: [...(project.comments[alert.key] ?? []), newComment],
    },
    alertStatus: {
      ...(project.alertStatus ?? {}),
      [alert.id]: {
        status: 'resolved',
        resolvedBy: newComment.author,
        resolvedAt: newComment.createdAt,
        commentId,
        snapshot: {
          key: alert.key,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          detail: alert.detail,
          lens: alert.lens,
        },
      },
    },
  };
}

export function reopenAlert(
  project: ProjectionProject,
  alertId: string,
): ProjectionProject {
  const status = project.alertStatus ?? {};
  if (!status[alertId]) return project;
  const { [alertId]: _removed, ...rest } = status;
  return { ...project, alertStatus: rest };
}

// ---------------------------------------------------------------------------
// Alert display constants
// ---------------------------------------------------------------------------

export const SEVERITY_TONE: Record<
  AlertSeverity,
  { dot: string; text: string; border: string; soft: string }
> = {
  high: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    border: 'border-destructive/40',
    soft: 'bg-destructive/10',
  },
  medium: {
    dot: 'bg-amber',
    text: 'text-amber',
    border: 'border-amber/40',
    soft: 'bg-amber/10',
  },
  info: {
    dot: 'bg-primary',
    text: 'text-primary',
    border: 'border-primary/40',
    soft: 'bg-primary/10',
  },
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  new: 'New Service',
  stale: 'Stale',
  'var-prev': 'Variance · MoM',
  'var-orig': 'Variance · Bid',
  overspend: 'Overspend',
  orphan: 'Orphan',
  'uc-deviation': 'Unit Cost',
  'mpu-deviation': 'Production Rate',
  'ctc-unrealistic': 'CTC Rate',
};

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

export const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val ?? 0);

export const formatCurrencyExact = (val: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val ?? 0);

export const formatPercent = (val: number, digits = 1): string => {
  if (!Number.isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(digits)}%`;
};

export const formatNumber = (val: number, digits = 0): string => {
  if (!Number.isFinite(val)) return '—';
  return val.toLocaleString('en-US', { maximumFractionDigits: digits });
};

// ---------------------------------------------------------------------------
// Version re-derivation (for loading saved data)
// ---------------------------------------------------------------------------

export function rederiveVersions(
  versions: ProjectionVersion[],
): ProjectionVersion[] {
  const result: ProjectionVersion[] = [];
  for (let vi = 0; vi < versions.length; vi++) {
    const v = versions[vi]!;
    const prevVersion = result[vi - 1] ?? null;
    const prevMap = new Map<string, TimeSlice>();
    if (prevVersion) {
      for (const it of prevVersion.items) {
        prevMap.set(it.lineKey, it.F);
      }
    }
    result.push({
      ...v,
      items: v.items.map((it) => {
        const prevF = prevMap.get(it.lineKey) ?? null;
        return deriveItem(it, prevF);
      }),
    });
  }
  return result;
}

export function loadProject(
  seed: Partial<ProjectionProject>,
): ProjectionProject | null {
  if (!seed || typeof seed !== 'object') return null;
  if (!Array.isArray(seed.versions)) return null;

  const versions = rederiveVersions(seed.versions);

  return {
    id: seed.id ?? uid(),
    name: seed.name ?? 'Untitled project',
    jobNumber: seed.jobNumber ?? '',
    customer: seed.customer ?? '',
    pm: seed.pm ?? '',
    createdAt: seed.createdAt ?? new Date().toISOString(),
    versions,
    draft: seed.draft ?? null,
    comments: seed.comments ?? {},
    alertStatus: seed.alertStatus ?? {},
    financials: seed.financials ?? null,
  };
}
