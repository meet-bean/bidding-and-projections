# Upload → Services Reconciliation

**Date:** 2026-06-09
**Status:** Approved
**Scope:** Superior tenant, projection upload flow + services registry (`packages/projections` + `apps/web`)

## Problem

When a monthly Vista forecast upload introduces line items that aren't in the services catalog, nothing happens — the catalog is only updated via a manual "Import & reconcile" button on `/services` that is hardcoded to the first project. New line items should flow into the services catalog through an explicit accept/match step, immediately after upload.

The existing machinery (`classifyImport`, `ServiceReconcileDialog`, `applyReconciliation`) is reused (Approach A); the work is the trigger, the delta scoping, and a matcher rewrite.

## Decisions (user-confirmed)

1. **Trigger:** reconciliation opens right after the upload month is selected and the version is ingested.
2. **Identity precedence:** cost type must always agree; **name + cost type always wins**; phase code + cost type is a within-project rename fallback only; phase codes are never matched across projects (not stable across jobs).
3. **Catalog shape:** unchanged. A registry `Service` (keyed by name + cost type) is the canonical cross-project rollup; its `sources[]` (projectId + lineKey + phaseCode) are the per-project lines.

## Flow

```
Upload modal (file → month detect/confirm)
  → ingestBatch saves new version
  → upload modal closes
  → ServiceReconcileDialog opens for THAT project, scoped to the delta
  → user reviews buckets, clicks Apply
  → applyReconciliation updates services
```

- **Delta** = lines whose `lineKey` is new vs. the immediately prior version, **plus** lines whose `label` changed vs. the prior version (rename candidates). Unchanged lines are skipped.
- First upload of a new project: every line is the delta (bootstrap path).
- Zero delta → no dialog; toast: "All N line items already reconciled."
- Manual **Import & reconcile** on `/services` stays, gains a project picker (replacing the hardcoded `projectionProjects[0]`), and runs the **full** line set of the chosen project.

## Matcher

Rewrite `classifyImport` / `findFuzzyMatches` in `packages/projections/src/registry/registry.ts`. For each incoming line, cost type must agree at every tier:

| Tier | Rule | Bucket |
|---|---|---|
| 1 | Exact normalized name + cost type | Auto |
| 2 | Fuzzy name (normalized Levenshtein ≤ 0.3) + cost type, exactly one candidate | Auto (records alias) |
| 3 | Same project + same phase code + cost type, name drifted (rename) | Review, "renamed?" suggestion |
| 4 | Tiers 2–3 produce conflicting candidates | Review, all candidates shown |
| 5 | No candidate | New |

- Phase code is **never** used to match across projects.
- **UoM does not gate matching.** A UoM difference is surfaced as a warning chip in review rows (real Vista data changes UoM on the same line between months).
- Canonical scenario (regression test): incoming `B-205-` / `2Labor` / "Erosion Control" with catalog containing (A) `B-205-`/`5SubCont`/"Mowing / Litter" and (B) `B-200-`/`2Labor`/"Erosion Control" → matches **B**.

## Apply semantics

`applyReconciliation` (store) mostly as-is:

- **Match** → upsert source on the existing service (existing behavior). If the match came from tier 2 or 3 (incoming name ≠ canonical name), additionally record the incoming name as an alias via `mergeServiceItems`, so next month it auto-matches at tier 1.
- **New** → create a service with the incoming name as canonical (existing behavior).
- **Stale** (service has a source for this project whose lineKey is absent from the upload): no catalog change; sources keep last-known values. Visibility is covered by the projection table's existing `stale` flag.

## UI changes

`ServiceReconcileDialog` keeps its three buckets (Auto-matched / Needs review / New to catalog). Changes:

- Accepts a pre-computed line set (the delta) instead of always deriving all lines from the latest version; manual flow passes the full set.
- Title: "New line items — {month label}" when delta-scoped.
- Review rows can show **two** suggestions (name-match vs. phase-rename) with the user picking one, instead of a single suggestion.
- UoM mismatch warning chip on review rows.
- Footer button: "Apply" (was "Add to catalog").

`/services` header: "Import & reconcile" opens a project picker first.

Upload flow (`projections.$projectId.tsx`): after `handleBatchImport` ingests, compute the delta and open the dialog (or toast if empty).

## Testing

- **Engine** (`registry.test.ts`): unit tests per tier; the canonical Erosion Control scenario; alias recorded on tier-2/3 accept; no cross-project phase matching; UoM mismatch does not block.
- **Delta computation:** new lineKey detected; renamed label detected; unchanged line excluded; first-upload = all lines.
- **UI** (browser): upload a doctored copy of a real 25807 sheet with one renamed + one new line; verify buckets, accept/new toggles, applied catalog state.

## Out of scope

- Persisting reconciliation decisions across page reloads beyond the store's normal persistence.
- Stratagraph tenant (rate-card services don't ingest uploads).
- Cross-project canonical *naming* tools (separate `separateAlias` flows already exist).
