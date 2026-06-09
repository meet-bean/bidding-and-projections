# Services Homogenization — Design Spec

**Date:** 2026-06-09
**Status:** Approved design, pre-implementation
**Scope:** Align the two tenants' Services onto one data model + render both through one shared screen.

## Problem

There are two unrelated "Services" today:
- **Stratagraph** (operations) — a sell-side **rate card** (`ServiceCatalogItem`): name, category, dailyCode, billingUnit, `defaultRate` (a price), aliases.
- **Superior** (projections) — a cost-side **line-item catalog** (registry `ServiceItem` + CTD aggregation): canonicalName, costType, phaseCode, unitOfMeasure, aliases, sources, aggregated CTD actuals.

They share an identity skeleton but their columns are named differently and one money field (Stratagraph's price) sits in the same conceptual slot as another (Superior's cost). The goal: **one canonical `Service` both tenants use, rendered by one screen**, so we build once for both.

## The canonical `Service`

Identity fields map 1:1 (just renamed to a shared vocabulary). The money fields are all **$/unit** so they're comparable across one row.

```ts
export interface Service {
  id: string;
  // ── Identity (shared) ──
  name: string;          // Stratagraph name ↔ Superior canonicalName
  type: string;          // Stratagraph category ↔ Superior costType (label)
  code: string | null;   // Stratagraph dailyCode ↔ Superior phase code (primary; "varies")
  unit: string;          // Stratagraph billingUnit ("day") ↔ Superior unitOfMeasure ("CY")
  aliases: ServiceAlias[];
  usedIn: number;        // Stratagraph job count ↔ Superior projectIds.length
  // ── Money: all $/unit ──
  recommendedRate: number | null; // Stratagraph defaultRate; Superior null (for now)
  originalUC: number | null;       // OE.cost / OE.qty (Superior); Stratagraph null
  actualUC: number | null;         // CTD.cost / CTD.qty (Superior); Stratagraph null
  forecastUC: number | null;       // F.cost / F.qty (Superior); Stratagraph null
  // ── Provenance (Superior only; powers the detail modal) ──
  sources: ServiceSource[];
  raw: { tenant: 'stratagraph' | 'superior'; item: ServiceCatalogItem | ServiceItem };
}
```

Each tenant fills what it has; blanks (`null`) render as "—". This is the "aligned database" — one shape, two producers.

## Adapters (one per tenant)

A new module `apps/web/src/lib/service-model.ts` exposes `toServices(...)` that produces `Service[]` from whichever tenant's backing data is active. Backing stores stay tenant-specific (Superior's registry is Vista-derived; Stratagraph's rate card is hand-maintained) — they're unified at the **view-model** layer, not the persistence layer (full persistence merge is out of scope).

**Superior adapter** (`serviceItem → Service`):
- identity from the registry item (name=canonicalName, type=costTypeLabel(costType), code=primaryPhase, unit=unitOfMeasure, aliases, usedIn=projectIds.length).
- `recommendedRate = null`.
- `originalUC / actualUC / forecastUC` = aggregate the OE / CTD / F groups across the item's sources and read each group's `uc` metric, via the existing metrics resolver (synthetic-item trick in `service-catalog-aggregate.ts`, generalized from CTD-only to any slice).
- `sources` carried through for the modal.

**Stratagraph adapter** (`serviceCatalogItem → Service`):
- identity (name, type=CATEGORY_LABELS[category], code=dailyCode, unit=BILLING_UNIT_LABELS[billingUnit] or the bare unit, aliases=[], usedIn=job count as today).
- `recommendedRate = defaultRate` (keep `rateNote` available via `raw` for the "—"/"Cost+X%" display).
- cost UCs = `null`; `sources = []`.

## Data-model change: capture OE & F per source (Superior)

To populate `originalUC` and `forecastUC` (not just CTD), `ServiceSource` (`packages/projections/src/registry/types.ts`) extends from CTD-only to carry the three slices' bases:

```ts
export interface ServiceSource {
  projectId: string; lineKey: string; phaseCode: string; date: string;
  ctd: { qty: number; hours: number; cost: number };
  oe:  { qty: number; cost: number };   // Original Estimate (Est slice)
  f:   { qty: number; cost: number };   // Forecast
}
```
(Replaces today's flat `qty/hours/cost` which were CTD-only.) Producers updated: `buildDemoRegistry` (read `item.CTD/Est/F`), `applyReconciliation`, and `ImportLine`. The aggregation lib generalizes `aggregateCtd` → `aggregateGroup(catalog, groupId, sources)` that sums a group's summable bases and resolves its metrics on the sums (same resolver trick), so OE/CTD/F UCs all come out catalog-driven.

## Shared screen

One component `apps/web/src/components/services-table.tsx` renders `Service[]` for **both** tenants, replacing:
- the Superior branch (`SuperiorServices` in `services.tsx`), and
- the Stratagraph rate-card table branch in `services.tsx`.

Columns: **Name, Type, Code, Unit, Used in** (identity) + **Recommended Rate, Original UC, Actual UC, Forecast UC** (money, right-aligned $/unit, "—" when null). Toolbar: search (name), Type filter (tenant-specific option set), Unit filter, plus the existing Import & reconcile (Superior) / Clear-all actions gated by tenant. Built on `DataListShell` + the right-aligned header fix already shipped.

`services.tsx` becomes a thin wrapper: `const services = toServices(tenant, store…)` → `<ServicesTable services={services} tenant={tenant} />`.

## Detail modal

`service-detail-dialog.tsx` adapts on `service.raw.tenant`:
- **Superior:** the existing per-source CTD breakdown + totals, extended to show OE/CTD/F UC columns. Editable name/UoM, merge/split, remove.
- **Stratagraph:** no `sources`, so a compact view: identity + Recommended Rate (+ rateNote), and the existing rename/alias actions where applicable. No cost breakdown.

## Non-goals (deferred)

- **Editing Recommended Rate** (set/seed a rate per service) — schema carries the field, but no edit UI yet.
- **Merging the persistence layer** (one stored table for both tenants) — unified at the view-model layer only.
- Cross-tenant margin views (price − cost) — enabled by the schema, not built here.

## Components & files

**New**
- `apps/web/src/lib/service-model.ts` — `Service` type + `toServices` (both adapters).
- `apps/web/src/components/services-table.tsx` — the shared table.

**Modified**
- `packages/projections/src/registry/types.ts` — `ServiceSource` carries ctd/oe/f bases.
- `packages/projections/src/registry/registry.ts` — source upsert field-compare for the new shape; (tests updated).
- `apps/web/src/lib/service-catalog-aggregate.ts` — generalize to `aggregateGroup(catalog, groupId, sources)`; expose OE/CTD/F UC helpers.
- `apps/web/src/data/seed-demo.ts`, `apps/web/src/lib/store.ts` (`applyReconciliation`), `apps/web/src/components/service-reconcile-dialog.tsx` — capture OE/CTD/F bases.
- `apps/web/src/routes/_dashboard/services.tsx` — thin wrapper around `ServicesTable` for both tenants (delete the two divergent branches).
- `apps/web/src/components/service-detail-dialog.tsx` — tenant-adaptive.
- `apps/web/src/lib/service-catalog-rows.ts` — folded into / replaced by `service-model.ts`.

**Reused**
- Metrics resolver (`resolveMetricValue`, OE/CTD/F groups), `DataListShell`, cost-type tokens, `Dialog`.

## Testing

- `aggregateGroup` over OE/CTD/F: summables sum; UCs recompute on sums (extend existing aggregate tests).
- Both adapters: `ServiceCatalogItem`/`ServiceItem` → correct `Service` (identity mapping; recommendedRate vs cost UCs filled on the right side; blanks null).
- Shared table renders both tenants' `Service[]` with the same columns; tenant-specific filters.

## Open question to confirm in review

- Stratagraph's `unit`: show the bare unit ("day") or the billing label ("per day")? Spec assumes the bare unit to match Superior's UoM style.
