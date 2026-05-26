import type {
  LineItem,
  LineItemAlias,
  LineItemRegistry,
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
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isFuzzyMatch(a: string, b: string, threshold = 0.3): boolean {
  const na = normalizeKey(a);
  const nb = normalizeKey(b);
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;
  return levenshtein(na, nb) / maxLen <= threshold;
}

export function createRegistry(tenantId: string): LineItemRegistry {
  return { tenantId, items: [] };
}

export function addLineItem(
  registry: LineItemRegistry,
  input: {
    canonicalName: string;
    unitOfMeasure: string;
    costType: string;
    sourceProjectId: string;
  }
): LineItemRegistry {
  const normName = normalizeKey(input.canonicalName);
  const normCost = normalizeKey(input.costType);
  const existing = registry.items.find(
    (item) => normalizeKey(item.canonicalName) === normName && normalizeKey(item.costType) === normCost
  );
  if (existing) {
    if (!existing.projectIds.includes(input.sourceProjectId)) {
      return {
        ...registry,
        items: registry.items.map((item) =>
          item.id === existing.id
            ? { ...item, projectIds: [...item.projectIds, input.sourceProjectId] }
            : item
        ),
      };
    }
    return registry;
  }
  const newItem: LineItem = {
    id: uid(),
    canonicalName: input.canonicalName,
    unitOfMeasure: input.unitOfMeasure,
    costType: input.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [input.sourceProjectId],
  };
  return { ...registry, items: [...registry.items, newItem] };
}

export function findLineItem(
  registry: LineItemRegistry,
  name: string,
  costType: string
): LineItem | undefined {
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
  registry: LineItemRegistry,
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

export function mergeLineItems(
  registry: LineItemRegistry,
  targetItemId: string,
  alias: LineItemAlias
): LineItemRegistry {
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
  registry: LineItemRegistry,
  itemId: string,
  aliasRaw: string
): LineItemRegistry {
  const source = registry.items.find((i) => i.id === itemId);
  if (!source) return registry;
  const alias = source.aliases.find((a) => a.raw === aliasRaw);
  if (!alias) return registry;

  const updatedSource = {
    ...source,
    aliases: source.aliases.filter((a) => a.raw !== aliasRaw),
  };
  const newItem: LineItem = {
    id: uid(),
    canonicalName: aliasRaw,
    unitOfMeasure: source.unitOfMeasure,
    costType: source.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [alias.sourceProjectId],
  };

  return {
    ...registry,
    items: registry.items.map((i) => (i.id === itemId ? updatedSource : i)).concat(newItem),
  };
}

export function editLineItemName(
  registry: LineItemRegistry,
  itemId: string,
  newName: string
): LineItemRegistry {
  return {
    ...registry,
    items: registry.items.map((item) =>
      item.id === itemId ? { ...item, canonicalName: newName } : item
    ),
  };
}

export function removeLineItem(
  registry: LineItemRegistry,
  itemId: string
): LineItemRegistry {
  return {
    ...registry,
    items: registry.items.filter((i) => i.id !== itemId),
  };
}
