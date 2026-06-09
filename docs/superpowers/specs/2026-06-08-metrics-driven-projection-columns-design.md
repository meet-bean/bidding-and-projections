# Metrics-Driven Projection Columns — Design

**Date:** 2026-06-08
**Status:** Approved (brainstorm) → ready for implementation plan
**Tenant scope:** Superior Construction (projections module); applies to any future projections tenant.

## Problem

The projections table is supposed to be a view of the metrics catalog, but today the two are disconnected. Columns and the Columns picker are **hardcoded** to a fixed `SLICES × FIELDS` grid in:

- `apps/web/src/components/projection-column-picker.tsx` (`SLICES`, `STD_FIELDS`, `F_FIELDS`, `META_FIELDS`)
- `apps/web/src/components/projection-table.tsx` (`sliceColumns`, `metricLookup`, `GROUP_TO_SLICE`)

Consequences:
- A metric created in `/admin/metrics` only appears if its `(group→slice, field)` happens to match a predefined cell. Genuinely new metrics are invisible.
- The picker can't reach several real columns the catalog already defines — **New Projection, Change From Prev, Left To Spend, Change From Orig, Qty % Complete, $ % Complete, Risk** (catalog groups `PRJ` and `null`).
- Editability is the only thing read from the catalog (via `metricLookup`), and there's no visual indication a column is editable.

The catalog already models nearly the entire table (see `packages/projections/src/metrics/catalog.ts` — 6 groups, ~26 metrics, each with `name`, `group`, `field`, `type`, `formula`, `vistaField`, `editable`). The fix is to make the table **render the catalog** instead of a parallel hardcoded grid.

## Goal

The Metrics page is the single source of truth for the projections table. One metric = one column. Any add / rename / regroup / recolor / editable-flag change on a metric propagates to the table immediately.

## Confirmed decisions (brainstorm)

1. **One metric = one column.** Catalog drives column set, headers (metric `name`), grouping + shading (metric `group` → group `color`, in group order), and value source (metric `type`).
2. **Every metric auto-appears in the Columns picker**, listed by real name under its group, as a show/hide toggle. **A newly created metric is VISIBLE in the table by default** (user hides it if unwanted).
3. **Editable flag → editable column + visual cue.** Editable columns use **Option A**: soft green tinted column + ✎ pencil in the header, in brand sage/teal (`#70A593 / #508875 / #9CC9BB`) — **not blue**. Inline arithmetic already works in `EditableCell`.
4. **One combined spec** (not phased): catalog-driven presentation + formula evaluator **and** the engine generalization (generic per-row metric value store) ship together.

## Architecture

### A. Value resolver (`packages/projections/src/metrics/resolver.ts` — NEW)

A single pure path that, given `(item, metric, ctx)`, returns the metric's number for that line. Replaces all the ad-hoc reads scattered through the table.

```
resolveMetricValue(item, metric, ctx) → number
```

**Override precedence (editable columns):** before type-based resolution, if `metric.editable` and the item has a user-entered override (`item.values[metric.id]` is set, in the draft), **return the override**. This is required because some editable metrics are also `formula` metrics — e.g. **New Projection** (`lmf`) is `editable: true` with formula `F.cost`. Typing a value must win over the computed default. A "reset" clears the override and the column reverts to its formula/upload value.

By `metric.type` (when no override applies):

- **`vista-upload`**
  - If the metric maps to a standard cell — `GROUP_TO_SLICE[metric.group]` exists and `metric.field ∈ {qty,hours,upm,mpu,uc,cost}` — read `item[slice][field]`.
  - Else (an "extended" uploaded field) — read `item.values[metric.id]` (generic map, see §C).
- **`formula`** — evaluate `metric.formula` with the formula evaluator (§B). Referenced values are resolved recursively through `resolveMetricValue` (memoized per `(lineKey, metricId)`; cycle-guarded).
- **`carry-over`** — read the resolved value of `metric.carryOverSource` from the **previous version's** item with the same `lineKey`; if absent, apply `metric.fallback` (which itself names a `type`/`source`).

`ctx` carries: the catalog (id→metric lookup), the previous version's items (for carry-over), and a per-resolution memo/cycle set.

**Standard vs extended classification** is computed once from the catalog: a metric is *standard* iff it maps onto an existing `TimeSlice` cell; otherwise *extended*. This is the bridge between the legacy fixed struct and the generic store.

### B. Formula evaluator (in `resolver.ts`)

Pure function evaluating arithmetic over metric references:

- Supports `+ - * / ( )` and numeric literals.
- Reference tokens in two forms already present in the catalog: `SLICE.field` (e.g. `F.cost`, `CTD.qty`, `LMF.cost`) — resolved by mapping `SLICE`→group→metric for that `field`, then `resolveMetricValue`.
- Divide-by-zero and non-finite → `0` (matches current derived-field behavior).
- Cycle detection via the `ctx` visited set → `0` and a dev warning.
- Implementation: tokenize, substitute resolved numbers, evaluate the arithmetic with a constrained evaluator (same `Function`-based eval already used by `EditableCell`, but operating on a numbers-only string after substitution).

This makes **new formula metrics work immediately** — e.g. a user adds "Margin = `F.cost - CTD.cost`" and it renders a real value with no engine change.

### C. Generic per-row value store (data-model generalization)

`packages/projections/src/types.ts` — add to `ProjectionItem`:

```ts
/** Values for catalog metrics that don't map to a standard TimeSlice cell,
 *  keyed by metric id. Populated by adapters (uploaded fields) and edits. */
values?: Record<string, number>;
```

Legacy `CTP/CTD/CTC/F/Est: TimeSlice` stay as-is (the standard grid). `values` holds (a) *extended* metric values and (b) **user-entered overrides for any editable metric** (including editable standard/formula metrics like `f-qty` or `lmf`). The resolver hides this split from callers; the override-precedence rule in §A applies to editable metrics regardless of type. (Standard editable fields like `f-qty` may continue to write through to the `TimeSlice` cell for back-compat with existing forecast logic; the resolver treats a present `TimeSlice` edit and a `values` override equivalently — implementation picks one storage location per metric and is consistent on read/write.)

### D. Adapter changes (uploaded extended fields)

`packages/projections/src/adapters/vista.ts` and `adapters/batch-upload.ts`:

- Accept the catalog (or a list of `{metricId, vistaField}`) as input.
- For each catalog `vista-upload` metric whose `vistaField` matches an uploaded column header, write the parsed number to either the standard `TimeSlice` cell (existing behavior) or `item.values[metricId]` (extended).
- So when a user adds a `vista-upload` metric with a `vistaField`, the next upload populates it automatically.

`apps/web/src/lib/store.ts` ingest paths pass `metricsCatalog` into the adapters.

### E. Column generation (`projection-table.tsx`)

Replace the hardcoded `sliceColumns` with a catalog-driven builder:

- Walk `catalog.metrics`, **excluding identity-field metrics** (`field ∈ {service, costType, description, unitOfMeasure}` — those define the row, not value columns).
- Order: by `catalog.groups` order; metrics within a group keep catalog order; `group: null` metrics go in a trailing "Analytics" section.
- Each column: `id = metric.id`, header = `metric.name` with group-color shading, accessor = `resolveMetricValue(row, metric, ctx)`.
- **Cell renderer registry** keyed by metric id / kind, with a default formatter, to preserve today's bespoke renderers:
  - `qty-pct`, `cost-pct` → radial % dials (existing)
  - `chg-prev`, `chg-orig`, `left-spend` → signed red/green money (existing)
  - `risk` → risk renderer (existing)
  - cost/uc fields → currency; `*-pct` → percent; else → number
  - editable metric → `EditableCell` (see §F) regardless of formatter
- **Fixed, non-catalog columns remain outside the loop**: the row-expand control, Phase/Description/Cost-Type identity columns, and the action columns (alerts badge, trend, comments). These are structural, not metrics.
- Memoize column defs on `(catalog, visibility)` — **must include `catalog` in deps** so renames/regroups re-render, while keeping the reference stable to avoid the known `autoResetExpanded` infinite-render loop (see commit ad91d28).

### F. Editability

- A metric with `editable: true` renders `EditableCell` with the **Option A** styling: column-level green tint + ✎ in the header (driven by a class derived from `metric.editable`).
- Commit path generalized to `updateMetricValue(lineKey, metricId, value)` in the store:
  - Standard metric → write `item[slice][field]` (generalizes today's `onUpdateForecast`).
  - Extended metric → write `item.values[metricId]`.
  - Creates/updates the **draft version** exactly as the current forecast-edit flow does.
  - For editable **formula** metrics (e.g. New Projection), the write stores an override that the resolver returns in preference to the formula (§A). A clear/reset path removes the override so the column reverts to its computed value.
- Formula columns that depend on an edited value recompute automatically (resolver is live on read), so a single re-render reflects the change. No stored-derived staleness because `upm/mpu/uc` etc. are `formula` metrics resolved live.

### G. Columns picker (`projection-column-picker.tsx`)

Rewrite to read `catalog.metrics` + `catalog.groups`:

- One section per group (in group order) with a color swatch and a group-level "toggle all"; a trailing "Analytics/Other" section for `group: null` metrics.
- Each metric is an individual toggle showing its **real name**.
- Visibility persisted in `localStorage` keyed by **metric id**. Migration: ignore/rebuild legacy `slice-field` keys; seed defaults below.
- **Default-visible set** (replicating today's defaults, by metric id): `ctd-cost, ctd-hrs, f-qty, f-hrs, f-uc, oe-cost, lmf` (New Projection). All other existing metrics default hidden.
- **New metric → default visible** (decision 2).
- SSR-safe: first render uses the static defaults (as today) and hydrates persisted state after mount to avoid hydration mismatch.

### H. Live propagation

All consumers read `useStore(s => s.metricsCatalog)`. Catalog edits already flow through `addMetric/updateMetric/removeMetric/addGroup/updateGroup/removeGroup`. Because columns + picker derive from the catalog, edits reflect immediately with no reload.

### I. Export

`packages/projections/src/export/vista-xlsx.ts` and `export/csv.ts` build their columns from the same catalog-driven list (respecting visibility or exporting all — preserve current behavior), including extended metrics, so exports stay in sync with the table.

## Files touched

- **NEW** `packages/projections/src/metrics/resolver.ts` — value resolver + formula evaluator
- `packages/projections/src/types.ts` — `ProjectionItem.values?`
- `packages/projections/src/metrics/types.ts` — optional `format?: 'currency'|'number'|'percent'` hint on `Metric` (optional; default derived from field)
- `packages/projections/src/adapters/vista.ts`, `adapters/batch-upload.ts` — populate `values` from catalog `vistaField`
- `packages/projections/src/index.ts` — export resolver
- `apps/web/src/lib/store.ts` — `updateMetricValue` action; pass catalog into ingest
- `apps/web/src/components/projection-table.tsx` — catalog-driven columns, renderer registry, editable styling, generic edit commit
- `apps/web/src/components/projection-column-picker.tsx` — catalog-driven picker
- `apps/web/src/components/projection-summary-rows.tsx` — summary totals must use the resolver for catalog columns (keep in sync)
- export modules as above

## Testing

- **resolver.test.ts**: standard-cell read; extended-map read; formula arithmetic incl. `/0`→0; cycle guard; carry-over with fallback.
- **formula evaluator**: precedence, parentheses, `SLICE.field` resolution, unknown ref → 0 + warning.
- **column generation**: catalog → expected column ids/order/grouping; identity-field metrics excluded; null-group trailing section.
- **picker**: lists every metric by name; group toggle-all; new metric appears + default visible; persisted visibility by id.
- **editable**: commit writes to correct location (standard vs extended); draft created; dependent formula column recomputes; styling class applied.
- **editable formula metric** (New Projection): typed override wins over the formula; reset/clear reverts to the computed value.
- **adapter**: a catalog metric with a matching `vistaField` populates `values`/standard cell on upload.
- **regression**: no `autoResetExpanded` infinite loop with non-`all` filters; SSR hydration parity for visibility defaults.

## Edge cases & risks

- **Special renderers** (% dials, risk, signed change colors, alert/trend/comment action columns) must be preserved via the renderer registry / fixed-column list — do not regress the current look.
- **Identity-field metrics** excluded from value columns.
- **localStorage migration** from `slice-field` keys to `metric-id` keys — rebuild from defaults rather than attempt key translation.
- **Formula cycles / bad user formulas** → resolve to 0, never throw.
- **Performance** with many metrics/columns — memoize resolver context per render; avoid per-cell recompute via memo.
- **Number formatting** correctness per metric (currency vs number vs percent).
- **Summary rows** must resolve the same way as body rows or totals will disagree.

## Out of scope

- New metric **Type** authoring UI changes (the metrics page already captures `type`, `formula`, `vistaField`, `carryOverSource`, `editable`).
- Cross-tenant changes beyond making the system catalog-driven (Stratagraph has no projections columns today).
