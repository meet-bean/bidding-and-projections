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

## Data model — reuse & extend the existing `ServiceRegistry`

**Important:** the projections engine already ships the catalog machinery in `packages/projections/src/registry/` — `ServiceItem` (canonicalName, unitOfMeasure, costType, aliases, projectIds), `addServiceItem` (dedup-and-merge on import, keyed on normalized name+costType), `findFuzzyMatches` (levenshtein name + costType + UoM → confidence = matchedFields/3), `mergeServiceItems`/`separateAlias` (merge/split via aliases), `editServiceItemName` (rename), `removeServiceItem`. `services.tsx` already renders `registry.items` for the Superior branch, and `buildDemoRegistry` (seed-demo.ts) already seeds it from the demo projects' Vista line items.

So v1 **extends** this engine rather than introducing a new type. The gap: `ServiceItem` tracks only `projectIds[]` — it has no per-source financials/phase, so it can't yet show the cost range, avg UPM, phase, or drill-down. We add a `sources` array:

```ts
// NEW — provenance for one uploaded line folded into a ServiceItem.
interface ServiceSource {
  projectId: string;
  lineKey: string;     // back-ref to ProjectionItem.lineKey
  phaseCode: string;   // ProjectionItem.keyParts[0]
  qty: number;         // F.qty
  cost: number;        // F.cost
  unitCost: number;    // F.cost / F.qty (0 when qty is 0)
  upm: number | null;  // F.upm if available, else null
  date: string;        // source project/version date
}

// EXTEND ServiceItem (registry/types.ts) — add:
interface ServiceItem {
  /* ...existing fields... */
  sources?: ServiceSource[];   // optional: Stratagraph registry items leave it empty
}
```

`projectIds` stays (derive-able from `sources`), so the Stratagraph branch is untouched. Derived selectors (new pure helpers) compute the displayed columns from `sources`:
- **Used in** = distinct `projectId` count.
- **Unit cost lo/avg/hi** = min / mean / max of `sources[].unitCost` (ignoring 0s).
- **Avg UPM** = mean of non-null `sources[].upm`.
- **Primary phase** = most frequent `phaseCode`; `phaseVaries` = true if >1 distinct.

`costType` is stored as the raw Vista code (e.g. `2Labor`); display maps it to the friendly label (`Labor`) via the existing `costTypeLabel` mapping in `apps/web/src/lib/pnl.ts` (extract to a shared helper).

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

**Row drill-down:** `DataListShell` supports `onRowClick` but not inline expansion, so the drill-down is a **detail dialog** opened on row click — lists each source (phase code, project, unit cost, UPM, date), with rename, set-UoM, and merge/split controls. (The approved mockup showed inline expansion; a dialog is the v1 equivalent given the shell's capabilities.)

## Import & reconcile flow (approved mockup)

Triggered on project upload (and re-runnable via the toolbar button). Each incoming Vista line is auto-matched against the library (`detect.ts`-style fuzzy name + exact cost-type + UoM-compatibility → confidence score), then grouped:

1. **Auto-matched** (high confidence) — grouped, collapsed, expandable to review/override. Not silently committed.
2. **Needs review** (medium confidence) — per line: incoming line → suggested match + confidence %, with **Accept / New / Change match**.
3. **New to catalog** (no match) — create a new entry or hand-match to an existing one.

Footer summarizes the net effect ("16 entries updated, 2 created"). **Nothing commits until the user clicks "Add to catalog"** — the single explicit accept for the batch. No bulk accept-all; no auto-accept threshold.

## Components & files

**Extend (existing engine)**
- `packages/projections/src/registry/types.ts` — add `ServiceSource`; add optional `sources` to `ServiceItem`.
- `packages/projections/src/registry/registry.ts` — thread `sources` through `addServiceItem`, `mergeServiceItems`, `separateAlias`; add derived selectors `rateRange(item)`, `avgUpm(item)`, `primaryPhase(item)`; add `classifyImport(registry, lines)` that buckets incoming lines (auto/review/new) using `findFuzzyMatches`.

**New**
- `apps/web/src/lib/service-catalog-rows.ts` — map `ServiceItem[]` → view rows (columns above) using the derived selectors + `costTypeLabel`.
- `apps/web/src/components/service-detail-dialog.tsx` — drill-down dialog (sources list + rename/set-UoM/merge/split).
- `apps/web/src/components/service-reconcile-dialog.tsx` — the 3-bucket reconcile UI.

**Modified**
- `apps/web/src/routes/_dashboard/services.tsx` — Superior branch: **remove** the "Columns & Formulas" metrics block; new columns (phase-led, cost range, used-in, avg UPM, source lines); `onRowClick` → detail dialog; "Import & reconcile" action button.
- `apps/web/src/data/seed-demo.ts` — `buildDemoRegistry` captures `sources` (phase/qty/cost/unitCost/upm/date) per line, not just `projectIds`.
- `apps/web/src/lib/store.ts` — add actions `setServiceItemUom`, `removeServiceItem`, `applyReconciliation(projectId, decisions)`; ensure registry persists.
- `apps/web/src/lib/pnl.ts` — extract `costTypeLabel`/`COST_TYPE_*` to a shared module both pnl and the catalog import.

**Reused as-is**
- `findFuzzyMatches`, `normalizeKey` (registry), `DataListShell` (`onRowClick`, `filters`, `searchableKeys`, `actions`), cost-type color tokens, `Dialog` from `@repo/ui`.

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
