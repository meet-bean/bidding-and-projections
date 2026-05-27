# Platform Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Superior Construction's projection module into Stratagraph's monorepo as a reusable `packages/projections` package, add multi-tenant support, and wire up projection routes — producing a single unified platform.

**Architecture:** Stratagraph's Turborepo monorepo is the base. A new `packages/projections` package holds the generalized projection engine (types, variance, risk, parsers). Projection UI components are added to `apps/web`. A lightweight tenant system controls which modules each client sees. Comments persist at the project level and roll over across versions.

**Tech Stack:** TypeScript 5, React 19, Tailwind v4, TanStack Router, Zustand 5, visx charts, @tanstack/react-table, xlsx (SheetJS), ExcelJS (export)

**Prerequisite:** Before starting, unzip the Stratagraph repo and work inside it:
```bash
cd "/Users/italo/Desktop/Superior + Stratagraph"
unzip stratagraph-main.zip -d work
cd work/stratagraph-main
pnpm install
```

Keep `Superior  Construction.zip` available — you'll reference files inside it during porting tasks.

---

### Task 1: Create `packages/projections` package scaffold

**Files:**
- Create: `packages/projections/package.json`
- Create: `packages/projections/tsconfig.json`
- Create: `packages/projections/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/projections",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./engine": "./src/engine.ts",
    "./adapters/*": "./src/adapters/*",
    "./export/*": "./src/export/*"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@repo/config": "workspace:^",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@repo/config/typescript/base",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create empty barrel export**

```typescript
// packages/projections/src/index.ts
export * from './types';
export * from './engine';
export * from './adapters/types';
```

- [ ] **Step 4: Install dependencies and verify**

```bash
pnpm install
pnpm -F @repo/projections typecheck
```

Expected: typecheck may fail (empty exports) — that's fine, we'll fill them in next tasks.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/
git commit -m "feat: scaffold @repo/projections package"
```

---

### Task 2: Define projection types

**Files:**
- Create: `packages/projections/src/types.ts`

Port Superior's data model from `projectStore.js` into typed interfaces. The key design change: replace `phase`/`costType` with a generic `lineKey`/`keyParts` so any adapter can define its own composite key.

- [ ] **Step 1: Write types**

```typescript
// packages/projections/src/types.ts

export interface TimeSlice {
  qty: number;
  hours: number;
  /** Units per manhour (qty / hours). Derived. */
  upm: number;
  /** Manhours per unit (hours / qty). Derived. */
  mpu: number;
  /** Unit cost (cost / qty). Derived. */
  uc: number;
  cost: number;
}

export interface ProjectionItem {
  /** Composite key — e.g. "B-100-|2Labor" for Vista. */
  lineKey: string;
  /** Decomposed key parts — e.g. ["B-100-", "2Labor"]. */
  keyParts: string[];
  /** Human-readable label for the first key part (phase description, well name, etc). */
  label: string;
  /** Unit of measure string from source data. */
  unitOfMeasure: string;

  CTP: TimeSlice;
  CTD: TimeSlice;
  CTC: TimeSlice;
  F: TimeSlice;
  Est: TimeSlice;

  /** Estimate variance (Est.cost - F.cost). From source or derived. */
  estVar: number;
  /** Dollar % complete (CTD.cost / F.cost * 100). Derived. */
  comp: number;
  /** Previous version's forecast cost — for vs-prev variance. */
  prevForecast: number;
  /** Sanity-check hours: (CTD.hours / CTD.cost) * F.cost. Derived. */
  calcHrs: number;
  /** Worksheet risk formula: F.cost - (CTD.cost * F.qty / CTD.qty). Derived. */
  wsRisk: number;
  /** True when this line item first appeared in the current cycle. */
  isNew: boolean;
  /** True when this line item was in a prior version but missing from the current dump. */
  stale: boolean;
}

export interface ProjectionVersion {
  id: string;
  label: string;
  createdAt: string;
  items: ProjectionItem[];
  saved: boolean;
}

export interface ProjectionComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  /** Label of the version this comment was written on. */
  versionLabel?: string;
  /** If this comment resolved an alert, the alert's id. */
  resolvesAlertId?: string;
}

export interface AlertResolution {
  status: 'resolved';
  resolvedBy: string;
  resolvedAt: string;
  commentId: string;
  snapshot: {
    key: string;
    type: string;
    severity: AlertSeverity;
    title: string;
    detail: string;
    lens?: VarianceLens;
  };
}

export interface FinancialSummaryMonth {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  gpPct: number;
}

export interface FinancialSummary {
  months: FinancialSummaryMonth[];
  originalBid: {
    revenue: number;
    cost: number;
    profit: number;
    gpPct: number;
  } | null;
}

export interface ProjectionProject {
  id: string;
  name: string;
  jobNumber: string;
  customer: string;
  pm: string;
  createdAt: string;
  versions: ProjectionVersion[];
  draft: ProjectionVersion | null;
  /** Comments keyed by lineKey — persist across all versions. */
  comments: Record<string, ProjectionComment[]>;
  /** Alert resolution status keyed by alert id. */
  alertStatus: Record<string, AlertResolution>;
  financials: FinancialSummary | null;
}

export type VarianceLens = 'vsPrev' | 'vsOrig' | 'leftToSpend';

export interface VarianceResult {
  delta: number;
  pct: number;
  base: number;
  current: number;
  /** For leftToSpend lens: prior version's left-to-spend. */
  prevLts?: number | null;
  /** For leftToSpend lens: change in LTS vs prior version. */
  ltsChange?: number | null;
}

export type AlertSeverity = 'high' | 'medium' | 'info';

export type AlertType =
  | 'new'
  | 'stale'
  | 'var-prev'
  | 'var-orig'
  | 'overspend'
  | 'orphan'
  | 'uc-deviation'
  | 'mpu-deviation'
  | 'ctc-unrealistic';

export interface ProjectionAlert {
  id: string;
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  lens?: VarianceLens;
  resolution?: AlertResolution;
}

export interface AlertsResult {
  open: ProjectionAlert[];
  resolved: ProjectionAlert[];
  all: ProjectionAlert[];
}

export interface PhaseHistoryPoint {
  versionLabel: string;
  date: string;
  forecast: number;
  actualToDate: number;
  estimate: number;
  fUC: number;
  ctdUC: number;
  estUC: number;
  fMPU: number;
  ctdMPU: number;
  estMPU: number;
  fUPM: number | null;
  ctdUPM: number | null;
  estUPM: number | null;
}

export interface SummaryRow {
  costType: string;
  count: number;
  CTP: TimeSlice;
  CTD: TimeSlice;
  CTC: TimeSlice;
  F: TimeSlice;
  Est: TimeSlice;
}

export interface SummaryResult {
  summaryRows: SummaryRow[];
  grand: SummaryRow;
}

/** Known cost types from Vista exports. */
export const COST_TYPES = [
  '2Labor',
  '3Material',
  '4Rental',
  '5SubCont',
  '6OtherJC',
  '8Parts',
  '9Owned',
  '10Health',
  '11Fuel',
] as const;

export type CostType = (typeof COST_TYPES)[number];
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm -F @repo/projections typecheck
```

Expected: PASS (types only, no implementation yet)

- [ ] **Step 3: Commit**

```bash
git add packages/projections/src/types.ts
git commit -m "feat(projections): define core projection types"
```

---

### Task 3: Port the projection engine (pure functions)

**Files:**
- Create: `packages/projections/src/engine.ts`

Port Superior's `projectStore.js` pure functions (deriveSlice, deriveItem, variance lenses, risk score, comments, summaries, alerts) into a single stateless TypeScript module. This is the largest task — it's the heart of the projection logic.

**Reference files (inside `Superior  Construction.zip`):**
- `projections-app/src/store/projectStore.js` — lines 1-865 (deriveSlice, deriveItem, variance, comments, summaries, workspace)
- `projections-app/src/utils/alerts.js` — full file (alert builders, computeAlerts)
- `projections-app/src/utils/variance.js` — full file (computeVariance, varianceTone)

- [ ] **Step 1: Write the engine**

```typescript
// packages/projections/src/engine.ts

import type {
  TimeSlice,
  ProjectionItem,
  ProjectionVersion,
  ProjectionProject,
  ProjectionComment,
  VarianceLens,
  VarianceResult,
  AlertSeverity,
  AlertType,
  ProjectionAlert,
  AlertsResult,
  AlertResolution,
  PhaseHistoryPoint,
  SummaryRow,
  SummaryResult,
  FinancialSummary,
} from './types';

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

function deepMerge(item: ProjectionItem, patch: Partial<ProjectionItem>): ProjectionItem {
  const next = { ...item } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      next[k] &&
      typeof next[k] === 'object'
    ) {
      next[k] = { ...(next[k] as Record<string, unknown>), ...(v as Record<string, unknown>) };
    } else {
      next[k] = v;
    }
  }
  return next as ProjectionItem;
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
) => ProjectionAlert | null;

const alertIdStr = (cycleId: string, key: string, type: string): string =>
  `${cycleId}::${key}::${type}`;

const SEV_RANK: Record<AlertSeverity, number> = { high: 0, medium: 1, info: 2 };

const alertBuilders: AlertBuilder[] = [
  // New line item
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
      title: 'New line item',
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
  (project, item, cycleId) => {
    const v = lensVsPrev(project, item.lineKey);
    if (!v || Math.abs(v.pct) < VARIANCE_THRESHOLD_PCT) return null;
    const up = v.delta > 0;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'var-prev'),
      key: item.lineKey,
      type: 'var-prev',
      severity: up && Math.abs(v.pct) >= 15 ? 'high' : 'medium',
      title: `Forecast ${up ? 'up' : 'down'} ${Math.abs(v.pct).toFixed(1)}% vs last month`,
      detail: `Δ ${up ? '+' : ''}${fmtUSD(v.delta)} on ${item.keyParts[1] ?? ''}`,
      lens: 'vsPrev',
    };
  },

  // Forecast vs original bid
  (project, item, cycleId) => {
    const v = lensVsOrig(project, item.lineKey);
    if (!v || Math.abs(v.pct) < VARIANCE_THRESHOLD_PCT) return null;
    const up = v.delta > 0;
    return {
      id: alertIdStr(cycleId, item.lineKey, 'var-orig'),
      key: item.lineKey,
      type: 'var-orig',
      severity: up && Math.abs(v.pct) >= 15 ? 'high' : 'medium',
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

export function computeAlerts(project: ProjectionProject): AlertsResult {
  const cycle = project.draft ?? project.versions[project.versions.length - 1] ?? null;
  if (!cycle) return { open: [], resolved: [], all: [] };

  const live: ProjectionAlert[] = [];
  for (const item of cycle.items) {
    for (const build of alertBuilders) {
      const a = build(project, item, cycle.id);
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
  new: 'New Item',
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
    const v = versions[vi];
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
```

- [ ] **Step 2: Update barrel export**

```typescript
// packages/projections/src/index.ts
export * from './types';
export * from './engine';
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm -F @repo/projections typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/projections/src/
git commit -m "feat(projections): port projection engine from Superior Construction"
```

---

### Task 4: Port the Vista adapter (parser + export)

**Files:**
- Create: `packages/projections/src/adapters/types.ts`
- Create: `packages/projections/src/adapters/vista.ts`
- Create: `packages/projections/src/adapters/batch-upload.ts`
- Create: `packages/projections/src/export/vista-xlsx.ts`

**Reference files (inside `Superior  Construction.zip`):**
- `projections-app/src/utils/parseVista.js`
- `projections-app/src/utils/parseBatchUpload.js`
- `projections-app/src/utils/exportVista.js`
- `projections-app/src/utils/csv.js`

- [ ] **Step 1: Write the adapter interface**

```typescript
// packages/projections/src/adapters/types.ts

import type { ProjectionItem, ProjectionVersion, FinancialSummary } from '../types';

export interface ProjectionAdapter {
  id: string;
  label: string;
  fileTypes: string[];
  parse(file: File): Promise<ProjectionItem[]>;
  parseBatch?(files: File[]): Promise<BatchUploadResult>;
  exportVersion?(items: ProjectionItem[], projectName: string, cycleLabel: string): Promise<Blob>;
  columnLabels: {
    keyPartLabels: string[];
  };
}

export interface BatchCycle {
  file: string;
  tab: string | null;
  type: 'pm-worksheet' | 'vista-dump';
  detectedDate: { month: number; year: number; iso: string } | null;
  label: string;
  rowCount: number;
  items: ProjectionItem[];
  notes: Record<string, string>;
}

export interface BatchUploadResult {
  cycles: BatchCycle[];
  financials: FinancialSummary | null;
  errors: Array<{ file: string; message: string }>;
}
```

- [ ] **Step 2: Port the Vista parser**

Port `parseVista.js` to TypeScript as `packages/projections/src/adapters/vista.ts`. This is a direct conversion — keep all the parsing logic identical, just add types and use the `ProjectionItem` shape instead of the old `{ phase, costType, ... }` shape.

The key mapping change: where the old code used `phase` and `costType` as separate fields, the new code sets `lineKey = makeLineKey(phase, costType)` and `keyParts = [phase, costType]`.

```typescript
// packages/projections/src/adapters/vista.ts

import { makeLineKey, blankSlice } from '../engine';
import type { ProjectionItem } from '../types';
import type { ProjectionAdapter } from './types';

// --- Parsing helpers (ported from parseVista.js) ---

const SLICE_FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function splitCostTypeUM(raw: unknown): { costType: string; um: string } {
  const s = String(raw ?? '').trim();
  if (!s) return { costType: '', um: '' };
  const tokens = s.split(/\s+/);
  const first = tokens[0];
  const digitMatch = first.match(/^(\d+)([A-Za-z]+)?$/);
  if (!digitMatch) return { costType: '', um: '' };
  const digits = digitMatch[1];
  let name = digitMatch[2] || '';
  let umStart = 1;
  if (!name && tokens.length > 1 && /^[A-Za-z]/.test(tokens[1])) {
    name = tokens[1];
    umStart = 2;
  }
  if (!name) return { costType: '', um: '' };
  return { costType: digits + name, um: tokens.slice(umStart).join(' ') };
}

function sliceFromRow(row: unknown[], startIdx: number) {
  const obj: Record<string, number> = {};
  SLICE_FIELDS.forEach((field, i) => {
    obj[field] = num(row[startIdx + i]);
  });
  return obj as { qty: number; hours: number; upm: number; mpu: number; uc: number; cost: number };
}

function firstOf(idxOf: (n: string) => number, ...names: string[]): number {
  for (const n of names) {
    const i = idxOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

function fSliceIsConsecutive(headers: string[], fQtyIdx: number): boolean {
  if (fQtyIdx < 0) return false;
  const next = (headers[fQtyIdx + 2] ?? '').toLowerCase();
  return next.includes('u/m') || next.includes('upm');
}

interface ColumnMap {
  phase: number;
  desc: number;
  ctum: number;
  CTP_start: number;
  CTD_start: number;
  CTC_start: number;
  F_consecutive: boolean;
  F_start: number;
  F_qty: number;
  F_hours: number;
  F_upm: number;
  F_mpu: number;
  F_uc: number;
  F_cost: number;
  F_cost_alt: number;
  Est_start: number;
  estVar: number;
  comp: number;
  calcHrs: number;
  prevForecast: number;
  risk: number;
  notes: number;
}

function resolveColumns(headers: string[]): ColumnMap {
  const idxOf = (name: string) =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const fQtyIdx = idxOf('F Qty');
  const consecutive = fSliceIsConsecutive(headers, fQtyIdx);

  return {
    phase: idxOf('Phase'),
    desc: firstOf(idxOf, 'PhaseDescription', 'Phase Description'),
    ctum: firstOf(idxOf, 'CostType UM', 'Cost Type/UM'),
    CTP_start: idxOf('CTP Qty'),
    CTD_start: idxOf('CTD Qty'),
    CTC_start: idxOf('CTC Qty'),
    F_consecutive: consecutive,
    F_start: consecutive ? fQtyIdx : -1,
    F_qty: fQtyIdx,
    F_hours: firstOf(idxOf, 'F Hours', 'F Hrs'),
    F_upm: idxOf('F U/M'),
    F_mpu: idxOf('F M/U'),
    F_uc: idxOf('F UC'),
    F_cost: firstOf(idxOf, 'F Cost', 'Current Projection / Forecast', 'Current Projection'),
    F_cost_alt: firstOf(idxOf, 'Current Projection / Forecast', 'Current Projection'),
    Est_start: firstOf(idxOf, 'Est Qty', 'OE Qty'),
    estVar: idxOf('EstVar'),
    comp: firstOf(idxOf, 'Comp', '$ % Complete'),
    calcHrs: idxOf('Calc Hrs'),
    prevForecast: firstOf(idxOf, 'Last months forecast', "Last Month's Forecast"),
    risk: idxOf('Risk'),
    notes: idxOf('Notes'),
  };
}

function fSliceFromRow(row: unknown[], cols: ColumnMap) {
  if (cols.F_consecutive && cols.F_start >= 0) {
    return sliceFromRow(row, cols.F_start);
  }
  let cost = cols.F_cost >= 0 ? num(row[cols.F_cost]) : 0;
  if (cost === 0 && cols.F_cost_alt >= 0) {
    cost = num(row[cols.F_cost_alt]);
  }
  return {
    qty: cols.F_qty >= 0 ? num(row[cols.F_qty]) : 0,
    hours: cols.F_hours >= 0 ? num(row[cols.F_hours]) : 0,
    upm: cols.F_upm >= 0 ? num(row[cols.F_upm]) : 0,
    mpu: cols.F_mpu >= 0 ? num(row[cols.F_mpu]) : 0,
    uc: cols.F_uc >= 0 ? num(row[cols.F_uc]) : 0,
    cost,
  };
}

export function parseSheet(
  rows: unknown[][],
  fallbackHeaderRow = 1,
): { items: ProjectionItem[]; cols: ColumnMap; notes: Record<string, string> } {
  let headerRowIdx = rows.findIndex(
    (r) => r && r.some((c) => String(c ?? '').trim().toLowerCase() === 'phase'),
  );
  if (headerRowIdx === -1) headerRowIdx = fallbackHeaderRow;

  const headers = (rows[headerRowIdx] || []).map((c) => String(c ?? '').trim());
  const cols = resolveColumns(headers);

  if (cols.phase < 0 || cols.ctum < 0) {
    return { items: [], cols, notes: {} };
  }

  const items: ProjectionItem[] = [];
  const notes: Record<string, string> = {};

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const phase = str(r[cols.phase]);
    if (!phase) continue;
    const { costType, um } = splitCostTypeUM(r[cols.ctum]);
    if (!costType) continue;

    const lineKey = makeLineKey(phase, costType);

    const item: ProjectionItem = {
      lineKey,
      keyParts: [phase, costType],
      label: str(r[cols.desc >= 0 ? cols.desc : cols.phase + 1]),
      unitOfMeasure: um,
      CTP: cols.CTP_start >= 0 ? sliceFromRow(r, cols.CTP_start) : blankSlice(),
      CTD: cols.CTD_start >= 0 ? sliceFromRow(r, cols.CTD_start) : blankSlice(),
      CTC: cols.CTC_start >= 0 ? sliceFromRow(r, cols.CTC_start) : blankSlice(),
      F: fSliceFromRow(r, cols),
      Est: cols.Est_start >= 0 ? sliceFromRow(r, cols.Est_start) : blankSlice(),
      estVar: cols.estVar >= 0 ? num(r[cols.estVar]) : 0,
      comp: cols.comp >= 0 ? num(r[cols.comp]) : 0,
      prevForecast: 0,
      calcHrs: 0,
      wsRisk: 0,
      isNew: false,
      stale: false,
    };

    items.push(item);

    if (cols.notes >= 0) {
      const note = str(r[cols.notes]);
      if (note) {
        notes[lineKey] = note;
      }
    }
  }

  return { items, cols, notes };
}

async function parseVistaWorkbook(arrayBuffer: ArrayBuffer): Promise<ProjectionItem[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as unknown[][];
  const { items } = parseSheet(rows, 1);

  if (items.length === 0) {
    throw new Error(
      'Could not find required columns (Phase / CostType UM / Cost Type/UM). ' +
        'Is this a Vista cost-report or PM worksheet export?',
    );
  }

  return items;
}

// --- The adapter ---

export const vistaAdapter: ProjectionAdapter = {
  id: 'vista',
  label: 'Vista Cost Report',
  fileTypes: ['.xls', '.xlsx', '.csv'],

  async parse(file: File): Promise<ProjectionItem[]> {
    const buf = await file.arrayBuffer();
    return parseVistaWorkbook(buf);
  },

  columnLabels: {
    keyPartLabels: ['Phase', 'Cost Type'],
  },
};
```

- [ ] **Step 3: Port the batch upload parser**

Port `parseBatchUpload.js` to TypeScript as `packages/projections/src/adapters/batch-upload.ts`. Same direct conversion approach.

```typescript
// packages/projections/src/adapters/batch-upload.ts

import { num, str, parseSheet } from './vista';
import type { ProjectionItem, FinancialSummary } from '../types';
import type { BatchCycle, BatchUploadResult } from './types';

const COST_TAB_RE = /^Cost\s+(\d{2})-(\d{2})\s*$/i;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function classifyWorkbook(wb: { SheetNames: string[] }): 'pm-worksheet' | 'vista-dump' {
  const costTabs = wb.SheetNames.filter((n) => COST_TAB_RE.test(n));
  return costTabs.length > 0 ? 'pm-worksheet' : 'vista-dump';
}

function dateFromTabName(tabName: string): { month: number; year: number; iso: string } | null {
  const m = tabName.match(COST_TAB_RE);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  return { month, year, iso: `${year}-${String(month).padStart(2, '0')}-01` };
}

function dateFromFileName(name: string): { month: number; year: number; iso: string } | null {
  const m = name.match(/(\d{4})[-_ ](\d{2})/) || name.match(/(\d{2})[-_ ](\d{2,4})/);
  if (!m) return null;
  const [, a, b] = m;
  const year = a.length === 4 ? parseInt(a) : 2000 + parseInt(b.length === 2 ? b : b.slice(2));
  const month = a.length === 4 ? parseInt(b) : parseInt(a);
  if (month < 1 || month > 12) return null;
  return { month, year, iso: `${year}-${String(month).padStart(2, '0')}-01` };
}

function dateLabel(dateObj: { month: number; year: number } | null): string {
  if (!dateObj) return 'Unknown Date';
  return `${MONTH_NAMES[dateObj.month - 1]} ${dateObj.year} Projection`;
}

function parseSummaryTab(ws: unknown, XLSX: typeof import('xlsx')): FinancialSummary | null {
  const rows = XLSX.utils.sheet_to_json(ws as import('xlsx').WorkSheet, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];

  const months: FinancialSummary['months'] = [];
  let originalBid: FinancialSummary['originalBid'] = null;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const label = str(r[0]).toLowerCase();

    if (label.includes('original') && label.includes('bid')) {
      originalBid = {
        revenue: num(r[1]),
        cost: num(r[2]),
        profit: num(r[3]),
        gpPct: num(r[4]),
      };
      continue;
    }

    const dateMatch = str(r[0]).match(
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i,
    );
    if (dateMatch && num(r[1]) > 0) {
      const monthIdx = MONTH_NAMES.findIndex((m) =>
        m.toLowerCase().startsWith(dateMatch[1].toLowerCase()),
      );
      const year = parseInt(dateMatch[2]);
      months.push({
        date: `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`,
        revenue: num(r[1]),
        cost: num(r[2]),
        profit: num(r[3]),
        gpPct: num(r[4]),
      });
    }
  }

  if (!originalBid && months.length === 0) return null;
  return { months, originalBid };
}

export async function parseBatchUpload(files: File[]): Promise<BatchUploadResult> {
  const XLSX = await import('xlsx');
  const cycles: BatchCycle[] = [];
  let financials: FinancialSummary | null = null;
  const errors: Array<{ file: string; message: string }> = [];

  for (const file of files) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const type = classifyWorkbook(wb);

      if (type === 'pm-worksheet') {
        const summarySheet = wb.SheetNames.find((n) => n.toLowerCase() === 'summary');
        if (summarySheet) {
          const parsed = parseSummaryTab(wb.Sheets[summarySheet], XLSX);
          if (parsed) financials = parsed;
        }

        for (const tabName of wb.SheetNames) {
          if (!COST_TAB_RE.test(tabName)) continue;
          const detected = dateFromTabName(tabName);
          const ws = wb.Sheets[tabName];
          const rows = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
            blankrows: false,
          }) as unknown[][];
          const { items, notes } = parseSheet(rows, 3);
          if (items.length === 0) continue;

          cycles.push({
            file: file.name,
            tab: tabName,
            type: 'pm-worksheet',
            detectedDate: detected,
            label: dateLabel(detected),
            rowCount: items.length,
            items,
            notes,
          });
        }
      } else {
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          blankrows: false,
        }) as unknown[][];
        const { items } = parseSheet(rows, 1);

        if (items.length === 0) {
          errors.push({
            file: file.name,
            message: 'Could not find Phase/CostType columns or no line items found',
          });
          continue;
        }

        const detected = dateFromFileName(file.name);
        cycles.push({
          file: file.name,
          tab: null,
          type: 'vista-dump',
          detectedDate: detected,
          label: dateLabel(detected),
          rowCount: items.length,
          items,
          notes: {},
        });
      }
    } catch (e) {
      errors.push({ file: file.name, message: (e as Error).message });
    }
  }

  cycles.sort((a, b) => {
    if (!a.detectedDate) return 1;
    if (!b.detectedDate) return -1;
    return a.detectedDate.iso.localeCompare(b.detectedDate.iso);
  });

  return { cycles, financials, errors };
}
```

- [ ] **Step 4: Port the Vista XLSX export**

Port `exportVista.js` to TypeScript as `packages/projections/src/export/vista-xlsx.ts`. This uses ExcelJS to generate a formatted `.xlsx` file matching the Vista/PM worksheet layout. Add `exceljs` as a dependency.

The export function signature:
```typescript
export async function exportProjectionToVistaXLSX(
  items: ProjectionItem[],
  projectName: string,
  cycleLabel: string,
): Promise<Blob>
```

Port the full ExcelJS workbook generation from `exportVista.js` — headers, data rows with formulas, conditional formatting, summary row at the bottom. Replace references to `itemKey(it.phase, it.costType)` with `it.lineKey`, and `it.phase`/`it.costType` with `it.keyParts[0]`/`it.keyParts[1]`.

Also port the simple CSV export from `csv.js` as `packages/projections/src/export/csv.ts`:
```typescript
export function exportProjectionToCSV(
  items: ProjectionItem[],
  filename?: string,
): void
```

- [ ] **Step 5: Update barrel export**

```typescript
// packages/projections/src/index.ts
export * from './types';
export * from './engine';
export * from './adapters/types';
export { vistaAdapter, parseSheet, num, str, splitCostTypeUM } from './adapters/vista';
export { parseBatchUpload } from './adapters/batch-upload';
export { exportProjectionToVistaXLSX } from './export/vista-xlsx';
export { exportProjectionToCSV } from './export/csv';
```

- [ ] **Step 6: Add dependencies and verify typecheck**

```bash
pnpm -F @repo/projections add xlsx exceljs
pnpm -F @repo/projections typecheck
```

Expected: PASS (or minor type issues to fix inline)

- [ ] **Step 7: Commit**

```bash
git add packages/projections/
git commit -m "feat(projections): port Vista adapter and batch upload parser"
```

---

### Task 5: Add `@repo/projections` as a dependency of `@repo/web`

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add the workspace dependency**

```bash
pnpm -F @repo/web add @repo/projections@workspace:*
pnpm install
```

- [ ] **Step 2: Verify the import resolves**

Create a temporary test file to verify the import works:

```bash
echo 'import { createEmptyProject } from "@repo/projections"; console.log(createEmptyProject("test"));' > apps/web/src/_test-import.ts
pnpm -F @repo/web typecheck
rm apps/web/src/_test-import.ts
```

Expected: typecheck PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add @repo/projections dependency to web app"
```

---

### Task 6: Add tenant configuration system

**Files:**
- Create: `apps/web/src/lib/tenant.ts`
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Create the tenant config module**

```typescript
// apps/web/src/lib/tenant.ts

import type { ProjectionAdapter } from '@repo/projections/adapters/types';
import { vistaAdapter } from '@repo/projections';
import type { NavItem } from '~/components/navigation/app-sidebar';

export type TenantId = 'stratagraph' | 'superior';

export interface TenantConfig {
  id: TenantId;
  name: string;
  shortName: string;
  features: {
    projections: boolean;
    operations: boolean;
  };
  projectionAdapter: ProjectionAdapter | null;
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  stratagraph: {
    id: 'stratagraph',
    name: 'Stratagraph',
    shortName: 'SG',
    features: {
      projections: false,
      operations: true,
    },
    projectionAdapter: null,
  },
  superior: {
    id: 'superior',
    name: 'Superior Construction',
    shortName: 'SC',
    features: {
      projections: true,
      operations: false,
    },
    projectionAdapter: vistaAdapter,
  },
};

export function getNavItems(tenant: TenantConfig): NavItem[] {
  const items: NavItem[] = [];

  if (tenant.features.operations) {
    items.push(
      { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
      { id: 'bids', label: 'Bids', href: '/bids', icon: 'FileText' },
      { id: 'jobs', label: 'Jobs', href: '/jobs', icon: 'Briefcase' },
      { id: 'tickets', label: 'Tickets', href: '/tickets', icon: 'Receipt' },
      { id: 'reports', label: 'Reports', href: '/reports', icon: 'BarChart3' },
      {
        id: 'admin',
        label: 'Admin',
        href: '/customers',
        icon: 'Settings',
        defaultOpen: true,
        children: [
          { id: 'admin-team', label: 'Team', href: '/users', icon: 'Users' },
          { id: 'admin-customers', label: 'Customers', href: '/customers', icon: 'Building2' },
          { id: 'admin-equipment', label: 'Equipment', href: '/equipment', icon: 'Truck' },
          { id: 'admin-services', label: 'Services', href: '/services', icon: 'Wrench' },
          { id: 'admin-yards', label: 'Yards', href: '/yards', icon: 'MapPin' },
        ],
      },
    );
  }

  if (tenant.features.projections) {
    items.push(
      { id: 'proj-home', label: 'Dashboard', href: '/home', icon: 'Home' },
      { id: 'projections', label: 'Projections', href: '/projections', icon: 'BarChart3' },
    );
  }

  return items;
}
```

- [ ] **Step 2: Add tenant state to the Zustand store**

Add the tenant slice to the existing store. Open `apps/web/src/lib/store.ts` and add these imports and state at the top of the store definition:

At the top of the file, add the import:
```typescript
import { TENANTS, type TenantId, type TenantConfig } from './tenant';
```

In the store's state interface (inside `create<...>()`) add:
```typescript
  // Tenant
  tenantId: TenantId;
  setTenant: (id: TenantId) => void;
  getTenantConfig: () => TenantConfig;
```

In the store's implementation, add:
```typescript
  tenantId: (new URLSearchParams(window.location.search).get('tenant') as TenantId) || 'stratagraph',
  setTenant: (id) => set({ tenantId: id }),
  getTenantConfig: () => TENANTS[get().tenantId] ?? TENANTS.stratagraph,
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm -F @repo/web typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/tenant.ts apps/web/src/lib/store.ts
git commit -m "feat: add multi-tenant configuration system"
```

---

### Task 7: Wire tenant into sidebar and layout

**Files:**
- Modify: `apps/web/src/components/layout/dashboard-layout.tsx`
- Modify: `apps/web/src/components/navigation/app-sidebar.tsx`

- [ ] **Step 1: Update dashboard-layout.tsx to use tenant nav items**

Replace the hardcoded `NAV_ITEMS` with tenant-driven items:

```typescript
// apps/web/src/components/layout/dashboard-layout.tsx

import type { ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';
import { AppLayout } from '@repo/ui';
import { AppSidebar } from '../navigation/app-sidebar';
import { Breadcrumb } from '../navigation/breadcrumb';
import { GlobalSearch } from '../global-search';
import { NotificationsBell } from '../notifications-bell';
import { useStore } from '~/lib/store';
import { getNavItems, TENANTS } from '~/lib/tenant';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const tenantId = useStore((s) => s.tenantId);
  const tenant = TENANTS[tenantId] ?? TENANTS.stratagraph;
  const navItems = getNavItems(tenant);

  return (
    <AppLayout
      sidebar={
        <AppSidebar
          navItems={navItems}
          currentPath={location.pathname}
          tenantName={tenant.name}
          tenantShortName={tenant.shortName}
        />
      }
      breadcrumbSlot={<Breadcrumb />}
      headerActions={
        <>
          <GlobalSearch />
          <NotificationsBell />
        </>
      }
    >
      <div className="min-w-0 w-full px-6 py-4">{children}</div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Update app-sidebar.tsx to accept tenant props**

Add `tenantName` and `tenantShortName` props to `AppSidebarProps` and use them in the sidebar header instead of the hardcoded "Stratagraph" / "SG":

In the `AppSidebarProps` interface, add:
```typescript
  tenantName?: string;
  tenantShortName?: string;
```

In the `AppSidebar` function signature, destructure them:
```typescript
export function AppSidebar({ navItems, currentPath, tenantName = 'Stratagraph', tenantShortName = 'SG' }: AppSidebarProps) {
```

In the SidebarHeader, replace the hardcoded values:
```typescript
<div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-bold tracking-tight">
  {tenantShortName}
</div>
<div className="grid flex-1 text-left text-sm leading-tight">
  <span className="truncate font-semibold">{tenantName}</span>
  <span className="text-muted-foreground truncate text-xs">Operations</span>
</div>
```

- [ ] **Step 3: Verify typecheck and run dev**

```bash
pnpm -F @repo/web typecheck
pnpm dev
```

Expected: App loads. Sidebar shows Stratagraph items by default. Adding `?tenant=superior` to URL shows only Dashboard + Projections items.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/dashboard-layout.tsx apps/web/src/components/navigation/app-sidebar.tsx
git commit -m "feat: wire tenant config into sidebar navigation"
```

---

### Task 8: Add projection store slice

**Files:**
- Modify: `apps/web/src/lib/store.ts`

Add a projections slice to the existing Zustand store for managing projection workspace state (projects, active project, persistence).

- [ ] **Step 1: Add projection imports and state**

At the top of `store.ts`, add:
```typescript
import type { ProjectionProject } from '@repo/projections';
import {
  createEmptyProject,
  ingestDump,
  ingestBatch,
  updateForecast,
  saveDraft,
  discardDraft,
  startDraft,
  addComment,
  deleteComment,
  resolveAlert,
  reopenAlert,
  updateDraftItem,
  loadProject,
  rederiveVersions,
} from '@repo/projections';
```

Add to the store's state interface:
```typescript
  // Projections
  projectionProjects: ProjectionProject[];
  activeProjectionId: string | null;
  getActiveProjection: () => ProjectionProject | null;
  setActiveProjection: (id: string) => void;
  addProjectionProject: (project: ProjectionProject) => void;
  removeProjectionProject: (id: string) => void;
  updateActiveProjection: (updater: (p: ProjectionProject) => ProjectionProject) => void;
```

Add to the store's implementation:
```typescript
  projectionProjects: [],
  activeProjectionId: null,
  getActiveProjection: () => {
    const s = get();
    return s.projectionProjects.find((p) => p.id === s.activeProjectionId) ?? null;
  },
  setActiveProjection: (id) => set({ activeProjectionId: id }),
  addProjectionProject: (project) =>
    set((s) => ({
      projectionProjects: [...s.projectionProjects, project],
      activeProjectionId: project.id,
    })),
  removeProjectionProject: (id) =>
    set((s) => {
      const projects = s.projectionProjects.filter((p) => p.id !== id);
      return {
        projectionProjects: projects,
        activeProjectionId:
          s.activeProjectionId === id ? (projects[0]?.id ?? null) : s.activeProjectionId,
      };
    }),
  updateActiveProjection: (updater) =>
    set((s) => {
      if (!s.activeProjectionId) return s;
      return {
        projectionProjects: s.projectionProjects.map((p) =>
          p.id === s.activeProjectionId ? updater(p) : p,
        ),
      };
    }),
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm -F @repo/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/store.ts
git commit -m "feat: add projection workspace slice to Zustand store"
```

---

### Task 9: Create projection routes (placeholder pages)

**Files:**
- Create: `apps/web/src/routes/_dashboard/projections.index.tsx`
- Create: `apps/web/src/routes/_dashboard/projections.$projectId.tsx`

Create the route files with minimal placeholder UI so the routing works. We'll fill in the real UI in later tasks.

- [ ] **Step 1: Create projections index route**

```typescript
// apps/web/src/routes/_dashboard/projections.index.tsx

import { createFileRoute, Link } from '@tanstack/react-router';
import { Button, PageHeader, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { Plus, BarChart3 } from 'lucide-react';
import { useStore } from '~/lib/store';

export const Route = createFileRoute('/_dashboard/projections/')({
  component: ProjectionsIndexPage,
});

function ProjectionsIndexPage() {
  const projects = useStore((s) => s.projectionProjects);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projections"
        description="Cost projection workspaces"
        actions={
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            New Project
          </Button>
        }
      />

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="text-muted-foreground mb-4 size-12" />
            <p className="text-muted-foreground text-sm">
              No projection projects yet. Upload a Vista cost report to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to="/projections/$projectId" params={{ projectId: project.id }}>
              <Card className="hover:border-primary/50 cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p>{project.customer}</p>
                    <p>{project.versions.length} version{project.versions.length !== 1 ? 's' : ''}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create projection detail route**

```typescript
// apps/web/src/routes/_dashboard/projections.$projectId.tsx

import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@repo/ui';
import { useStore } from '~/lib/store';

export const Route = createFileRoute('/_dashboard/projections/$projectId')({
  component: ProjectionDetailPage,
});

function ProjectionDetailPage() {
  const { projectId } = Route.useParams();
  const project = useStore((s) =>
    s.projectionProjects.find((p) => p.id === projectId),
  );

  if (!project) {
    return <div className="p-6">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.customer} · ${project.versions.length} versions`}
      />
      <div className="text-muted-foreground rounded-lg border p-8 text-center text-sm">
        Projection table, trend charts, and alerts will be rendered here.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the route generator and verify**

```bash
pnpm -F @repo/web dev
```

Expected: Dev server starts. Navigate to `/projections` — see the empty state. The route tree auto-generates.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/projections.index.tsx apps/web/src/routes/_dashboard/projections.\$projectId.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add projection route placeholders"
```

---

### Task 10: Build the projection table component

**Files:**
- Create: `apps/web/src/components/projection-table.tsx`
- Modify: `apps/web/src/routes/_dashboard/projections.$projectId.tsx`

This is the main projection table — the core UI. It uses `@tanstack/react-table` (already in `@repo/ui`) to render projection items with editable forecast cells, variance highlighting, and risk badges.

This is a large component. Build it incrementally:
1. Basic read-only table with all columns
2. Editable forecast cells
3. Variance highlighting
4. Risk badges

- [ ] **Step 1: Create the projection table component**

Create `apps/web/src/components/projection-table.tsx` with the full implementation. The component receives `project: ProjectionProject` and `onUpdateForecast`, `onOpenTrend`, `onOpenComments` callbacks.

Use the `data-grid-table` pattern from `@repo/ui` — define columns with `createColumnHelper<ProjectionItem>()`, render with `useReactTable` + `DataGridTable`.

Key columns to include:
- Phase (keyParts[0]) — frozen/sticky left
- Cost Type (keyParts[1])
- Description (label)
- UM (unitOfMeasure)
- CTP Cost, CTD Cost, CTC Cost — read-only, formatted with `formatCurrency`
- F Qty, F Hours, F Cost — **editable** (these are the forecast inputs)
- F UC, F MPU — read-only derived
- Est Cost — read-only
- Variance (vsPrev) — color-coded
- % Complete — progress bar
- Risk — badge (high/medium/low)
- Actions — trend chart icon, comments icon with count

For editable cells, use an inline `<input>` that:
- Shows formatted currency on blur
- Accepts raw numbers and math expressions (e.g. `38*5`) on focus
- Calls `onUpdateForecast(lineKey, { cost: newValue })` on blur/Enter
- Validates with `Number.isFinite()` before committing

For variance highlighting, apply `bg-destructive/10` when variance > 5% increase, `bg-success/10` when > 5% decrease.

This component will be large (~300-400 lines). Implement it fully with all the column definitions, editable cell logic, and variance styling. Reference Superior's `ProjectionsTable.jsx` and `EditableCell.jsx` for the editing UX patterns.

- [ ] **Step 2: Wire the table into the detail route**

Update `projections.$projectId.tsx` to import and render `ProjectionTable`, passing the project and callbacks that call the store's `updateActiveProjection` with the engine functions.

- [ ] **Step 3: Verify with dev server**

```bash
pnpm dev
```

Navigate to a projection project (you may need to add seed data first — see Task 12). Verify the table renders, columns are present, and editable cells work.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/projection-table.tsx apps/web/src/routes/_dashboard/projections.\$projectId.tsx
git commit -m "feat: build projection table with editable forecast cells"
```

---

### Task 11: Build projection support components

**Files:**
- Create: `apps/web/src/components/projection-upload.tsx`
- Create: `apps/web/src/components/projection-trend-modal.tsx`
- Create: `apps/web/src/components/projection-alerts-panel.tsx`
- Create: `apps/web/src/components/projection-comments.tsx`

Build the four supporting components. Each one is smaller and follows established patterns from `@repo/ui`.

- [ ] **Step 1: Build projection-upload.tsx**

An upload dialog that accepts `.xls`/`.xlsx`/`.csv` files, parses them with the tenant's adapter, shows a preview of detected items, and calls `ingestDump` or `ingestBatch` on confirm.

Use the existing `import-dialog` pattern from `@repo/ui`. The component receives:
- `adapter: ProjectionAdapter` — the parser to use
- `onImport: (items: ProjectionItem[], label: string) => void` — single file import
- `onBatchImport: (cycles, financials) => void` — multi-file batch
- `open: boolean`, `onOpenChange: (open: boolean) => void`

- [ ] **Step 2: Build projection-trend-modal.tsx**

A dialog showing a line chart of a single line item's cost/unit-rate history across versions. Uses `@repo/ui/components/charts/visx/line-chart` for rendering.

Props:
- `project: ProjectionProject`
- `lineKey: string | null` — null means closed
- `onClose: () => void`

Data comes from `phaseHistory(project, lineKey)`.

- [ ] **Step 3: Build projection-alerts-panel.tsx**

A sidebar panel showing open and resolved alerts. Uses `Card`, `Badge`, and `Alert` from `@repo/ui`.

Props:
- `project: ProjectionProject`
- `onResolve: (alert: ProjectionAlert, text: string) => void`
- `onReopen: (alertId: string) => void`
- `onNavigateToItem: (lineKey: string) => void`

Data comes from `computeAlerts(project)`.

- [ ] **Step 4: Build projection-comments.tsx**

A sheet (slide-over) showing threaded comments for a specific line item. Uses `Sheet`, `Textarea`, and `Avatar` from `@repo/ui`.

Props:
- `project: ProjectionProject`
- `lineKey: string | null` — null means closed
- `onAddComment: (key: string, text: string) => void`
- `onDeleteComment: (key: string, commentId: string) => void`
- `onClose: () => void`

Comments come from `project.comments[lineKey]`. They roll over across versions — all comments for the lineKey show, with their `versionLabel` indicating when they were written.

- [ ] **Step 5: Wire all components into the detail route**

Update `projections.$projectId.tsx` to import and render all four components with proper state management and callbacks.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/projection-*.tsx apps/web/src/routes/_dashboard/projections.\$projectId.tsx
git commit -m "feat: add projection upload, trend chart, alerts, and comments components"
```

---

### Task 12: Add seed projection data

**Files:**
- Create: `apps/web/src/data/seed-projections.ts`
- Modify: `apps/web/src/lib/store.ts`

Create demo seed data for Superior Construction's Suncoast 3A project so the projection module has data to render on first load.

- [ ] **Step 1: Create seed-projections.ts**

Build a seed file with 4 monthly versions of projection data for the Suncoast 3A project. Each version has ~20 line items across multiple cost types (2Labor, 3Material, 4Rental, 5SubCont, 6OtherJC, 9Owned).

Use realistic numbers based on Superior's CLAUDE.md context: $195M original contract, Aug 2025 → Jan 2030, heavy civil construction.

The seed data shape must match `ProjectionProject` exactly, with `lineKey` and `keyParts` instead of `phase`/`costType`.

Include some comments that roll over across versions to demonstrate the comment persistence behavior.

- [ ] **Step 2: Load seed data for the Superior tenant**

In `store.ts`, when `tenantId` is `'superior'` and `projectionProjects` is empty, auto-load the seed data using `loadProject()` from `@repo/projections`.

- [ ] **Step 3: Verify with dev server**

```bash
pnpm dev
```

Navigate to `/?tenant=superior`, then `/projections`. The Suncoast 3A project should appear. Click into it — the table should render with data. Comments should show across versions.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/data/seed-projections.ts apps/web/src/lib/store.ts
git commit -m "feat: add Suncoast 3A seed data for projection demo"
```

---

### Task 13: Add tenant switcher UI

**Files:**
- Modify: `apps/web/src/components/navigation/app-sidebar.tsx`

Add a tenant picker dropdown in the sidebar footer (below the user avatar) that lets you switch between "Stratagraph" and "Superior Construction".

- [ ] **Step 1: Add the tenant picker**

In the `SidebarFooter` section of `app-sidebar.tsx`, add a `Select` component above the user avatar that lists available tenants. On change, call `useStore.getState().setTenant(id)` and navigate to `/home` (or `/projections` for Superior).

Use `@repo/ui`'s `Select` component. Options come from `Object.values(TENANTS)`.

- [ ] **Step 2: Verify with dev server**

Switch between tenants. Sidebar items should change. Navigating to `/projections` as Superior shows the projection list. Navigating as Stratagraph shows the ops dashboard.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/navigation/app-sidebar.tsx
git commit -m "feat: add tenant switcher to sidebar"
```

---

### Task 14: Final integration test and cleanup

**Files:**
- Possibly modify: various files for type errors or import issues

- [ ] **Step 1: Full typecheck**

```bash
pnpm typecheck
```

Fix any type errors across all packages.

- [ ] **Step 2: Full dev server smoke test**

```bash
pnpm dev
```

Test the following flows:

**Stratagraph tenant (default):**
- Home page loads with active jobs
- Bids, Jobs, Tickets, Equipment pages all work
- Sidebar shows ops navigation

**Superior tenant (`?tenant=superior`):**
- Sidebar shows Dashboard + Projections
- `/projections` shows the Suncoast 3A project card
- Click into project → table renders with data
- Edit a forecast cell (qty, hours, or cost) → derived fields update
- Variance highlighting appears on significant changes
- Click trend icon → modal shows cost history chart
- Click comments icon → sheet shows threaded comments, can add new
- Alerts panel shows open alerts
- Comments persist when switching versions (rollover confirmed)

- [ ] **Step 3: Fix any issues found**

Address any rendering, data, or interaction issues discovered during testing.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: integration fixes from smoke testing"
```
