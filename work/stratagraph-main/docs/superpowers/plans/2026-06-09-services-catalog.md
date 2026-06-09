# Services Catalog (Superior) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the misplaced metrics view on the Superior `/services` screen with a reusable line-item catalog seeded from Vista uploads, with cross-project cost ranges, drill-down, edit/merge/split, and a human-confirmed import-reconcile flow.

**Architecture:** Extend the existing `packages/projections/src/registry` engine (`ServiceItem`/`ServiceRegistry`) with per-line `sources` provenance + derived selectors + an import classifier, then build the Superior view, detail dialog, and reconcile dialog on top. Pure engine logic is TDD'd with vitest; UI is built and verified in the browser.

**Tech Stack:** TypeScript, React 19, Zustand, TanStack Table (`DataListShell`), Tailwind v4, vitest. Spec: `docs/superpowers/specs/2026-06-09-services-catalog-design.md`.

---

## Context the engineer needs

- **The catalog engine already exists** in `packages/projections/src/registry/registry.ts` + `types.ts`: `ServiceItem` (canonicalName, unitOfMeasure, costType, aliases[], projectIds[]), `addServiceItem` (dedup on normalized name+costType), `findFuzzyMatches` (levenshtein name + costType + UoM → `confidence = matchedFields/3`, requires ≥2 fields), `mergeServiceItems`, `separateAlias`, `editServiceItemName`, `removeServiceItem`, `normalizeKey`.
- `services.tsx` already renders `registry.items` as rows for the Superior branch, and `buildDemoRegistry` (`apps/web/src/data/seed-demo.ts`) already seeds the registry from demo Vista lines — but only `projectIds`, no financials/phase, and the view is buried under a "Columns & Formulas" metrics block.
- A `ProjectionItem` (`packages/projections/src/types.ts`) has `lineKey`, `keyParts` (`[phase, costType]`), `label`, `unitOfMeasure`, and TimeSlices; `F` is the forecast slice `{ qty, hours, upm, mpu, uc, cost }`. So a line's unit cost = `F.uc`, production = `F.upm`.
- Raw cost types are codes like `2Labor`; the friendly label mapping lives in `apps/web/src/lib/pnl.ts` (`COST_TYPE_LABELS`/`costTypeLabel`).
- Tests: `cd packages/projections && pnpm test` (vitest). Existing registry tests: `packages/projections/src/registry/__tests__/registry.test.ts`.
- Typecheck the app: `pnpm --filter ./apps/web exec tsc --noEmit`.

## File structure

| File | Responsibility |
|---|---|
| `packages/projections/src/registry/types.ts` | + `ServiceSource`; `ServiceItem.sources?` |
| `packages/projections/src/registry/registry.ts` | thread `sources`; selectors `rateRange`/`avgUpm`/`primaryPhase`; `classifyImport` |
| `packages/projections/src/registry/__tests__/registry.test.ts` | tests for all of the above |
| `apps/web/src/lib/cost-types.ts` | shared `COST_TYPE_LABELS`, `costTypeLabel`, `COST_TYPES`, `CostType` |
| `apps/web/src/lib/pnl.ts` | re-export from `cost-types.ts` (no behavior change) |
| `apps/web/src/lib/service-catalog-rows.ts` | `ServiceItem[]` → view rows |
| `apps/web/src/data/seed-demo.ts` | `buildDemoRegistry` captures `sources` |
| `apps/web/src/lib/store.ts` | actions: `setServiceItemUom`, `removeServiceItem`, `applyReconciliation` |
| `apps/web/src/components/service-detail-dialog.tsx` | drill-down + edit/merge/split |
| `apps/web/src/components/service-reconcile-dialog.tsx` | 3-bucket reconcile UI |
| `apps/web/src/routes/_dashboard/services.tsx` | Superior branch rework |

---

## Task 1: Add `ServiceSource` and thread it through `addServiceItem`

**Files:**
- Modify: `packages/projections/src/registry/types.ts`
- Modify: `packages/projections/src/registry/registry.ts`
- Test: `packages/projections/src/registry/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `registry.test.ts`:

```ts
import { addServiceItem } from '../registry';

describe('addServiceItem with sources', () => {
  const src = (over = {}) => ({
    projectId: 'p1', lineKey: 'B-300-|2Labor', phaseCode: 'B-300',
    qty: 100, cost: 1000, unitCost: 10, upm: 5, date: '2025-09-01', ...over,
  });

  it('stores the source on a new item', () => {
    const reg = addServiceItem(createRegistry('superior'), {
      canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
      sourceProjectId: 'p1', source: src(),
    });
    expect(reg.items[0]!.sources).toEqual([src()]);
    expect(reg.items[0]!.projectIds).toEqual(['p1']);
  });

  it('appends a source when the same item recurs in another project', () => {
    let reg = addServiceItem(createRegistry('superior'), {
      canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
      sourceProjectId: 'p1', source: src(),
    });
    reg = addServiceItem(reg, {
      canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
      sourceProjectId: 'p2', source: src({ projectId: 'p2', unitCost: 12 }),
    });
    expect(reg.items).toHaveLength(1);
    expect(reg.items[0]!.sources).toHaveLength(2);
    expect(reg.items[0]!.projectIds).toEqual(['p1', 'p2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/projections && pnpm test -- registry`
Expected: FAIL — `sources` is undefined / type error on `source`.

- [ ] **Step 3: Implement**

In `types.ts`, add and extend:

```ts
export interface ServiceSource {
  projectId: string;
  lineKey: string;
  phaseCode: string;
  qty: number;
  cost: number;
  unitCost: number;
  upm: number | null;
  date: string;
}

export interface ServiceItem {
  id: string;
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;
  aliases: ServiceAlias[];
  createdAt: string;
  projectIds: string[];
  sources?: ServiceSource[];
}
```

In `registry.ts`, change `addServiceItem`'s input and body. Replace the function with:

```ts
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
    const projectIds = existing.projectIds.includes(input.sourceProjectId)
      ? existing.projectIds
      : [...existing.projectIds, input.sourceProjectId];
    const sources = input.source ? [...(existing.sources ?? []), input.source] : existing.sources;
    if (projectIds === existing.projectIds && sources === existing.sources) return registry;
    return {
      ...registry,
      items: registry.items.map((item) =>
        item.id === existing.id ? { ...item, projectIds, sources } : item
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
```

Add the `ServiceSource` import to `registry.ts`'s type import block.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/projections && pnpm test -- registry`
Expected: PASS (existing registry tests still green).

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/registry/types.ts packages/projections/src/registry/registry.ts packages/projections/src/registry/__tests__/registry.test.ts
git commit -m "feat(registry): track per-line sources on ServiceItem"
```

---

## Task 2: Derived selectors — `rateRange`, `avgUpm`, `primaryPhase`

**Files:**
- Modify: `packages/projections/src/registry/registry.ts`
- Test: `packages/projections/src/registry/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { rateRange, avgUpm, primaryPhase } from '../registry';

describe('derived selectors', () => {
  const item = {
    id: 'i1', canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
    aliases: [], createdAt: '', projectIds: ['p1', 'p2', 'p3'],
    sources: [
      { projectId: 'p1', lineKey: 'a', phaseCode: 'B-300', qty: 10, cost: 100, unitCost: 6.79, upm: 16.7, date: '' },
      { projectId: 'p2', lineKey: 'b', phaseCode: 'B-310', qty: 10, cost: 120, unitCost: 7.62, upm: 15.2, date: '' },
      { projectId: 'p3', lineKey: 'c', phaseCode: 'B-300', qty: 10, cost: 110, unitCost: 0,    upm: null, date: '' },
    ],
  };

  it('rateRange ignores zero unit costs', () => {
    const r = rateRange(item);
    expect(r).toEqual({ lo: 6.79, avg: (6.79 + 7.62) / 2, hi: 7.62 });
  });
  it('avgUpm averages non-null only', () => {
    expect(avgUpm(item)).toBeCloseTo((16.7 + 15.2) / 2);
  });
  it('primaryPhase returns most frequent + varies flag', () => {
    expect(primaryPhase(item)).toEqual({ code: 'B-300', varies: true });
  });
  it('handles empty sources', () => {
    const empty = { ...item, sources: [] };
    expect(rateRange(empty)).toBeNull();
    expect(avgUpm(empty)).toBeNull();
    expect(primaryPhase(empty)).toEqual({ code: null, varies: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/projections && pnpm test -- registry`
Expected: FAIL — selectors not exported.

- [ ] **Step 3: Implement**

Append to `registry.ts`:

```ts
export function rateRange(item: ServiceItem): { lo: number; avg: number; hi: number } | null {
  const costs = (item.sources ?? []).map((s) => s.unitCost).filter((c) => c > 0);
  if (costs.length === 0) return null;
  const sum = costs.reduce((a, b) => a + b, 0);
  return { lo: Math.min(...costs), avg: sum / costs.length, hi: Math.max(...costs) };
}

export function avgUpm(item: ServiceItem): number | null {
  const upms = (item.sources ?? []).map((s) => s.upm).filter((u): u is number => u != null);
  if (upms.length === 0) return null;
  return upms.reduce((a, b) => a + b, 0) / upms.length;
}

export function primaryPhase(item: ServiceItem): { code: string | null; varies: boolean } {
  const codes = (item.sources ?? []).map((s) => s.phaseCode).filter(Boolean);
  if (codes.length === 0) return { code: null, varies: false };
  const counts = new Map<string, number>();
  for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = codes[0]!;
  for (const [c, n] of counts) if (n > (counts.get(best) ?? 0)) best = c;
  return { code: best, varies: counts.size > 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/projections && pnpm test -- registry`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/registry/registry.ts packages/projections/src/registry/__tests__/registry.test.ts
git commit -m "feat(registry): rateRange/avgUpm/primaryPhase selectors"
```

---

## Task 3: `classifyImport` — bucket incoming lines

**Files:**
- Modify: `packages/projections/src/registry/registry.ts`
- Test: `packages/projections/src/registry/__tests__/registry.test.ts`

Confidence rule (reusing `findFuzzyMatches`, which returns `confidence = matchedFields/3` for matches with ≥2 of {name, costType, unitOfMeasure}):
- **auto** — best match has all three fields (`confidence === 1`).
- **review** — best match exists but `confidence < 1` (e.g. fuzzy name, or UoM differs).
- **new** — no match with ≥2 fields.

- [ ] **Step 1: Write the failing test**

```ts
import { classifyImport } from '../registry';

describe('classifyImport', () => {
  let reg = createRegistry('superior');
  reg = addServiceItem(reg, { canonicalName: 'Excavation - Roadway', unitOfMeasure: 'CY', costType: '2Labor', sourceProjectId: 'p1' });

  const line = (over = {}) => ({ name: 'Excavation - Roadway', unitOfMeasure: 'CY', costType: '2Labor', lineKey: 'k', phaseCode: 'B-300', qty: 1, cost: 1, unitCost: 1, upm: null, date: '', ...over });

  it('exact match → auto', () => {
    const res = classifyImport(reg, [line()]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.id).toBe(reg.items[0]!.id);
  });
  it('UoM differs → review', () => {
    expect(classifyImport(reg, [line({ unitOfMeasure: 'LF' })])[0]!.bucket).toBe('review');
  });
  it('fuzzy name → review', () => {
    expect(classifyImport(reg, [line({ name: 'Roadway Excavation' })])[0]!.bucket).toBe('review');
  });
  it('no match → new', () => {
    expect(classifyImport(reg, [line({ name: 'Bridge Post-Tensioning', costType: '5SubCont' })])[0]!.bucket).toBe('new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/projections && pnpm test -- registry`
Expected: FAIL — `classifyImport` not exported.

- [ ] **Step 3: Implement**

Append to `registry.ts`:

```ts
export interface ImportLine {
  name: string;
  unitOfMeasure: string;
  costType: string;
  lineKey: string;
  phaseCode: string;
  qty: number;
  cost: number;
  unitCost: number;
  upm: number | null;
  date: string;
  projectId?: string;
}

export interface ClassifiedLine {
  line: ImportLine;
  bucket: 'auto' | 'review' | 'new';
  suggestion: ServiceItem | null;
  confidence: number;
}

export function classifyImport(registry: ServiceRegistry, lines: ImportLine[]): ClassifiedLine[] {
  return lines.map((line) => {
    const matches = findFuzzyMatches(registry, line.name, line.unitOfMeasure, line.costType)
      .sort((a, b) => b.confidence - a.confidence);
    const best = matches[0];
    if (!best) return { line, bucket: 'new' as const, suggestion: null, confidence: 0 };
    const bucket = best.confidence >= 1 ? ('auto' as const) : ('review' as const);
    return { line, bucket, suggestion: best.existingItem, confidence: best.confidence };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/projections && pnpm test -- registry`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/registry/registry.ts packages/projections/src/registry/__tests__/registry.test.ts
git commit -m "feat(registry): classifyImport buckets incoming lines"
```

---

## Task 4: Carry `sources` through merge/split; export new API

**Files:**
- Modify: `packages/projections/src/registry/registry.ts`
- Modify: `packages/projections/src/index.ts` (barrel — verify new exports are surfaced)
- Test: `packages/projections/src/registry/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('merge/split carry sources', () => {
  it('separateAlias moves the alias source to the new item', () => {
    let reg = addServiceItem(createRegistry('superior'), {
      canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor', sourceProjectId: 'p1',
      source: { projectId: 'p1', lineKey: 'a', phaseCode: 'B-300', qty: 1, cost: 1, unitCost: 6, upm: null, date: '' },
    });
    const id = reg.items[0]!.id;
    reg = mergeServiceItems(reg, id, { raw: 'Roadway Exc', normalizedTo: 'Excavation', sourceProjectId: 'p2', sourceUploadDate: '' });
    reg = separateAlias(reg, id, 'Roadway Exc');
    const split = reg.items.find((i) => i.canonicalName === 'Roadway Exc')!;
    expect(split.projectIds).toEqual(['p2']);
    expect(split.sources ?? []).toEqual([]); // alias carried no source rows
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes trivially)**

Run: `cd packages/projections && pnpm test -- registry`
Expected: PASS already for `separateAlias` (it sets `projectIds: [alias.sourceProjectId]`). Add `sources: []` to the new item it creates so the field is always present.

- [ ] **Step 3: Implement**

In `separateAlias`, the `newItem` object — add `sources: []` after `projectIds`. In `mergeServiceItems`, no source change needed (aliases don't carry source rows in v1). Confirm `packages/projections/src/index.ts` (or `registry/index.ts`) re-exports `rateRange`, `avgUpm`, `primaryPhase`, `classifyImport`, `ImportLine`, `ClassifiedLine`, `ServiceSource`, `removeServiceItem`. Add any missing exports.

- [ ] **Step 4: Run tests + typecheck**

Run: `cd packages/projections && pnpm test`
Run: `pnpm --filter ./apps/web exec tsc --noEmit`
Expected: PASS / no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/registry packages/projections/src/index.ts
git commit -m "feat(registry): always-present sources on split; export new API"
```

---

## Task 5: Shared cost-type label module

**Files:**
- Create: `apps/web/src/lib/cost-types.ts`
- Modify: `apps/web/src/lib/pnl.ts`

- [ ] **Step 1: Create the shared module**

Move the cost-type label map out of `pnl.ts`. Create `apps/web/src/lib/cost-types.ts`:

```ts
export const COST_TYPES = ['Labor', 'Material', 'Equipment', 'Subcontract', 'Other'] as const;
export type CostType = (typeof COST_TYPES)[number];

const COST_TYPE_LABELS: Record<string, CostType> = {
  '2Labor': 'Labor', '3Material': 'Material', '4Rental': 'Equipment',
  '5SubCont': 'Subcontract', '6OtherJC': 'Other', '8Parts': 'Material',
  '9Owned': 'Equipment', '10Health': 'Labor', '11Fuel': 'Equipment',
};

export function costTypeLabel(raw: string): CostType {
  return COST_TYPE_LABELS[raw] ?? 'Other';
}

export const COST_TYPE_COLOR: Record<CostType, string> = {
  Labor: '#536ed7', Material: '#53a9c4', Equipment: '#e7c341',
  Subcontract: '#dc8c46', Other: '#bba199',
};
```

- [ ] **Step 2: Update `pnl.ts` to re-use it**

In `pnl.ts`, delete the local `COST_TYPE_LABELS`, `costTypeLabel`, `COST_TYPES`, `CostType` definitions and instead:

```ts
import { COST_TYPES, costTypeLabel, type CostType } from './cost-types';
export { COST_TYPES, type CostType } from './cost-types';
```

(Keep `pnl.ts`'s public surface identical so `pnl-charts.tsx` and others still import `COST_TYPES`/`CostType` from `~/lib/pnl`.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter ./apps/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/cost-types.ts apps/web/src/lib/pnl.ts
git commit -m "refactor: extract shared cost-type labels"
```

---

## Task 6: `buildDemoRegistry` captures sources

**Files:**
- Modify: `apps/web/src/data/seed-demo.ts:588` (`buildDemoRegistry`)

- [ ] **Step 1: Update the seed builder**

Replace the loop body so each added line carries a `source`. The `seen` dedup (by `label|UoM`) is removed — `addServiceItem` dedups, and we want every line's source captured:

```ts
export function buildDemoRegistry(tenantId: string) {
  let reg = createRegistry(tenantId);
  for (const proj of DEMO_PROJECTION_PROJECTS) {
    const latest = proj.versions[proj.versions.length - 1];
    if (!latest) continue;
    for (const item of latest.items) {
      reg = addServiceItem(reg, {
        canonicalName: item.label,
        unitOfMeasure: item.unitOfMeasure,
        costType: item.keyParts[1] || '',
        sourceProjectId: proj.id,
        source: {
          projectId: proj.id,
          lineKey: item.lineKey,
          phaseCode: item.keyParts[0] ?? '',
          qty: item.F.qty,
          cost: item.F.cost,
          unitCost: item.F.uc,
          upm: item.F.upm || null,
          date: latest.createdAt,
        },
      });
    }
  }
  return reg;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter ./apps/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/data/seed-demo.ts
git commit -m "feat(services): seed registry with per-line sources"
```

---

## Task 7: View-row mapper

**Files:**
- Create: `apps/web/src/lib/service-catalog-rows.ts`

- [ ] **Step 1: Implement the mapper**

```ts
import type { ServiceItem } from '@repo/projections';
import { rateRange, avgUpm, primaryPhase } from '@repo/projections';
import { costTypeLabel, type CostType } from './cost-types';

export interface ServiceCatalogRow {
  id: string;
  name: string;
  costType: CostType;
  uom: string;
  projectCount: number;
  phaseCode: string | null;
  phaseVaries: boolean;
  rate: { lo: number; avg: number; hi: number } | null;
  avgUpm: number | null;
  sourceCount: number;
  item: ServiceItem;
}

export function toCatalogRows(items: ServiceItem[]): ServiceCatalogRow[] {
  return items.map((item) => {
    const phase = primaryPhase(item);
    return {
      id: item.id,
      name: item.canonicalName,
      costType: costTypeLabel(item.costType),
      uom: item.unitOfMeasure || '—',
      projectCount: item.projectIds.length,
      phaseCode: phase.code,
      phaseVaries: phase.varies,
      rate: rateRange(item),
      avgUpm: avgUpm(item),
      sourceCount: (item.sources ?? []).length,
      item,
    };
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter ./apps/web exec tsc --noEmit`
Expected: no errors (confirms `@repo/projections` exports the selectors from Task 4).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/service-catalog-rows.ts
git commit -m "feat(services): catalog view-row mapper"
```

---

## Task 8: Rework the Superior `/services` view

**Files:**
- Modify: `apps/web/src/routes/_dashboard/services.tsx`

- [ ] **Step 1: Remove the metrics block and split the Superior branch into a dedicated component**

In `services.tsx`: delete the `isSuperior && metrics.length > 0` "Columns & Formulas" `<div>` block entirely (metrics live at `/admin/metrics`). Remove the now-unused `metrics`/`metricsCatalog` references in the Superior branch. Keep the Stratagraph branch and its `ServiceRow`/columns exactly as-is.

Render the Superior branch via a new local component `SuperiorServices` (same file) that uses `toCatalogRows(registry.items)` and the columns below. Wire `DataListShell` with `onRowClick={(row) => setDetailRow(row)}`.

- [ ] **Step 2: Define the Superior columns**

```tsx
// columns for ServiceCatalogRow
const cols = [
  columnHelper.accessor('name', {
    id: 'name',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Phase & line item" />,
    cell: (info) => {
      const r = info.row.original;
      return (
        <div className="flex items-center gap-2">
          {r.phaseCode && (
            <Badge variant="outline" className="font-mono text-[10px]">{r.phaseCode}</Badge>
          )}
          <span className="text-sm font-medium">{info.getValue()}</span>
          {r.phaseVaries && <span className="text-[10px] italic text-muted-foreground">+ varies</span>}
        </div>
      );
    },
  }),
  columnHelper.accessor('costType', {
    id: 'costType',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Cost type" />,
    cell: (info) => {
      const t = info.getValue();
      return <span className="rounded px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: COST_TYPE_COLOR[t] }}>{t}</span>;
    },
    size: 130,
  }),
  columnHelper.accessor('uom', {
    id: 'uom', header: ({ column }) => <DataGridColumnHeader column={column} title="UoM" />,
    cell: (info) => <Badge variant="secondary" className="text-[10px] font-normal">{info.getValue()}</Badge>,
    size: 90,
  }),
  columnHelper.accessor('projectCount', {
    id: 'projects', header: ({ column }) => <DataGridColumnHeader column={column} title="Used in" />,
    cell: (info) => <span className="text-sm">{info.getValue()} project{info.getValue() === 1 ? '' : 's'}</span>,
    size: 110,
  }),
  columnHelper.accessor((r) => r.rate?.avg ?? 0, {
    id: 'rate',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Unit cost (lo–avg–hi)" className="justify-end" />,
    cell: (info) => {
      const r = info.row.original.rate;
      if (!r) return <div className="text-right text-muted-foreground">—</div>;
      const f = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
      return <div className="text-right text-sm tabular-nums"><span className="text-muted-foreground text-xs">{f(r.lo)} – </span><b>{f(r.avg)}</b><span className="text-muted-foreground text-xs"> – {f(r.hi)}</span></div>;
    },
    size: 200,
  }),
  columnHelper.accessor((r) => r.avgUpm ?? 0, {
    id: 'upm', header: ({ column }) => <DataGridColumnHeader column={column} title="Avg UPM" className="justify-end" />,
    cell: (info) => { const u = info.row.original.avgUpm; return <div className="text-right text-sm tabular-nums">{u == null ? '—' : u.toFixed(1)}</div>; },
    size: 100,
  }),
  columnHelper.accessor('sourceCount', {
    id: 'sources', header: ({ column }) => <DataGridColumnHeader column={column} title="Source lines" className="justify-end" />,
    cell: (info) => <div className="text-right text-sm">{info.getValue()}</div>,
    size: 110,
  }),
];
```

Add imports: `COST_TYPE_COLOR` from `~/lib/cost-types`, `toCatalogRows`/`ServiceCatalogRow` from `~/lib/service-catalog-rows`. Filters: a Cost-type filter (`COST_TYPES`) and a UoM filter (distinct `uom` values). `searchableKeys={['name']}`. `actions` includes an **Import & reconcile** button (opens the Task 10 dialog) alongside the existing "Clear All Data".

- [ ] **Step 3: Verify in the browser**

Ensure the dev server runs (`pnpm --filter ./apps/web dev`), then in the Chrome MCP open `http://localhost:5173/services` on the Superior tenant. Confirm: no "Columns & Formulas" block; rows show phase chip + name, cost-type badge, UoM, "used in", lo–avg–hi cost, avg UPM, source lines; search + filters work. Capture a screenshot.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/services.tsx
git commit -m "feat(services): Superior catalog view (drop metrics block)"
```

---

## Task 9: Service detail dialog (drill-down + edit/merge/split)

**Files:**
- Create: `apps/web/src/components/service-detail-dialog.tsx`
- Modify: `apps/web/src/routes/_dashboard/services.tsx` (render dialog; wire `detailRow` state)
- Modify: `apps/web/src/lib/store.ts` (add `setServiceItemUom`, `removeServiceItem` actions)

- [ ] **Step 1: Add store actions**

In `store.ts`, import `removeServiceItem` from `@repo/projections` (alias to avoid clash if needed) and add to the state interface + implementation:

```ts
setServiceItemUom: (itemId: string, uom: string) =>
  set((s) => ({
    serviceRegistry: {
      ...s.serviceRegistry,
      items: s.serviceRegistry.items.map((i) => (i.id === itemId ? { ...i, unitOfMeasure: uom } : i)),
    },
  })),
removeRegistryItem: (itemId: string) =>
  set((s) => ({ serviceRegistry: removeServiceItem(s.serviceRegistry, itemId) })),
```

(Rename and separate-alias store actions already exist — `editRegistryItemName` and `separateRegistryAlias`, used today in `services.tsx`. Confirm the exact action names by reading the store's registry action block (~`store.ts:1314-1322`) before wiring; use those names verbatim.)

- [ ] **Step 2: Build the dialog**

`service-detail-dialog.tsx` — a `Dialog` (from `@repo/ui`) opened when `row != null`. Shows: canonical name (editable via inline input → `editName`), cost-type badge, UoM (editable → `setServiceItemUom`), then a table of `row.item.sources` (phase code, project name, `$unitCost/uom`, UPM, date) and the aliases list with a "separate" (`separate`) action per alias. A "Remove from catalog" button calls `removeRegistryItem`. Project names resolve via `projectionProjects.find(p => p.id === source.projectId)?.name`.

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Button } from '@repo/ui';
import type { ServiceCatalogRow } from '~/lib/service-catalog-rows';
import { useStore } from '~/lib/store';
import { COST_TYPE_COLOR } from '~/lib/cost-types';

export function ServiceDetailDialog({ row, onClose }: { row: ServiceCatalogRow | null; onClose: () => void }) {
  const projects = useStore((s) => s.projectionProjects);
  const editName = useStore((s) => s.editRegistryItemName);   // existing store action
  const setUom = useStore((s) => s.setServiceItemUom);         // new (Task 9 step 1)
  const separate = useStore((s) => s.separateRegistryAlias);  // existing store action
  const remove = useStore((s) => s.removeRegistryItem);        // new (Task 9 step 1)
  if (!row) return null;
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{row.name}</DialogTitle></DialogHeader>
        {/* cost-type badge, editable name + UoM, sources table, aliases w/ separate, remove */}
        {/* ...render row.item.sources as a table; call editName/setUom/separate/remove ... */}
      </DialogContent>
    </Dialog>
  );
}
```

Fill in the body following the approved drill-down mockup (`.superpowers/brainstorm/.../catalog-screen-v2.html`): one source row per `row.item.sources`, columns Phase / Project / Unit cost / UPM / Date.

- [ ] **Step 3: Wire into services.tsx**

Add `const [detailRow, setDetailRow] = useState<ServiceCatalogRow | null>(null)`, pass `onRowClick={setDetailRow}` to the Superior `DataListShell`, and render `<ServiceDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />`.

- [ ] **Step 4: Verify in the browser**

Reload `/services` (Superior), click a row → dialog opens with sources, edit the name and UoM (confirm they persist in the table), separate an alias if present. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/service-detail-dialog.tsx apps/web/src/routes/_dashboard/services.tsx apps/web/src/lib/store.ts
git commit -m "feat(services): catalog detail dialog with edit/merge/split"
```

---

## Task 10: Import & reconcile dialog

**Files:**
- Create: `apps/web/src/components/service-reconcile-dialog.tsx`
- Modify: `apps/web/src/lib/store.ts` (add `applyReconciliation`)
- Modify: `apps/web/src/routes/_dashboard/services.tsx` (open from toolbar button)

- [ ] **Step 1: Add `applyReconciliation` to the store**

Takes the user's per-line decisions and folds them in. A decision is `{ line: ImportLine; action: 'match'; targetId: string } | { line; action: 'new' }`.

```ts
applyReconciliation: (decisions) =>
  set((s) => {
    let reg = s.serviceRegistry;
    for (const d of decisions) {
      const src = { projectId: d.line.projectId!, lineKey: d.line.lineKey, phaseCode: d.line.phaseCode, qty: d.line.qty, cost: d.line.cost, unitCost: d.line.unitCost, upm: d.line.upm, date: d.line.date };
      if (d.action === 'match') {
        const target = reg.items.find((i) => i.id === d.targetId);
        if (target) reg = addServiceItem(reg, { canonicalName: target.canonicalName, unitOfMeasure: target.unitOfMeasure, costType: target.costType, sourceProjectId: src.projectId, source: src });
      } else {
        reg = addServiceItem(reg, { canonicalName: d.line.name, unitOfMeasure: d.line.unitOfMeasure, costType: d.line.costType, sourceProjectId: src.projectId, source: src });
      }
    }
    return { serviceRegistry: reg };
  }),
```

(Matching by the target's canonical name+costType routes the source into the existing item via `addServiceItem`'s dedup.)

- [ ] **Step 2: Build the reconcile dialog**

`service-reconcile-dialog.tsx`. Props: `{ projectId: string; onClose: () => void }`. On open: build `ImportLine[]` from the chosen project's latest version items (same field mapping as Task 6), call `classifyImport(registry, lines)`, group into auto/review/new. Render the three sections from the approved mockup (`reconcile.html`): auto collapsed (count), review rows with Accept/New/Change-match, new rows with New/Match. Maintain a `decisions` map keyed by `lineKey`; default: auto→match(suggestion), review→match(suggestion), new→new. Footer "Add to catalog" calls `applyReconciliation(Object.values(decisions))` then `onClose()`. **No bulk accept-all, no auto-accept threshold** — auto items are pre-decided as match but still committed only on "Add to catalog".

- [ ] **Step 3: Open from the toolbar**

In `services.tsx`, the "Import & reconcile" action opens this dialog. If multiple projects exist, first prompt for which project (a simple select); for the demo's single project, open directly.

- [ ] **Step 4: Verify in the browser**

With the seed already populated, trigger reconcile for a project and confirm the three buckets render, decisions toggle, and "Add to catalog" updates the catalog (source counts / "used in" increase). Screenshot.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/service-reconcile-dialog.tsx apps/web/src/lib/store.ts apps/web/src/routes/_dashboard/services.tsx
git commit -m "feat(services): import & reconcile dialog"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full test + typecheck**

Run: `cd packages/projections && pnpm test`
Run: `pnpm --filter ./apps/web exec tsc --noEmit`
Expected: all green, no type errors.

- [ ] **Step 2: End-to-end browser pass**

On the Superior tenant `/services`: catalog renders with phase-led rows, cost ranges, used-in, UPM; row click opens detail with sources + edit/merge/split; Import & reconcile runs the 3-bucket flow and commits. Confirm `/admin/metrics` still shows the metrics catalog (it's the only place now). Confirm the Stratagraph tenant `/services` is unchanged (rate card). Screenshot each.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix(services): post-verification adjustments"
```

---

## Self-review notes (coverage check)

- Grain B (phase×cost-type) → `ServiceItem` keyed name+costType; phase carried per-source (Task 1/2). ✓
- Merged library, key name+cost-type, phase displayed not keyed → `addServiceItem` dedup + `primaryPhase`/`varies` (Task 2). ✓
- Observed range only → `rateRange`; no sell-rate field. ✓
- Reconcile, human-confirmed, no auto-accept/accept-all → `classifyImport` + dialog commits only on "Add to catalog" (Task 3/10). ✓
- Remove metrics duplication from /services → Task 8 step 1. ✓
- Drill-down (dialog, since shell has no inline expand) → Task 9. ✓
- Stratagraph branch untouched; `/admin/metrics` unaffected → Task 8 / Task 11. ✓
