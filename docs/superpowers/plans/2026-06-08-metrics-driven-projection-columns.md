# Metrics-Driven Projection Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the metrics catalog the single source of truth for the projections table — columns, headers, group colors, editability (with a green visual cue), and per-row values all derive from `metricsCatalog`.

**Architecture:** A pure value resolver (with a formula evaluator) in `@repo/projections` returns any metric's value for any line, bridging the legacy fixed `TimeSlice` grid and a new generic `values` map. The table and Columns picker generate themselves from the catalog via a column-descriptor builder. Editing writes an override the resolver prefers over computed values.

**Tech Stack:** TypeScript 5, Vitest, React 19, Zustand 5, TanStack Table (`@repo/ui` DataGrid), Tailwind v4, `@repo/projections`.

**Spec:** `docs/superpowers/specs/2026-06-08-metrics-driven-projection-columns-design.md`

---

## File Structure

- **Create** `packages/projections/src/metrics/resolver.ts` — `evalFormula`, `classifyMetric`, `resolveMetricValue`, `SLICE_BY_GROUP`.
- **Create** `packages/projections/src/metrics/resolver.test.ts` — unit tests.
- **Create** `packages/projections/src/metrics/columns.ts` — `buildMetricColumns` (catalog → ordered column descriptors).
- **Create** `packages/projections/src/metrics/columns.test.ts` — unit tests.
- **Modify** `packages/projections/src/types.ts` — add `ProjectionItem.values?`.
- **Modify** `packages/projections/src/metrics/types.ts` — add optional `Metric.format`.
- **Modify** `packages/projections/src/metrics/index.ts` (or `packages/projections/src/index.ts`) — export resolver + columns.
- **Modify** `packages/projections/src/engine.ts` — add `updateMetricValue`, `clearMetricOverride`.
- **Modify** `packages/projections/src/adapters/vista.ts` — populate `values` for extended uploaded metrics.
- **Modify** `apps/web/src/components/projection-column-picker.tsx` — catalog-driven picker + id-keyed visibility.
- **Modify** `apps/web/src/components/projection-table.tsx` — catalog-driven metric columns, renderer registry, editable styling.
- **Modify** `apps/web/src/routes/_dashboard/projections.$projectId.tsx` — pass catalog, add metric-value update handler.
- **Modify** `apps/web/src/components/projection-summary-rows.tsx` — resolve totals via resolver.

Notes on conventions: tests are colocated `*.test.ts` (see `packages/projections/src/metrics/catalog.test.ts`). Run a single package's tests with `pnpm --filter @repo/projections test`. The web app uses Vitest too (`pnpm --filter @repo/web test`).

---

## Task 1: Formula evaluator

**Files:**
- Create: `packages/projections/src/metrics/resolver.ts`
- Test: `packages/projections/src/metrics/resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/projections/src/metrics/resolver.test.ts
import { describe, it, expect } from 'vitest';
import { evalFormula } from './resolver';

describe('evalFormula', () => {
  // resolve(token) returns the numeric value for a SLICE.field reference
  const resolve = (token: string): number =>
    ({ 'F.cost': 1000, 'CTD.cost': 400, 'F.qty': 200, 'F.hours': 0 }[token] ?? 0);

  it('evaluates arithmetic with references', () => {
    expect(evalFormula('F.cost - CTD.cost', resolve)).toBe(600);
  });

  it('respects precedence and parentheses', () => {
    expect(evalFormula('(F.cost - CTD.cost) / 2', resolve)).toBe(300);
  });

  it('returns 0 on divide-by-zero', () => {
    expect(evalFormula('F.qty / F.hours', resolve)).toBe(0);
  });

  it('returns 0 for an unknown/zero reference instead of NaN', () => {
    expect(evalFormula('UNKNOWN.thing * 2', resolve)).toBe(0);
  });

  it('handles a bare reference', () => {
    expect(evalFormula('F.cost', resolve)).toBe(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/projections test -- resolver`
Expected: FAIL — `evalFormula is not a function` / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/projections/src/metrics/resolver.ts

/** Matches SLICE.field reference tokens, e.g. F.cost, CTD.qty, LMF.cost. */
const REF_TOKEN = /[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*/g;

/**
 * Evaluate an arithmetic formula whose operands are SLICE.field references.
 * `resolve` maps each reference token to a number. Division by zero and any
 * non-finite result collapse to 0 (matching the engine's derived-field rules).
 */
export function evalFormula(
  formula: string,
  resolve: (token: string) => number,
): number {
  // Substitute every reference token with its resolved numeric value.
  const substituted = formula.replace(REF_TOKEN, (token) => {
    const v = resolve(token);
    return Number.isFinite(v) ? `(${v})` : '(0)';
  });

  // The substituted string must now be numbers + operators only.
  if (!/^[\d\s+\-*/().]*$/.test(substituted)) return 0;

  try {
    // eslint-disable-next-line no-new-func
    const result = Number(new Function(`"use strict"; return (${substituted});`)());
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/projections test -- resolver`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/metrics/resolver.ts packages/projections/src/metrics/resolver.test.ts
git commit -m "feat(projections): formula evaluator for metric references"
```

---

## Task 2: ProjectionItem.values + Metric.format

**Files:**
- Modify: `packages/projections/src/types.ts`
- Modify: `packages/projections/src/metrics/types.ts`

- [ ] **Step 1: Add the generic value store to ProjectionItem**

In `packages/projections/src/types.ts`, inside `interface ProjectionItem`, after the `stale: boolean;` field (last field), add:

```ts
  /**
   * Values for catalog metrics that don't map to a standard TimeSlice cell
   * (extended metrics), AND user-entered overrides for any editable metric.
   * Keyed by metric id. Read through the resolver, never directly.
   */
  values?: Record<string, number>;
```

- [ ] **Step 2: Add the optional format hint to Metric**

In `packages/projections/src/metrics/types.ts`, inside `interface Metric`, after `editable?: boolean;`, add:

```ts
  /** Display format. Defaults are derived from `field` when omitted. */
  format?: 'currency' | 'number' | 'percent';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @repo/projections typecheck`
Expected: PASS (no errors — both fields are optional, nothing else changes).

- [ ] **Step 4: Commit**

```bash
git add packages/projections/src/types.ts packages/projections/src/metrics/types.ts
git commit -m "feat(projections): generic per-row metric value store + format hint"
```

---

## Task 3: Metric classification + slice mapping

**Files:**
- Modify: `packages/projections/src/metrics/resolver.ts`
- Test: `packages/projections/src/metrics/resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `resolver.test.ts`:

```ts
import { classifyMetric, SLICE_BY_GROUP } from './resolver';
import type { Metric } from './types';

const m = (over: Partial<Metric>): Metric => ({
  id: 'x', name: 'X', aliases: [], group: 'F', field: 'qty',
  type: 'vista-upload', formula: null, formulaRefs: [], ...over,
});

describe('classifyMetric', () => {
  it('maps a standard group+numeric field to a TimeSlice cell', () => {
    expect(classifyMetric(m({ group: 'F', field: 'qty' })))
      .toEqual({ kind: 'standard', slice: 'F', field: 'qty' });
  });

  it('maps the OE group to the Est slice', () => {
    expect(classifyMetric(m({ group: 'OE', field: 'cost' })))
      .toEqual({ kind: 'standard', slice: 'Est', field: 'cost' });
  });

  it('treats an unknown group as extended', () => {
    expect(classifyMetric(m({ group: 'PRJ', field: 'cost' })).kind).toBe('extended');
  });

  it('treats a null group as extended', () => {
    expect(classifyMetric(m({ group: null, field: 'cost' })).kind).toBe('extended');
  });

  it('treats an identity field as identity', () => {
    expect(classifyMetric(m({ group: 'F', field: 'description' })).kind).toBe('identity');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/projections test -- resolver`
Expected: FAIL — `classifyMetric is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `packages/projections/src/metrics/resolver.ts`:

```ts
import type { Metric } from './types';

/** Group id → TimeSlice key. OE is stored under the `Est` slice. */
export const SLICE_BY_GROUP: Record<string, 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'> = {
  CTP: 'CTP', CTD: 'CTD', CTC: 'CTC', F: 'F', OE: 'Est',
};

const NUMERIC_SLICE_FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;
const IDENTITY_FIELDS = ['service', 'costType', 'description', 'unitOfMeasure'] as const;

export type MetricClass =
  | { kind: 'standard'; slice: 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'; field: 'qty' | 'hours' | 'upm' | 'mpu' | 'uc' | 'cost' }
  | { kind: 'extended' }
  | { kind: 'identity' };

/**
 * Decide how a metric's value is stored:
 * - `identity`: row-defining text field, not a value column.
 * - `standard`: maps onto an existing TimeSlice cell (read item[slice][field]).
 * - `extended`: lives in item.values[metric.id].
 */
export function classifyMetric(metric: Metric): MetricClass {
  if ((IDENTITY_FIELDS as readonly string[]).includes(metric.field)) {
    return { kind: 'identity' };
  }
  const slice = metric.group ? SLICE_BY_GROUP[metric.group] : undefined;
  if (slice && (NUMERIC_SLICE_FIELDS as readonly string[]).includes(metric.field)) {
    return { kind: 'standard', slice, field: metric.field as MetricClass extends { kind: 'standard' } ? never : never };
  }
  return { kind: 'extended' };
}
```

> Note: the `field` cast above is awkward; simplify by returning `field: metric.field as 'qty'|'hours'|'upm'|'mpu'|'uc'|'cost'`.

Replace the standard branch return with:

```ts
  if (slice && (NUMERIC_SLICE_FIELDS as readonly string[]).includes(metric.field)) {
    return { kind: 'standard', slice, field: metric.field as 'qty' | 'hours' | 'upm' | 'mpu' | 'uc' | 'cost' };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/projections test -- resolver`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/metrics/resolver.ts packages/projections/src/metrics/resolver.test.ts
git commit -m "feat(projections): metric classification (standard/extended/identity)"
```

---

## Task 4: resolveMetricValue

**Files:**
- Modify: `packages/projections/src/metrics/resolver.ts`
- Test: `packages/projections/src/metrics/resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `resolver.test.ts`:

```ts
import { resolveMetricValue, type ResolveCtx } from './resolver';
import type { ProjectionItem } from '../types';
import type { MetricsCatalog } from './types';

const emptySlice = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
const item = (over: Partial<ProjectionItem>): ProjectionItem => ({
  lineKey: 'B-100-|2Labor', keyParts: ['B-100-', '2Labor'], label: 'Traffic', unitOfMeasure: 'MOS',
  CTP: { ...emptySlice }, CTD: { ...emptySlice, cost: 400 }, CTC: { ...emptySlice },
  F: { ...emptySlice, qty: 186, cost: 1000 }, Est: { ...emptySlice },
  estVar: 0, comp: 0, prevForecast: 0, calcHrs: 0, wsRisk: 0, isNew: false, stale: false, ...over,
});

const catalog: MetricsCatalog = {
  tenantId: 'superior',
  groups: [],
  metrics: [
    { id: 'f-qty', name: 'F Qty', aliases: [], group: 'F', field: 'qty', type: 'vista-upload', formula: null, formulaRefs: [], editable: true },
    { id: 'f-cost', name: 'F Cost', aliases: [], group: 'F', field: 'cost', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'ctd-cost', name: 'CTD Cost', aliases: [], group: 'CTD', field: 'cost', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'left-spend', name: 'Left To Spend', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost - CTD.cost', formulaRefs: ['f-cost', 'ctd-cost'] },
    { id: 'lmf', name: 'New Projection', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'], editable: true },
  ],
};
const ctx = (over: Partial<ResolveCtx> = {}): ResolveCtx => ({ catalog, prevItems: [], ...over });

describe('resolveMetricValue', () => {
  const byId = (id: string) => catalog.metrics.find((m) => m.id === id)!;

  it('reads a standard cell', () => {
    expect(resolveMetricValue(item({}), byId('f-cost'), ctx())).toBe(1000);
  });

  it('evaluates a formula metric from other metrics', () => {
    expect(resolveMetricValue(item({}), byId('left-spend'), ctx())).toBe(600);
  });

  it('prefers a user override on an editable formula metric', () => {
    const it2 = item({ values: { lmf: 1234 } });
    expect(resolveMetricValue(it2, byId('lmf'), ctx())).toBe(1234);
  });

  it('falls back to the formula when no override is present', () => {
    expect(resolveMetricValue(item({}), byId('lmf'), ctx())).toBe(1000);
  });

  it('reads an editable standard override from values', () => {
    const it2 = item({ values: { 'f-qty': 372 } });
    expect(resolveMetricValue(it2, byId('f-qty'), ctx())).toBe(372);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/projections test -- resolver`
Expected: FAIL — `resolveMetricValue is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `packages/projections/src/metrics/resolver.ts`:

```ts
import type { ProjectionItem } from '../types';
import type { MetricsCatalog } from './types';

export interface ResolveCtx {
  catalog: MetricsCatalog;
  /** Previous version's items, for carry-over metrics. */
  prevItems: ProjectionItem[];
  /** Internal: cycle-detection set (metric ids currently resolving). */
  _visiting?: Set<string>;
}

/** Find the metric whose group maps to `slice` and whose field is `field`. */
function metricForSliceField(
  catalog: MetricsCatalog, slice: string, field: string,
): Metric | undefined {
  const groupId = Object.keys(SLICE_BY_GROUP).find((g) => SLICE_BY_GROUP[g] === slice);
  return catalog.metrics.find((m) => m.group === groupId && m.field === field);
}

/**
 * Resolve a single metric's value for one line.
 * Precedence: editable override → type-based resolution.
 */
export function resolveMetricValue(
  item: ProjectionItem,
  metric: Metric,
  ctx: ResolveCtx,
): number {
  // 1. Editable override always wins.
  if (metric.editable && item.values && metric.id in item.values) {
    return item.values[metric.id];
  }

  const cls = classifyMetric(metric);
  if (cls.kind === 'identity') return 0;

  // 2. Standard cell read.
  if (cls.kind === 'standard') {
    return item[cls.slice][cls.field] ?? 0;
  }

  // 3. Extended: by type.
  if (metric.type === 'formula' && metric.formula) {
    const visiting = ctx._visiting ?? new Set<string>();
    if (visiting.has(metric.id)) return 0; // cycle guard
    visiting.add(metric.id);
    const childCtx: ResolveCtx = { ...ctx, _visiting: visiting };
    const value = evalFormula(metric.formula, (token) => {
      const [sliceTok, fieldTok] = token.split('.');
      // LMF.cost → the New Projection metric; otherwise the slice/field metric.
      const slice = SLICE_BY_GROUP[sliceTok] ?? (sliceTok === 'LMF' ? null : undefined);
      const ref =
        sliceTok === 'LMF'
          ? ctx.catalog.metrics.find((mm) => mm.id === 'lmf')
          : slice
            ? metricForSliceField(ctx.catalog, slice, fieldTok)
            : undefined;
      return ref ? resolveMetricValue(item, ref, childCtx) : 0;
    });
    visiting.delete(metric.id);
    return value;
  }

  if (metric.type === 'carry-over') {
    const src = metric.carryOverSource ?? metric.id;
    const prev = ctx.prevItems.find((p) => p.lineKey === item.lineKey);
    if (prev?.values && src in prev.values) return prev.values[src];
    const srcMetric = ctx.catalog.metrics.find((mm) => mm.id === src);
    if (prev && srcMetric) return resolveMetricValue(prev, srcMetric, { ...ctx, prevItems: [] });
    return 0;
  }

  // vista-upload extended metric with no standard cell → generic store.
  return item.values?.[metric.id] ?? 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/projections test -- resolver`
Expected: PASS.

- [ ] **Step 5: Export the resolver**

In `packages/projections/src/index.ts`, add (near the other metrics exports):

```ts
export * from './metrics/resolver';
```

Run: `pnpm --filter @repo/projections typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/projections/src/metrics/resolver.ts packages/projections/src/metrics/resolver.test.ts packages/projections/src/index.ts
git commit -m "feat(projections): resolveMetricValue with override precedence + formula/carry-over"
```

---

## Task 5: Column descriptor builder

**Files:**
- Create: `packages/projections/src/metrics/columns.ts`
- Test: `packages/projections/src/metrics/columns.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/projections/src/metrics/columns.test.ts
import { describe, it, expect } from 'vitest';
import { buildMetricColumns } from './columns';
import type { MetricsCatalog } from './types';

const catalog: MetricsCatalog = {
  tenantId: 'superior',
  groups: [
    { id: 'F', name: 'Forecast', color: '#92cddc' },
    { id: 'PRJ', name: 'Projection', color: '#f2dcdb' },
  ],
  metrics: [
    { id: 'f-qty', name: 'F Qty', aliases: [], group: 'F', field: 'qty', type: 'vista-upload', formula: null, formulaRefs: [], editable: true },
    { id: 'f-cost', name: 'F Cost', aliases: [], group: 'F', field: 'cost', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'lmf', name: 'New Projection', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'] },
    { id: 'desc', name: 'Description', aliases: [], group: 'F', field: 'description', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'risk', name: 'Risk', aliases: [], group: null, field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'] },
  ],
};

describe('buildMetricColumns', () => {
  const cols = buildMetricColumns(catalog);

  it('excludes identity-field metrics', () => {
    expect(cols.find((c) => c.id === 'desc')).toBeUndefined();
  });

  it('orders columns by group order, null group last', () => {
    expect(cols.map((c) => c.id)).toEqual(['f-qty', 'f-cost', 'lmf', 'risk']);
  });

  it('carries name, group color and editable flag', () => {
    const c = cols.find((c) => c.id === 'f-qty')!;
    expect(c.name).toBe('F Qty');
    expect(c.color).toBe('#92cddc');
    expect(c.editable).toBe(true);
  });

  it('derives currency format for cost fields and number otherwise', () => {
    expect(cols.find((c) => c.id === 'f-cost')!.format).toBe('currency');
    expect(cols.find((c) => c.id === 'f-qty')!.format).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/projections test -- columns`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// packages/projections/src/metrics/columns.ts
import type { Metric, MetricsCatalog } from './types';
import { classifyMetric } from './resolver';

export interface MetricColumn {
  id: string;
  name: string;
  group: string | null;
  color: string | null;
  editable: boolean;
  format: 'currency' | 'number' | 'percent';
  metric: Metric;
}

function deriveFormat(metric: Metric): 'currency' | 'number' | 'percent' {
  if (metric.format) return metric.format;
  if (metric.field === 'cost' || metric.field === 'uc') return 'currency';
  if (metric.id.endsWith('-pct')) return 'percent';
  return 'number';
}

/**
 * Build the ordered list of value columns from the catalog.
 * Identity-field metrics are excluded. Order = group order from the catalog,
 * with `group: null` metrics appended last (the "Analytics" section).
 */
export function buildMetricColumns(catalog: MetricsCatalog): MetricColumn[] {
  const order = new Map<string, number>();
  catalog.groups.forEach((g, i) => order.set(g.id, i));
  const colorOf = (gid: string | null) =>
    gid ? catalog.groups.find((g) => g.id === gid)?.color ?? null : null;

  const value = catalog.metrics.filter((m) => classifyMetric(m).kind !== 'identity');

  const rank = (m: Metric) => (m.group && order.has(m.group) ? order.get(m.group)! : Number.MAX_SAFE_INTEGER);
  // Stable sort by group rank; preserve catalog order within a group.
  return value
    .map((metric, i) => ({ metric, i }))
    .sort((a, b) => rank(a.metric) - rank(b.metric) || a.i - b.i)
    .map(({ metric }) => ({
      id: metric.id,
      name: metric.name,
      group: metric.group,
      color: colorOf(metric.group),
      editable: metric.editable ?? false,
      format: deriveFormat(metric),
      metric,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/projections test -- columns`
Expected: PASS.

- [ ] **Step 5: Export + commit**

In `packages/projections/src/index.ts` add `export * from './metrics/columns';`. Then:

```bash
git add packages/projections/src/metrics/columns.ts packages/projections/src/metrics/columns.test.ts packages/projections/src/index.ts
git commit -m "feat(projections): catalog → ordered column descriptors"
```

---

## Task 6: Engine — updateMetricValue / clearMetricOverride

**Files:**
- Modify: `packages/projections/src/engine.ts`
- Test: `packages/projections/src/engine.test.ts` (create if absent — check first with `ls packages/projections/src/engine.test.ts`)

- [ ] **Step 1: Write the failing test**

Create/append `packages/projections/src/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { updateMetricValue, clearMetricOverride } from './engine';
import { resolveMetricValue } from './metrics/resolver';
import type { ProjectionProject } from './types';
import type { Metric, MetricsCatalog } from './metrics/types';

// Minimal project with one version holding one item.
const emptySlice = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
const baseItem = {
  lineKey: 'K', keyParts: ['K'], label: 'L', unitOfMeasure: '',
  CTP: { ...emptySlice }, CTD: { ...emptySlice, cost: 400 }, CTC: { ...emptySlice },
  F: { ...emptySlice, qty: 186, cost: 1000 }, Est: { ...emptySlice },
  estVar: 0, comp: 0, prevForecast: 0, calcHrs: 0, wsRisk: 0, isNew: false, stale: false,
};
const project = (): ProjectionProject => ({
  // fill required ProjectionProject fields minimally; copy shape from an existing fixture
  id: 'p', jobNumber: '1', name: 'N', customer: '', projectManager: '',
  versions: [{ id: 'v1', label: 'V1', uploadedAt: '', items: [structuredClone(baseItem)] }],
  draft: null, comments: {}, alertResolutions: [], financialSummary: null,
} as unknown as ProjectionProject);

const lmf: Metric = { id: 'lmf', name: 'New Projection', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'], editable: true };
const catalog: MetricsCatalog = { tenantId: 'superior', groups: [], metrics: [lmf] };

describe('updateMetricValue', () => {
  it('stores an override in the draft and the resolver returns it', () => {
    const p = updateMetricValue(project(), 'K', lmf, 1234);
    const item = p.draft!.items.find((i) => i.lineKey === 'K')!;
    expect(resolveMetricValue(item, lmf, { catalog, prevItems: [] })).toBe(1234);
  });

  it('clearMetricOverride reverts to the computed value', () => {
    let p = updateMetricValue(project(), 'K', lmf, 1234);
    p = clearMetricOverride(p, 'K', lmf.id);
    const item = p.draft!.items.find((i) => i.lineKey === 'K')!;
    expect(resolveMetricValue(item, lmf, { catalog, prevItems: [] })).toBe(1000);
  });
});
```

> If `ProjectionProject`'s exact shape differs, copy the construction from an existing test/fixture (`grep -rn "versions:" packages/projections/src/*.test.ts`) rather than guessing fields.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/projections test -- engine`
Expected: FAIL — `updateMetricValue is not a function`.

- [ ] **Step 3: Write the implementation**

In `packages/projections/src/engine.ts`, add after `updateForecast` (around line 407). Reuse the existing `startDraft`, `findItem`, `updateDraftItem` helpers already used by `updateForecast`:

```ts
import { classifyMetric } from './metrics/resolver';
import type { Metric } from './metrics/types';

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
  if (cls.kind === 'standard' && cls.slice === 'F' && (cls.field === 'qty' || cls.field === 'hours' || cls.field === 'cost')) {
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
  return updateDraftItem(p, key, { values });
}
```

> Verify `startDraft`, `findItem`, `updateDraftItem` are in scope in `engine.ts` (they are — `updateForecast` uses them). If `updateDraftItem`'s patch type is strict, widen it to accept `Partial<ProjectionItem>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/projections test -- engine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/engine.ts packages/projections/src/engine.test.ts
git commit -m "feat(projections): updateMetricValue + clearMetricOverride (editable overrides)"
```

---

## Task 7: Adapter populates extended uploaded values

**Files:**
- Modify: `packages/projections/src/adapters/vista.ts`
- Test: `packages/projections/src/adapters/vista.test.ts` (append; confirm it exists with `ls`)

- [ ] **Step 1: Read the adapter signature**

Run: `grep -n "export function\|vistaField\|catalog\|function ingest\|TimeSlice" packages/projections/src/adapters/vista.ts | head -30`
Identify the function that builds `ProjectionItem`s and whether it already receives the catalog. The goal: after standard cells are filled, for each catalog metric where `classifyMetric(metric).kind === 'extended'` and `metric.type === 'vista-upload'` and `metric.vistaField` matches an uploaded column header, set `item.values[metric.id]` to the parsed number.

- [ ] **Step 2: Write the failing test**

Append to `packages/projections/src/adapters/vista.test.ts` a test that feeds a row with an extra column matching an extended metric's `vistaField` and asserts `item.values[metricId]` is populated. Model the input shape on the existing tests in that file (copy their fixture/builder). Example skeleton:

```ts
it('populates values for an extended vista-upload metric', () => {
  // Arrange: a catalog with an extended metric mapping vistaField "Bond Cost" → 'bond-cost'
  // and an uploaded sheet containing a "Bond Cost" column with value 5000 for line K.
  // Act: run the adapter with the catalog.
  // Assert: item.values['bond-cost'] === 5000
});
```

Fill in using the file's existing helpers (do not invent a new input format).

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter @repo/projections test -- vista`
Expected: FAIL.

- [ ] **Step 4: Implement**

In the item-building loop of `vista.ts`, after the `TimeSlice`s are assigned, add (guarded so it's a no-op when no catalog is passed):

```ts
if (catalog) {
  for (const metric of catalog.metrics) {
    if (metric.type !== 'vista-upload' || !metric.vistaField) continue;
    if (classifyMetric(metric).kind !== 'extended') continue;
    const raw = row[headerIndex[metric.vistaField]]; // adapt to the file's row/column access
    const n = parseNumber(raw); // reuse the file's existing number parser
    if (Number.isFinite(n)) {
      item.values = { ...(item.values ?? {}), [metric.id]: n };
    }
  }
}
```

Add `import { classifyMetric } from '../metrics/resolver';` and thread an optional `catalog?: MetricsCatalog` parameter through the public adapter function(s). Update callers in `apps/web/src/lib/store.ts` ingest paths to pass `metricsCatalog`.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @repo/projections test -- vista`
Expected: PASS. Then `pnpm --filter @repo/projections test` (full package) → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/projections/src/adapters/vista.ts packages/projections/src/adapters/vista.test.ts apps/web/src/lib/store.ts
git commit -m "feat(projections): adapter populates extended uploaded metric values"
```

---

## Task 8: Catalog-driven Columns picker

**Files:**
- Modify: `apps/web/src/components/projection-column-picker.tsx`

- [ ] **Step 1: Rewrite the visibility hook to key by metric id**

Replace the body of `apps/web/src/components/projection-column-picker.tsx` with a catalog-driven version. Key points (preserve SSR-safe hydration from the current file):

```tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, Badge } from '@repo/ui';
import { Columns3 } from 'lucide-react';
import type { MetricsCatalog } from '@repo/projections';
import { buildMetricColumns } from '@repo/projections';

export type ColumnVisibility = Record<string, boolean>;
const STORAGE_KEY = 'sc-visible-columns-v2'; // v2 = metric-id keys (old slice-field keys ignored)

// Default-visible metric ids (replicates the prior default layout).
const DEFAULT_VISIBLE = new Set([
  'ctd-cost', 'ctd-hrs', 'f-qty', 'f-hrs', 'f-uc', 'oe-cost', 'lmf',
]);

function defaultsFor(catalog: MetricsCatalog): ColumnVisibility {
  const vis: ColumnVisibility = {};
  for (const c of buildMetricColumns(catalog)) vis[c.id] = DEFAULT_VISIBLE.has(c.id);
  return vis;
}

export function useColumnVisibility(catalog: MetricsCatalog) {
  const [vis, setVis] = useState<ColumnVisibility>(() => defaultsFor(catalog));
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const base = defaultsFor(catalog);
      setVis(stored ? { ...base, ...JSON.parse(stored) } : base);
    } catch { setVis(defaultsFor(catalog)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New metrics not yet in `vis` default to VISIBLE.
  useEffect(() => {
    setVis((prev) => {
      let changed = false; const next = { ...prev };
      for (const c of buildMetricColumns(catalog)) {
        if (!(c.id in next)) { next[c.id] = true; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [catalog]);

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
  }, [vis]);

  const toggle = (id: string) => setVis((p) => ({ ...p, [id]: !p[id] }));
  const isVisible = (id: string) => vis[id] ?? true;
  const reset = () => setVis(defaultsFor(catalog));
  const activeCount = Object.values(vis).filter(Boolean).length;
  return { vis, toggle, isVisible, reset, activeCount };
}
```

- [ ] **Step 2: Rewrite the ColumnPicker UI to render groups from the catalog**

```tsx
export function ColumnPicker({ catalog, vis, onToggle, onReset, activeCount }: {
  catalog: MetricsCatalog;
  vis: ColumnVisibility;
  onToggle: (id: string) => void;
  onReset: () => void;
  activeCount: number;
}) {
  const cols = buildMetricColumns(catalog);
  const groups = [...catalog.groups, { id: '__null', name: 'Analytics', color: '#e5e5e5' }];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Columns3 className="size-3.5" /> Columns
          <Badge variant="secondary" className="ml-1 px-1.5 text-xs">{activeCount}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 max-h-[70vh] overflow-auto">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Visible Columns</span>
          <Button size="sm" variant="ghost" onClick={onReset} className="text-xs h-7">Reset</Button>
        </div>
        <div className="space-y-3">
          {groups.map((g) => {
            const groupCols = cols.filter((c) => (c.group ?? '__null') === g.id);
            if (groupCols.length === 0) return null;
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="size-3 rounded-sm" style={{ background: g.color }} />
                  {g.name}
                </div>
                <div className="ml-5 flex flex-wrap gap-1.5">
                  {groupCols.map((c) => {
                    const on = vis[c.id] ?? true;
                    return (
                      <button key={c.id} onClick={() => onToggle(c.id)}
                        className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${on ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @repo/web typecheck`
Expected: errors only at the call sites in `projection-table.tsx` (fixed in Task 9). The picker file itself compiles.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/projection-column-picker.tsx
git commit -m "feat(web): catalog-driven Columns picker keyed by metric id"
```

---

## Task 9: Catalog-driven metric columns in the table

**Files:**
- Modify: `apps/web/src/components/projection-table.tsx`

- [ ] **Step 1: Pull the catalog and resolver context into the component**

At the top of `ProjectionTable` (after `const catalog = useStore((s) => s.metricsCatalog);` — already present at line 188), add:

```tsx
import { buildMetricColumns, resolveMetricValue, type ResolveCtx } from '@repo/projections';
// inside the component:
const colVis = useColumnVisibility(catalog); // changed: pass catalog
const prevItems = useMemo(() => {
  const versions = project.versions;
  const prev = project.draft ? versions[versions.length - 1] : versions[versions.length - 2];
  return prev?.items ?? [];
}, [project]);
const resolveCtx = useMemo<ResolveCtx>(() => ({ catalog, prevItems }), [catalog, prevItems]);
```

- [ ] **Step 2: Add the editable cell styling + renderer registry**

Update `EditableCell` (line 62) to accept an `editable`-styling wrapper. Add a shared green class constant near the top of the file:

```tsx
const EDITABLE_CELL_CLASS = 'bg-[#eef6f2] text-[#2c6450]'; // Option A tint (brand sage)
const EDITABLE_HEADER_CLASS = 'bg-[#e3f0ea]';
```

Add a render helper that maps a `MetricColumn` to a cell renderer:

```tsx
function renderMetricCell(col: ReturnType<typeof buildMetricColumns>[number], value: number) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  if (col.format === 'currency') return formatCurrency(value);
  if (col.format === 'percent') return formatPercent(value);
  return formatNumber(value);
}
```

- [ ] **Step 3: Replace the `sliceColumns` memo with a catalog-driven builder**

Delete the old `metricLookup` (lines 190–202) and `sliceColumns` (lines 204–295). Replace with:

```tsx
const metricColumns = useMemo(() => {
  const specials = new Set(['qty-pct', 'cost-pct', 'risk', 'chg-prev', 'chg-orig', 'left-spend']);
  return buildMetricColumns(catalog)
    .filter((c) => colVis.isVisible(c.id) && !specials.has(c.id)) // specials keep their bespoke renderers below
    .map((col) =>
      helper.accessor((row) => resolveMetricValue(row, col.metric, resolveCtx), {
        id: col.id,
        header: ({ column }) => (
          <div className={cn(col.editable && EDITABLE_HEADER_CLASS)}>
            <DataGridColumnHeader column={column} title={col.editable ? `✎ ${col.name}` : col.name} />
          </div>
        ),
        cell: col.editable
          ? ({ row, getValue }) => (
              <div className={cn('rounded', EDITABLE_CELL_CLASS)}>
                <EditableCell
                  value={getValue() as number}
                  format={col.format === 'currency' ? 'currency' : 'number'}
                  onCommit={(v) => onUpdateMetricValue(row.original.lineKey, col.metric, v)}
                />
              </div>
            )
          : ({ getValue }) => (
              <div className={cn('text-right text-sm tabular-nums', col.color && 'px-1.5')}
                   style={col.color ? { background: `${col.color}22` } : undefined}>
                {renderMetricCell(col, getValue() as number)}
              </div>
            ),
        size: col.format === 'currency' ? 110 : 80,
      }),
    );
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [catalog, colVis.vis, resolveCtx, onUpdateMetricValue]);
```

> The bespoke special columns (`qty-pct`, `cost-pct`, `risk`, `chg-prev`, `chg-orig`, `left-spend`, `Forecast`) already exist in the static `columns` memo (lines 297–480+). Keep them, but wrap each in `colVis.isVisible('<id>') && (...)` so the picker controls them too. Map current static ids to catalog ids: `proj-forecast`→`f-cost` already a metric (use the metric column instead — remove the static `proj-forecast`), `proj-chgPrev`→`chg-prev`, `proj-lts`→`left-spend`, `proj-chgOrig`→`chg-orig`, `qtyPct`→`qty-pct`, `dollarPct`→`cost-pct`, `risk`→`risk`. Gate each static special column on its catalog id's visibility.

- [ ] **Step 4: Swap `...sliceColumns` for `...metricColumns`**

At line 345 replace `...sliceColumns,` with `...metricColumns,`. Add `onUpdateMetricValue` to the component props (Step 5 below) and thread it.

- [ ] **Step 5: Add the new prop + handler type**

In `ProjectionTableProps` (line 41) add:

```tsx
  onUpdateMetricValue: (lineKey: string, metric: import('@repo/projections').Metric, value: number) => void;
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @repo/web typecheck`
Expected: error at the table's call site in `projections.$projectId.tsx` (fixed in Task 10). The component itself compiles.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/projection-table.tsx
git commit -m "feat(web): render projection metric columns from the catalog with editable styling"
```

---

## Task 10: Wire the update handler at the route

**Files:**
- Modify: `apps/web/src/routes/_dashboard/projections.$projectId.tsx`

- [ ] **Step 1: Add the metric-value handler**

Near the existing forecast handler (line 77, `updateActiveProjection((p) => updateForecast(p, lineKey, patch))`), add:

```tsx
import { updateMetricValue, type Metric } from '@repo/projections';

const handleUpdateMetricValue = (lineKey: string, metric: Metric, value: number) =>
  updateActiveProjection((p) => updateMetricValue(p, lineKey, metric, value));
```

- [ ] **Step 2: Pass it to the table**

Add `onUpdateMetricValue={handleUpdateMetricValue}` to the `<ProjectionTable .../>` usage.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @repo/web typecheck`
Expected: PASS (no remaining errors).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/projections.\$projectId.tsx
git commit -m "feat(web): wire metric-value edits through updateMetricValue"
```

---

## Task 11: Summary rows resolve via the catalog

**Files:**
- Modify: `apps/web/src/components/projection-summary-rows.tsx`

- [ ] **Step 1: Read the file**

Run: `sed -n '1,80p' apps/web/src/components/projection-summary-rows.tsx`
Identify where it reads slice/field values for the totals row.

- [ ] **Step 2: Use the resolver for catalog columns**

For each visible metric column, compute the column total by summing `resolveMetricValue(item, metric, resolveCtx)` over `items` (pass `catalog`, `colVis`, and `resolveCtx` as props from `ProjectionTable`, mirroring how `metricColumns` is built so column order and visibility match exactly). Keep currency/number formatting consistent with `renderMetricCell`.

- [ ] **Step 3: Typecheck + visual parity**

Run: `pnpm --filter @repo/web typecheck` → PASS.
Manually confirm (Task 13) the summary row aligns under the same columns as the body.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/projection-summary-rows.tsx apps/web/src/components/projection-table.tsx
git commit -m "feat(web): summary totals resolve through the metric resolver"
```

---

## Task 12: Full test + lint sweep

- [ ] **Step 1: Run all projections tests**

Run: `pnpm --filter @repo/projections test`
Expected: PASS (all, including the new resolver/columns/engine/adapter tests).

- [ ] **Step 2: Run web tests**

Run: `pnpm --filter @repo/web test`
Expected: PASS. Fix any fixtures that referenced removed exports (`metricLookup`, old `useColumnVisibility()` signature, `META_FIELDS`).

- [ ] **Step 3: Typecheck + lint the monorepo**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. Resolve any unused-import warnings from deleted code (e.g. now-unused `TimeSlice`, `lensLeftToSpend` if fully replaced).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "test(projections,web): fix fixtures + lint after catalog-driven columns"
```

---

## Task 13: Manual verification in the browser

- [ ] **Step 1: Start the dev server**

Run: `pnpm --filter @repo/web dev` (note the printed port).

- [ ] **Step 2: Switch to the Superior tenant**

In the browser console on the app origin: `localStorage.setItem('tenant','superior')`, then reload. Navigate Home → **Projections** via the sidebar (direct URL load SSR-500s — known issue; navigate client-side).

- [ ] **Step 3: Verify editable columns**

Open **Suncoast Phase 3A**. Confirm F Qty / F Hours / F Cost / New Projection render with the green tint + ✎ header. Click an F Qty cell, type `186*2`, press Enter → cell shows `372`. Type `(800+400)/2` in another → `600`. Confirm a non-editable column (e.g. CTD Cost) has no tint and isn't editable.

- [ ] **Step 4: Verify the Columns picker**

Open **Columns**. Confirm every metric appears under its group with its real name and group color — including previously-unreachable ones (New Projection, Change From Prev, Left To Spend, Change From Orig, Qty % Complete, $ % Complete, Risk). Toggle a few off/on and confirm the table updates.

- [ ] **Step 5: Verify live propagation**

In a second tab go to **Admin → Metrics**. Rename a metric (e.g. "F Qty" → "Forecast Qty") and toggle another metric's Editable flag. Return to the projection: the header reflects the new name; the newly-editable column shows the green styling and accepts input. Create a new **formula** metric (e.g. group Projection, formula `F.cost - CTD.cost`) → confirm it appears as a new, visible column with real values.

- [ ] **Step 6: Regression — no render freeze**

Apply a non-`all` filter (e.g. "High Risk") and expand/collapse rows. Confirm no freeze (guards the `autoResetExpanded` loop from commit ad91d28).

- [ ] **Step 7: Note results in the commit**

```bash
git commit --allow-empty -m "chore: manual verification of metrics-driven columns (editable, picker, live propagation)"
```

---

## Self-Review checklist (completed by plan author)

- **Spec coverage:** resolver+evaluator (Tasks 1,3,4) ✓; generic value store (Task 2) ✓; adapter extended values (Task 7) ✓; column generation + grouping/order + identity exclusion (Task 5,9) ✓; editable styling + override precedence (Tasks 4,6,9) ✓; catalog-driven picker + new-metric-visible defaults (Task 8) ✓; live propagation (Task 9 memo deps + Task 13) ✓; summary rows (Task 11) ✓; export — **see note below**.
- **Export gap:** the spec lists export modules; this plan defers export changes because exports currently read slices directly and won't break. If exporting *new extended* columns is required, add a follow-up task mirroring Task 9's column list in `export/vista-xlsx.ts` / `csv.ts`. Flagged, not silently dropped.
- **Type consistency:** `resolveMetricValue(item, metric, ctx)`, `ResolveCtx { catalog, prevItems }`, `buildMetricColumns(catalog) → MetricColumn[]`, `updateMetricValue(project, key, metric, value)` used consistently across tasks.
- **Placeholder scan:** Task 7 leaves adapter row/column access to be matched to the file (its exact parser differs) — every other task has concrete code.
```
