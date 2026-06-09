# Services Homogenization — Design Spec

**Date:** 2026-06-09
**Status:** Approved design, pre-implementation
**Goal:** Stratagraph and Superior should be the **same feature** — one shared `Service` database, shared column names, one screen. Not two lookalikes, nothing jerry-rigged.
**Scope now:** the **Services screen** + the shared data model (Pass A). Repointing the operations chain is Pass B (immediate follow-up). Broader "same app everywhere" is a future principle, not this spec.

## Problem

Two unrelated "Services" today, each in its own store:
- **Stratagraph** (operations) — a sell-side **rate card** (`ServiceCatalogItem` in `serviceCatalog`): name, category, dailyCode, billingUnit, `defaultRate` (a price), aliases. Bids/jobs/tickets/invoices reference it heavily.
- **Superior** (projections) — a cost-side **line-item catalog** (registry `ServiceItem` in `serviceRegistry`): canonicalName, costType, phaseCode, unitOfMeasure, aliases, sources, aggregated CTD actuals.

They share an identity skeleton but use different names and different stores. The goal: **one canonical `Service` record in one store**, both tenants read/write it, one screen renders it.

## The canonical `Service` (the stored record)

This is the actual stored model both tenants use — not a view adapter. Identity fields are shared (1:1, renamed to one vocabulary). Money fields are all **$/unit** so they compare across a row. It is a superset: it also carries the billing fields operations need (so Pass B is mostly renames) and the cost provenance Superior needs.

```ts
export interface Service {
  id: string;
  tenantId: 'stratagraph' | 'superior';
  // ── Identity (shared) ──
  name: string;          // was Stratagraph name / Superior canonicalName
  type: string;          // was category / costType
  code: string | null;   // was dailyCode / phase code
  unit: string;          // was billingUnit ("day") / unitOfMeasure ("CY")
  aliases: ServiceAlias[];
  // ── Money: all $/unit ──
  recommendedRate: number | null; // was Stratagraph defaultRate; Superior null (for now)
  rateNote: string | null;         // "Cost + 25%" / "TBD" (Stratagraph)
  // ── Cost provenance (Superior; powers Original/Actual/Forecast UC + modal) ──
  sources: ServiceSource[];        // [] for Stratagraph
  // originalUC / actualUC / forecastUC are DERIVED from sources via the metrics
  //   resolver (not stored) — OE.cost/OE.qty, CTD.cost/CTD.qty, F.cost/F.qty
  // ── Operational fields (kept so Pass B repoint is mechanical) ──
  billingUnit?: BillingUnit;       // Stratagraph billing cadence
  // (dailyCode lives in `code`; rate in `recommendedRate`)
}
```

Identity (name/type/code/unit/aliases) + `usedIn` (derived: `sources` projects or job count) + the four $/unit money columns (Recommended Rate, Original UC, Actual UC, Forecast UC) are the shared columns. Each tenant fills what it has; blanks render "—".

## One shared store (replaces the two)

`store.ts` gets a single `services: Service[]` collection (and its actions), replacing the separate `serviceRegistry` (Superior) and — for the Services screen — `serviceCatalog` (Stratagraph). Seeding populates it per tenant:
- **Superior:** migrate the registry build (`buildDemoRegistry` + reconcile) to emit `Service` records (identity from the line item; `sources` carrying OE/CTD/F bases; `recommendedRate=null`).
- **Stratagraph:** seed the rate card into `Service` records (identity from the catalog item; `recommendedRate=defaultRate`, `rateNote`, `billingUnit`; `sources=[]`).

The merge/split/rename/reconcile engine already in `packages/projections/src/registry` operates on this model (it's essentially today's `ServiceItem` renamed to `Service` and extended).

## Phasing (user chose Option 2)

- **Pass A — THIS plan:** build the `Service` model + single `services` store; seed both tenants into it; point the **Services screen + detail modal** at it. **Operations (bids/jobs/tickets/invoices) still read the old `serviceCatalog`** — a deliberate, temporary two-store window.
- **Pass B — immediate follow-up (separate plan):** repoint the ~18 operations references (heaviest: `bid-editor`, `bids.$bidId`, `jobs.$jobId`, `job-day-card`, `invoice-builder`) to the unified `Service`; delete `serviceCatalog`/`ServiceCatalogItem`. Mechanical because `Service` already carries the billing fields they read.

During the window, Stratagraph's services exist in both the new `services` store (screen) and the old `serviceCatalog` (operations); both are seeded from the same source and there's no rate editing in Pass A, so they don't drift.

## Data-model change: capture OE & F per source (Superior)

To derive `originalUC` and `forecastUC` (not just CTD), `ServiceSource` (`registry/types.ts`) carries all three slices' bases:

```ts
export interface ServiceSource {
  projectId: string; lineKey: string; phaseCode: string; date: string;
  ctd: { qty: number; hours: number; cost: number };
  oe:  { qty: number; cost: number };   // Original Estimate (Est slice)
  f:   { qty: number; cost: number };   // Forecast
}
```
(Replaces today's CTD-only flat `qty/hours/cost`.) Producers updated: `buildDemoRegistry`, `applyReconciliation`, `ImportLine`. The aggregation lib generalizes `aggregateCtd` → `aggregateGroup(catalog, groupId, sources)` (sum a group's summable bases, resolve its metrics on the sums via the synthetic-item resolver trick) — so OE/CTD/F UCs are all catalog-driven.

## Shared screen + modal

`apps/web/src/components/services-table.tsx` renders `Service[]` for **both** tenants — replacing the Superior `SuperiorServices` branch AND the Stratagraph rate-card table in `services.tsx`. `services.tsx` becomes a thin wrapper reading `store.services`.

Columns (shared names): **Name, Type, Code, Unit, Used in** + **Recommended Rate, Original UC, Actual UC, Forecast UC** ($/unit, right-aligned, "—" when null). Toolbar: search, Type filter + Unit filter (tenant-specific option sets, same columns), Import & reconcile (Superior). Built on `DataListShell` + the shipped header-alignment fix.

`service-detail-dialog.tsx` adapts on `service.tenantId`: Superior shows the per-source OE/CTD/F UC breakdown + totals (sums add up), rename/UoM/merge/split/remove; Stratagraph shows identity + Recommended Rate (+ rateNote), no source breakdown.

## Non-goals (deferred)

- **Editing Recommended Rate** (set/seed a rate per service) — schema carries it; no edit UI yet.
- **Pass B** (operations repoint + deleting the old store) — separate immediate plan.
- Cross-tenant margin (price − cost) views — enabled by the schema, not built here.

## Components & files (Pass A)

**Rename/extend (the model becomes shared)**
- `packages/projections/src/registry/types.ts` — `ServiceItem` → `Service` (+ `tenantId`, `recommendedRate`, `rateNote`, `billingUnit?`); `ServiceSource` carries ctd/oe/f.
- `packages/projections/src/registry/registry.ts` — operate on `Service`; source upsert for the new shape; (tests updated).
- `apps/web/src/lib/service-catalog-aggregate.ts` — generalize to `aggregateGroup`; OE/CTD/F UC helpers.

**Modified**
- `apps/web/src/lib/store.ts` — single `services` store + actions; seed both tenants into it (Superior via the registry build, Stratagraph from the rate card).
- `apps/web/src/data/seed-demo.ts` — emit `Service` records w/ OE/CTD/F sources.
- `apps/web/src/routes/_dashboard/services.tsx` — thin wrapper → `<ServicesTable>` for both tenants.
- `apps/web/src/components/service-detail-dialog.tsx` — tenant-adaptive; OE/CTD/F UC breakdown.
- `apps/web/src/components/service-reconcile-dialog.tsx` — capture OE/CTD/F bases.
- `apps/web/src/lib/service-catalog-rows.ts` — folded into the screen / `Service` mapping.

**Untouched in Pass A** (handled in Pass B)
- `serviceCatalog`/`ServiceCatalogItem` and all operations references (bids/jobs/tickets/invoices) keep working as-is.

## Testing

- `aggregateGroup` over OE/CTD/F: summables sum; UCs recompute on sums.
- Seeding: Stratagraph rate card and Superior registry both produce valid `Service[]` (right fields filled per tenant; blanks null).
- Shared table renders both tenants with the same columns; tenant-specific filters; detail modal adapts.
- Operations still pass their existing tests (untouched in Pass A).

## Open question to confirm in review

- Stratagraph's `unit`: show the bare unit ("day") or the billing label ("per day")? Spec assumes bare "day" to match Superior's UoM style.
