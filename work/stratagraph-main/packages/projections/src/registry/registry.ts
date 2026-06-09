import type {
  ServiceItem,
  ServiceAlias,
  ServiceRegistry,
  ServiceSource,
  FuzzyMatch,
} from './types';

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
      } else if (
        existing.sources[idx]!.unitCost !== src.unitCost ||
        existing.sources[idx]!.qty !== src.qty ||
        existing.sources[idx]!.cost !== src.cost ||
        existing.sources[idx]!.upm !== src.upm ||
        existing.sources[idx]!.phaseCode !== src.phaseCode ||
        existing.sources[idx]!.date !== src.date
      ) {
        newSources = existing.sources.map((s, i) => (i === idx ? src : s));
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
  const newItem: ServiceItem = {
    id: uid(),
    canonicalName: input.canonicalName,
    unitOfMeasure: input.unitOfMeasure,
    costType: input.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [input.sourceProjectId],
    sources: input.source ? [input.source] : [],
  };
  return { ...registry, items: [...registry.items, newItem] };
}

export function findServiceItem(
  registry: ServiceRegistry,
  name: string,
  costType: string
): ServiceItem | undefined {
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
  const newItem: ServiceItem = {
    id: uid(),
    canonicalName: aliasRaw,
    unitOfMeasure: source.unitOfMeasure,
    costType: source.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [alias.sourceProjectId],
    sources: [],
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

export function rateRange(item: ServiceItem): { lo: number; avg: number; hi: number } | null {
  const costs = item.sources.map((s) => s.unitCost).filter((c) => c > 0);
  if (costs.length === 0) return null;
  const sum = costs.reduce((a, b) => a + b, 0);
  return { lo: Math.min(...costs), avg: sum / costs.length, hi: Math.max(...costs) };
}

export function avgUpm(item: ServiceItem): number | null {
  const upms = item.sources.map((s) => s.upm).filter((u): u is number => u != null);
  if (upms.length === 0) return null;
  return upms.reduce((a, b) => a + b, 0) / upms.length;
}

export function primaryPhase(item: ServiceItem): { code: string | null; varies: boolean } {
  const codes = item.sources.map((s) => s.phaseCode).filter(Boolean) as string[];
  if (codes.length === 0) return { code: null, varies: false };
  const counts = new Map<string, number>();
  for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = codes[0]!;
  for (const [c, n] of counts) if (n > (counts.get(best) ?? 0)) best = c;
  return { code: best, varies: counts.size > 1 };
}
