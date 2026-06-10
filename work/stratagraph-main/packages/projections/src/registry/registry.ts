import type {
  Service,
  ServiceAlias,
  ServiceRegistry,
  ServiceSource,
  FuzzyMatch,
} from './types';
import type { ProjectionProject, ProjectionItem } from '../types';

let _counter = 0;
function uid(): string {
  return `li-${Date.now().toString(36)}-${(++_counter).toString(36)}`;
}

export function normalizeKey(s: string): string {
  return s.toUpperCase().replace(/[\s.\-_]+/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

function isFuzzyMatch(a: string, b: string, threshold = 0.3): boolean {
  const na = normalizeKey(a);
  const nb = normalizeKey(b);
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;
  return levenshtein(na, nb) / maxLen <= threshold;
}

export function createRegistry(tenantId: string): ServiceRegistry {
  return { tenantId, items: [] };
}

export function addServiceItem(
  registry: ServiceRegistry,
  input: {
    canonicalName: string;
    unitOfMeasure: string;
    costType: string;
    sourceProjectId: string;
    source?: ServiceSource;
  }
): ServiceRegistry {
  const normName = normalizeKey(input.canonicalName);
  const normCost = normalizeKey(input.costType);
  const existing = registry.items.find(
    (item) => normalizeKey(item.canonicalName) === normName && normalizeKey(item.costType) === normCost
  );
  if (existing) {
    const newProjectIds = existing.projectIds.includes(input.sourceProjectId)
      ? existing.projectIds
      : [...existing.projectIds, input.sourceProjectId];

    // Upsert source by (projectId, lineKey): replace if same key, otherwise append.
    let newSources = existing.sources;
    if (input.source) {
      const src = input.source;
      const idx = existing.sources.findIndex(
        (s) => s.projectId === src.projectId && s.lineKey === src.lineKey
      );
      if (idx === -1) {
        newSources = [...existing.sources, src];
      } else {
        const ex = existing.sources[idx]!;
        const changed =
          ex.ctd.qty !== src.ctd.qty || ex.ctd.hours !== src.ctd.hours || ex.ctd.cost !== src.ctd.cost ||
          ex.oe.qty !== src.oe.qty || ex.oe.cost !== src.oe.cost ||
          ex.f.qty !== src.f.qty || ex.f.cost !== src.f.cost ||
          ex.phaseCode !== src.phaseCode || ex.date !== src.date;
        if (changed) {
          newSources = existing.sources.map((s, i) => (i === idx ? src : s));
        }
      }
    }

    // Nothing changed — return registry unchanged.
    if (newProjectIds === existing.projectIds && newSources === existing.sources) {
      return registry;
    }

    return {
      ...registry,
      items: registry.items.map((item) =>
        item.id === existing.id
          ? { ...item, projectIds: newProjectIds, sources: newSources }
          : item
      ),
    };
  }
  const newItem: Service = {
    id: uid(),
    tenantId: 'superior',
    canonicalName: input.canonicalName,
    unitOfMeasure: input.unitOfMeasure,
    costType: input.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [input.sourceProjectId],
    sources: input.source ? [input.source] : [],
    recommendedRate: null,
    rateNote: null,
    billingUnit: null,
    dailyCode: null,
  };
  return { ...registry, items: [...registry.items, newItem] };
}

export function findServiceItem(
  registry: ServiceRegistry,
  name: string,
  costType: string
): Service | undefined {
  const normName = normalizeKey(name);
  const normCost = normalizeKey(costType);
  return registry.items.find((item) => {
    if (normalizeKey(item.canonicalName) === normName && normalizeKey(item.costType) === normCost) {
      return true;
    }
    return item.aliases.some((a) => normalizeKey(a.raw) === normName) && normalizeKey(item.costType) === normCost;
  });
}

export function findFuzzyMatches(
  registry: ServiceRegistry,
  name: string,
  unitOfMeasure: string,
  costType: string
): FuzzyMatch[] {
  const results: FuzzyMatch[] = [];
  for (const item of registry.items) {
    const matched: ('name' | 'costType' | 'unitOfMeasure')[] = [];
    if (isFuzzyMatch(item.canonicalName, name)) matched.push('name');
    if (normalizeKey(item.costType) === normalizeKey(costType)) matched.push('costType');
    if (normalizeKey(item.unitOfMeasure) === normalizeKey(unitOfMeasure)) matched.push('unitOfMeasure');
    if (matched.length >= 2) {
      results.push({ existingItem: item, matchedFields: matched, confidence: matched.length / 3 });
    }
  }
  return results;
}

export function mergeServiceItems(
  registry: ServiceRegistry,
  targetItemId: string,
  alias: ServiceAlias
): ServiceRegistry {
  return {
    ...registry,
    items: registry.items.map((item) =>
      item.id === targetItemId
        ? { ...item, aliases: [...item.aliases, alias] }
        : item
    ),
  };
}

export function separateAlias(
  registry: ServiceRegistry,
  itemId: string,
  aliasRaw: string
): ServiceRegistry {
  const source = registry.items.find((i) => i.id === itemId);
  if (!source) return registry;
  const alias = source.aliases.find((a) => a.raw === aliasRaw);
  if (!alias) return registry;

  const updatedSource = {
    ...source,
    aliases: source.aliases.filter((a) => a.raw !== aliasRaw),
  };
  const newItem: Service = {
    id: uid(),
    tenantId: 'superior',
    canonicalName: aliasRaw,
    unitOfMeasure: source.unitOfMeasure,
    costType: source.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [alias.sourceProjectId],
    sources: [],
    recommendedRate: null,
    rateNote: null,
    billingUnit: null,
    dailyCode: null,
  };

  return {
    ...registry,
    items: registry.items.map((i) => (i.id === itemId ? updatedSource : i)).concat(newItem),
  };
}

export function editServiceItemName(
  registry: ServiceRegistry,
  itemId: string,
  newName: string
): ServiceRegistry {
  return {
    ...registry,
    items: registry.items.map((item) =>
      item.id === itemId ? { ...item, canonicalName: newName } : item
    ),
  };
}

export function removeServiceItem(
  registry: ServiceRegistry,
  itemId: string
): ServiceRegistry {
  return {
    ...registry,
    items: registry.items.filter((i) => i.id !== itemId),
  };
}

export function primaryPhase(item: Service): { code: string | null; varies: boolean } {
  const codes = item.sources.map((s) => s.phaseCode).filter(Boolean) as string[];
  if (codes.length === 0) return { code: null, varies: false };
  const counts = new Map<string, number>();
  for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = codes[0]!;
  for (const [c, n] of counts) if (n > (counts.get(best) ?? 0)) best = c;
  return { code: best, varies: counts.size > 1 };
}

export interface ImportLine {
  name: string;
  unitOfMeasure: string;
  costType: string;
  lineKey: string;
  phaseCode: string;
  ctd: { qty: number; hours: number; cost: number };
  oe: { qty: number; cost: number };
  f: { qty: number; cost: number };
  date: string;
  projectId?: string;
}

export interface MatchSuggestion {
  service: Service;
  reason: 'exact-name' | 'fuzzy-name' | 'phase-rename';
  confidence: number;
}

export interface ClassifiedLine {
  line: ImportLine;
  bucket: 'auto' | 'review' | 'new';
  /** All candidates, best first. Review rows render every entry. */
  suggestions: MatchSuggestion[];
  /** Best candidate (suggestions[0]?.service) — kept for existing call sites. */
  suggestion: Service | null;
  confidence: number;
  /** Best candidate exists but its UoM differs from the incoming line. Warns, never blocks. */
  uomWarning: boolean;
}

/**
 * 5-tier matcher. Cost type must agree at every tier; name + cost type always
 * wins; phase code is a within-project rename fallback only (codes are not
 * stable across jobs); UoM never gates a match.
 */
export function classifyImport(registry: ServiceRegistry, lines: ImportLine[]): ClassifiedLine[] {
  return lines.map((line) => {
    const nName = normalizeKey(line.name);
    const nCost = normalizeKey(line.costType);
    const nPhase = normalizeKey(line.phaseCode);
    const sameCost = registry.items.filter((i) => normalizeKey(i.costType) === nCost);

    const uomWarns = (s: Service) =>
      normalizeKey(s.unitOfMeasure) !== normalizeKey(line.unitOfMeasure);

    // Tier 1 — exact canonical name or recorded alias.
    const exact = sameCost.find(
      (i) =>
        normalizeKey(i.canonicalName) === nName ||
        i.aliases.some((a) => normalizeKey(a.raw) === nName)
    );
    if (exact) {
      return {
        line, bucket: 'auto' as const,
        suggestions: [{ service: exact, reason: 'exact-name' as const, confidence: 1 }],
        suggestion: exact, confidence: 1, uomWarning: uomWarns(exact),
      };
    }

    // Tier 2 — fuzzy canonical name.
    const fuzzy = sameCost.filter((i) => isFuzzyMatch(i.canonicalName, line.name));

    // Tier 3 — same-project phase rename (name drifted, code + cost type agree).
    const renames =
      line.projectId && nPhase
        ? sameCost.filter(
            (i) =>
              !fuzzy.includes(i) &&
              i.sources.some(
                (s) => s.projectId === line.projectId && normalizeKey(s.phaseCode) === nPhase
              )
          )
        : [];

    const suggestions: MatchSuggestion[] = [
      ...fuzzy.map((s) => ({ service: s, reason: 'fuzzy-name' as const, confidence: 0.8 })),
      ...renames.map((s) => ({ service: s, reason: 'phase-rename' as const, confidence: 0.6 })),
    ];

    if (suggestions.length === 0) {
      return { line, bucket: 'new' as const, suggestions, suggestion: null, confidence: 0, uomWarning: false };
    }

    const best = suggestions[0]!;
    // Single unambiguous fuzzy → auto. Any rename, or multiple candidates → review.
    const bucket =
      fuzzy.length === 1 && renames.length === 0 ? ('auto' as const) : ('review' as const);
    return {
      line, bucket, suggestions,
      suggestion: best.service, confidence: best.confidence, uomWarning: uomWarns(best.service),
    };
  });
}

/** Convert a projection item to an ImportLine for reconciliation. */
export function toImportLine(
  item: ProjectionItem,
  projectId: string,
  date: string
): ImportLine {
  return {
    name: item.label,
    unitOfMeasure: item.unitOfMeasure,
    costType: item.keyParts[1] ?? '',
    lineKey: item.lineKey,
    phaseCode: item.keyParts[0] ?? '',
    ctd: { qty: item.CTD.qty, hours: item.CTD.hours, cost: item.CTD.cost },
    oe: { qty: item.Est.qty, cost: item.Est.cost },
    f: { qty: item.F.qty, cost: item.F.cost },
    date,
    projectId,
  };
}

/**
 * Lines in the latest version that need reconciliation: new lineKeys plus
 * renamed labels vs the immediately prior version. First version → all lines.
 */
export function computeUploadDelta(project: ProjectionProject): ImportLine[] {
  const latest = project.versions[project.versions.length - 1];
  if (!latest) return [];
  const prev = project.versions[project.versions.length - 2] ?? null;
  const prevByKey = new Map((prev?.items ?? []).map((i) => [i.lineKey, i]));
  return latest.items
    .filter((it) => {
      const p = prevByKey.get(it.lineKey);
      return !p || p.label !== it.label;
    })
    .map((it) => toImportLine(it, project.id, latest.createdAt));
}
