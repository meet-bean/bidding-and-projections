# Services Catalog (Superior) — Design Spec

**Date:** 2026-06-09
**Status:** Approved design, pre-implementation
**Tenant:** Superior Construction (projections)

## Problem

The `/services` screen, on the Superior tenant, currently renders the **metrics / Columns & Formulas catalog** — but that already has a dedicated home at `/admin/metrics`. It's duplication, and it's the wrong thing for this slot.

Services should be the **line items** Superior uses to build quotes and projects and to track work. Today Superior has no line-item catalog at all: its line items arrive only inside Vista uploads (`ProjectionItem` rows, phase × cost-type) and aren't reusable across projects.

This spec defines a **line-item catalog** for Superior, seeded and maintained from Vista uploads, that becomes the reusable library quoting and the future pricing cockpit build on.

## Goals (v1)

- A **merged, reusable catalog** of line items, one entry per distinct line item.
- **Browse / search / filter** the catalog; see each entry's cross-project **cost range**.
- **Edit & maintain** entries: rename, set UoM, merge/split duplicates.
- **Import & reconcile**: when a project is uploaded, fold its lines into the library via name-based auto-matching with a human confirm/triage step.
- Reuse platform patterns: `DataListShell` table, Filters + column-picker toolbar, the `detect.ts` matching engine.

## Non-goals (v1)

- **No quote builder** — assembling quotes/estimates from catalog items is the queued **next phase** (needs a sell-price/markup model the cost library doesn't carry).
- **No catalog ↔ projections linking** screen (future).
- **No editable "standard/sell rate"** — v1 shows *observed* cost only.
- No change to the Stratagraph tenant's existing `ServiceCatalogItem` rate card or the Superior branch's nav location.

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Grain** | A service = one **phase × cost-type** line | Matches the projections-table granularity the team thinks in (chosen over work-item-with-nested-cost-types and over category-level). |
| **Identity** | **Merged reusable library** — each line item exists once | Enables cross-project blending ("used in N projects", rate range); foundation for quoting + cockpit. |
| **Dedup key** | **name + cost-type + UoM** (NOT phase code) | Superior has **no standardized cost code** — PMs number phases ad hoc per job, so phase code can't identify the work. |
| **Phase code** | **Displayed, not keyed** | Shown in the first column (primary code + "+ varies" when sources differ); per-project codes in the drill-down. |
| **Rate** | **Observed range only** (lo / avg / hi unit cost) | Sell price/markup is a quote-builder concern (next phase). |
| **Matching** | Fuzzy name + exact cost-type + UoM, **human-confirmed** | Names won't be identical across projects; ad-hoc codes force name-based matching. |
| **Auto-accept** | **None** — no bulk "accept all", no confidence threshold knob | User declined both; nothing commits until "Add to catalog". |

## Data model

```ts
// One canonical, reusable catalog entry.
interface ServiceCatalogEntry {
  id: string;
  name: string;            // canonical, editable
  costType: CostType;      // 'Labor' | 'Material' | 'Equipment' | 'Subcontract' | 'Other'
  uom: string;             // unit of measure (canonical for the entry)
  sources: ServiceSource[];// raw upload lines merged into this entry
  // Derived (computed from sources, not stored):
  //   usedInProjectCount, unitCostLo/Avg/Hi, avgUpm, primaryPhaseCode, phaseVaries
}

// A single uploaded line that feeds an entry (back-reference to the projection).
interface ServiceSource {
  projectId: string;
  projectName: string;
  lineKey: string;         // back-ref to ProjectionItem.lineKey
  phaseCode: string;       // ProjectionItem.keyParts[0]
  qty: number;
  cost: number;            // forecast cost (F.cost)
  unitCost: number;        // uc = F.cost / F.qty
  upm: number | null;      // units per manhour, if available
  date: string;            // source version/project date
}
```

Derived helpers compute the displayed columns from `sources`:
- **Used in** = distinct `projectId` count.
- **Unit cost lo/avg/hi** = min / mean / max of `sources[].unitCost`.
- **Avg UPM** = mean of non-null `sources[].upm`.
- **Primary phase** = most frequent `phaseCode`; `phaseVaries` = true if >1 distinct.

## Screen (approved mockup)

Route: replace the **Superior branch** of `apps/web/src/routes/_dashboard/services.tsx`. (Stratagraph branch — the existing `ServiceCatalogItem` rate card — is unchanged.)

**Toolbar** (reuses platform Filters + column-picker pattern):
- Search line items
- Cost-type filter, UoM filter
- Columns (column picker)
- **Import & reconcile** button

**Table** (`DataListShell` / `createColumnHelper` / `DataGridColumnHeader`), one row per entry:

| Column | Notes |
|---|---|
| Phase & line item | Phase chip (primary code, "+ varies" flag) + canonical name; expandable |
| Cost type | Color badge (Labor=indigo, Material=cyan, Equipment=gold, Subcontract=orange, Other=mauve) |
| UoM | |
| Used in | "N projects" badge, or "X only" for single-project entries |
| Unit cost (lo–avg–hi) | Cross-project range; single value if one source |
| Avg UPM | Units per manhour; "—" when n/a |
| Source lines | Count of raw upload rows merged |

**Row drill-down** (expand): lists each source — phase code, project, unit cost, UPM, date. Inline edit of canonical name / UoM, and merge/split duplicate controls.

## Import & reconcile flow (approved mockup)

Triggered on project upload (and re-runnable via the toolbar button). Each incoming Vista line is auto-matched against the library (`detect.ts`-style fuzzy name + exact cost-type + UoM-compatibility → confidence score), then grouped:

1. **Auto-matched** (high confidence) — grouped, collapsed, expandable to review/override. Not silently committed.
2. **Needs review** (medium confidence) — per line: incoming line → suggested match + confidence %, with **Accept / New / Change match**.
3. **New to catalog** (no match) — create a new entry or hand-match to an existing one.

Footer summarizes the net effect ("16 entries updated, 2 created"). **Nothing commits until the user clicks "Add to catalog"** — the single explicit accept for the batch. No bulk accept-all; no auto-accept threshold.

## Components & files

**New**
- `apps/web/src/lib/service-catalog.ts` — types + pure helpers: `buildCatalogFromProjects`, `matchLineToCatalog` (confidence scoring), rate-range / UPM / primary-phase aggregation.
- `apps/web/src/components/services-catalog.tsx` — the Superior catalog table + drill-down + inline edit/merge/split.
- `apps/web/src/components/service-reconcile-dialog.tsx` — the 3-bucket reconcile UI.

**Modified**
- `apps/web/src/routes/_dashboard/services.tsx` — Superior branch renders `<ServicesCatalog>` instead of the metrics catalog.
- Store (zustand) — add a `serviceCatalog` slice (entries + actions: rename, setUom, merge, split, applyReconciliation). Persisted.

**Reused**
- `detect.ts` matching pattern, `DataListShell`, Filters/column-picker components, cost-type color tokens.

## Seeding & maintenance

- **Initial seed:** build the catalog from already-uploaded `projectionProjects` (auto-match within the seed, then it's ready). Idempotent — re-running doesn't duplicate.
- **New uploads:** flow through Import & reconcile.
- **Re-importing the same project:** sources are keyed by `projectId + lineKey`, so a re-upload updates existing sources rather than duplicating them.

## Edge cases

- **UoM mismatch on an otherwise-matching line** → not auto-matched; surfaces in "needs review" (UoM is part of identity).
- **Merge** two entries → sources combine; pick the surviving canonical name/UoM. **Split** → move selected sources to a new entry.
- **Single-source entry** → no range, shows the one value; "Used in" shows the project name.
- **Missing qty (qty=0)** → unit cost is n/a ("—"), entry still valid by cost.
- **Empty catalog** (no uploads yet) → empty state pointing to upload/import.

## Testing

- Pure helpers (`service-catalog.ts`): dedup keying, rate-range/UPM aggregation, primary-phase/"varies" logic, match confidence scoring, re-import idempotency. (Vitest, matching `packages/projections` test style.)
- Reconcile bucketing: given incoming lines + existing catalog, correct high/medium/none classification.
- Merge/split produce correct source membership.

## Future (out of scope here)

- **Quote builder** (next phase) — assemble quotes from catalog entries (quantities, markup, totals); introduces sell-price model.
- Catalog ↔ projections linking.
- Pricing cockpit consumes this same library (see `project-pricing-cockpit`).
