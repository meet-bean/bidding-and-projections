# Mapping Template System — Design Spec

**Date:** 2026-05-26
**Status:** Approved
**Task:** Projections Task 1 — Mapping Template System
**Author:** Italo + Claude

---

## Overview

A generic, auto-detecting spreadsheet mapping system for the projections tool. Users upload any XLSX file during project creation, and the system automatically recognizes columns, detects formulas, and maps data to projection items. A metrics catalog stores all known column types and grows over time as new files are uploaded.

## Goals

- Any spreadsheet format can be ingested without writing custom adapter code
- System auto-detects column types, formulas, and row structure
- Users only intervene when the system encounters something new
- The metrics catalog provides transparency into how calculations work
- Vista adapter remains as a fallback safety net

## Non-Goals

- Replacing the Vista adapter entirely (it stays as fallback)
- Supporting non-XLSX formats (CSV, Google Sheets, etc.) in this iteration
- Real-time formula editing in the projection table (separate feature)

---

## Architecture

Seven components, built in order:

1. Metrics Catalog (data model + admin page)
2. Auto-Detection Engine
3. Mapper Dialog
4. Row Reconciliation
5. Line Item Registry
6. Generic Parser
7. Vista Fallback Integration

---

## 1. Metrics Catalog

### Data Model

A **Metric** is a recognized column type. Each metric has:

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `id` | `string` | `"f-cost"` | Unique slug |
| `name` | `string` | `"F Cost"` | Display name |
| `aliases` | `string[]` | `["Forecast Cost", "Proj Cost"]` | Alternate column names that map to this metric |
| `sliceGroup` | `string \| null` | `"F"` | Slice it belongs to: CTP, CTD, CTC, F, Est, or `null` for identifiers |
| `field` | `string` | `"cost"` | TimeSlice field (qty, hours, cost, uc, mpu, upm) or identifier type (lineItem, costType, description) |
| `kind` | `"raw" \| "formula"` | `"formula"` | Whether this is raw data or computed |
| `formula` | `string \| null` | `"= F Cost / F Qty"` | Human-readable formula expression referencing other metric names |
| `formulaRefs` | `string[]` | `["f-cost", "f-qty"]` | Metric IDs this formula depends on |

**Examples:**

```
Phase:
  { id: "phase", name: "Phase", aliases: ["Phase Code"],
    sliceGroup: null, field: "lineItem", kind: "raw",
    formula: null, formulaRefs: [] }

F Unit Cost:
  { id: "f-uc", name: "F Unit Cost", aliases: ["F UC", "Forecast Unit Cost"],
    sliceGroup: "F", field: "uc", kind: "formula",
    formula: "= F Cost / F Qty", formulaRefs: ["f-cost", "f-qty"] }

CostType UM:
  { id: "costtype-um", name: "CostType UM", aliases: ["Cost Type"],
    sliceGroup: null, field: "costType", kind: "raw",
    formula: null, formulaRefs: [] }
```

### Storage

Metrics are stored in the Zustand store under a `metrics` slice, persisted to localStorage (same pattern as the rest of the app). Each tenant has its own metrics catalog.

### Admin Page

Located under Admin in the sidebar navigation. Provides:

- **Table view** of all metrics — name, slice group, kind, formula
- **Add metric** — manually create with name, field type, optional formula
- **Edit metric** — change name, aliases, formula
- **Delete metric** — with warning if referenced by other formulas

Most metrics arrive here via the upload mapper, but users can also create them directly for custom calculations.

---

## 2. Auto-Detection Engine

When a file is uploaded, the engine runs three passes to classify every column.

### Pass 1 — Header Matching

Read column headers from the XLSX. For each header, check against all metrics in the catalog:

1. Exact name match (case-insensitive)
2. Alias match (case-insensitive)
3. Fuzzy match (normalized: lowercase, stripped whitespace/punctuation)

Columns that match a known metric are marked as **recognized**.

### Pass 2 — Formula Detection

For unrecognized columns, sample the first 10-20 data rows and check if the column's values can be derived from other columns' values mathematically.

For example: if column X ≈ column A / column B consistently across sampled rows, flag it as a formula column with `= A / B`.

This catches computed columns (Unit Cost, MPU, UPM, Completion %) even when the header name is unfamiliar.

### Pass 3 — Structure Detection

Scan the line item identifier column for suffix patterns (e.g., rows ending in "- Labor", "- Material", "- Rental"). If found, flag the file as **breakout structure** and identify the parent/child grouping pattern. If all rows are independent, flag as **flat structure**.

### Detection Result Per Column

Each column gets one of three outcomes:

- `matched: true` — known metric, auto-mapped, no user action needed
- `matched: false, formulaGuess: { expression, refs }` — unrecognized but formula pattern detected, needs user confirmation
- `matched: false, formulaGuess: null` — completely unknown, needs user input

### Unit of Measurement

The CostType UM column is parsed to extract both cost type and unit of measurement (e.g., "2Labor" + "Samples" → costType: "2Labor", um: "Samples"). This parsing logic already exists in the Vista adapter and is reused.

---

## 3. Import Dialog

A two-step wizard that appears after file upload. Steps 1 and 2 are the same code path for every upload — first or hundredth. The dialog is skipped entirely (silent import with success toast) when there's nothing new to review.

### Step 1 — Columns (Metrics)

Each row in the column review shows:

| Element | Description |
|---------|-------------|
| **Column name** | Header from the file |
| **Sample value** | First non-empty data value |
| **Detected metric** | Auto-detected assignment, editable inline (click to change via dropdown of existing metrics or "Create new metric") |
| **Formula** | Detected formula if applicable, editable inline |
| **Possible Match** | If the column name is similar to an existing metric but not an exact/alias match — shows the candidate for the user to confirm or dismiss |
| **Slice group tag** | CTP / CTD / CTC / F / Est badge |
| **Skip toggle** | Exclude this column from import |

Recognized columns are shown as a collapsed summary at the top. Only new/unrecognized columns are expanded for review.

### Step 2 — Rows (Line Items)

Each row in the line item review shows:

| Element | Description |
|---------|-------------|
| **Incoming row** | Phase + Description + Cost Type as read from the file |
| **Status** | New item, or Possible Match |
| **Possible Match** | The existing line item it resembles (only shown when 2+ of 3 identifier fields are similar) |
| **Action** | [Same item] / [Different] for fuzzy matches; new items are added automatically |

Matched rows (exact or via known alias) are shown as a collapsed summary. Only new items and fuzzy matches are expanded.

### Inline Editing (Both Steps)

When the auto-detection gets something wrong, the user clicks on the detected value and can:

- Select a different existing metric or line item from a dropdown
- Create a new metric or line item on the spot
- Edit the formula expression
- Change the slice group assignment

Corrections are saved to the respective catalogs so the same column or row variation is recognized correctly on future uploads.

### Actions

- **Confirm & Import** — saves new metrics and aliases to catalogs, runs the parser
- **Skip All New** — imports only recognized columns and matched rows, ignores new ones

### Last Forecast Handling

If the engine detects columns that look like prior period data (header contains "Prior", "Last", "Prev", or matches a known metric from an earlier date), they are flagged as **Last Forecast** columns. These map to the previous version's slice and take precedence over the system-stored version history, covering the case where the user made offline adjustments between uploads.

---

## 4. Row Reconciliation

After columns are mapped, the system compares incoming rows against existing line items to catch naming variations that refer to the same item.

### Key Normalization

Before comparison, identifier fields are normalized:

- **Phase code:** uppercase, strip all delimiters (hyphens, spaces, dots, trailing punctuation). `b-100`, `b 100`, `b-100-`, `B.100` all normalize to `B100`.
- **Description:** lowercase, trim whitespace.
- **Cost type:** lowercase, strip whitespace.

Normalized values are used only for matching. The original raw values from the file are always preserved alongside the canonical key so data can be reconstructed if aliases are later separated.

### Multi-Field Fuzzy Matching

A potential match is only proposed when **at least 2 of 3** identifier fields are similar between the incoming row and an existing line item:

| Field | Match type |
|-------|-----------|
| Phase code | Normalized exact match |
| Description | Normalized exact or fuzzy (Levenshtein distance below threshold) |
| Cost type | Normalized exact match |

A single fuzzy field on its own is never surfaced — it would generate too much noise.

### Upload UI — "Possible Match" Column

During upload review, rows with potential matches show an additional **Possible Match** column:

| Incoming Row | Possible Match | Action |
|-------------|----------------|--------|
| `b-100 · Mobilization · 2Labor` | `B100 · Mobilization · 2Labor` | [Same item] [Different] |
| `B200 · Excavation LP · 3Equip` | `B200 · Excavation · 3Equip` | [Same item] [Different] |

- **Same item** — the incoming variation is stored as an alias of the existing canonical item. Future uploads with the same variation auto-resolve silently.
- **Different** — the incoming row is treated as a new, distinct line item.

Rows where all three fields match a known item (or known alias) are auto-resolved with no user prompt.

### Raw Value Preservation

Every upload stores the **original raw values** per row alongside the resolved canonical key. This is critical for separation — if an alias is later removed, the system can go back to each affected project and re-split the rows using the original file data, not the normalized version.

### Alias Storage

Each alias merge records:

- The canonical line item it was merged into
- The raw variation that triggered the merge
- Which project and upload version the merge occurred on

This audit trail enables separation to propagate correctly across historical projects.

---

## 5. Line Item Registry

A dedicated management screen for all canonical line items and their aliases. Located under Admin in the sidebar, alongside the Metrics Catalog.

### Table View

| Column | Description |
|--------|-------------|
| **Line Item** | Canonical name (phase + description + cost type) |
| **Aliases** | All accepted variations, expandable inline |
| **Projects** | Which projects this item appears on, clickable links |
| **Actions** | Merge, Separate, Edit |

### Merge

Select two line items that should be the same → merge them into one canonical entry. One becomes the canonical, the other becomes an alias. This propagates across all historical projects where either item appears — rows that were previously separate are now unified under the same line item.

### Separate

Select an alias on an existing line item → split it out as its own independent line item. This propagates backwards: every historical project where that alias was merged gets updated — the rows are re-split using the preserved raw file values. The separated item gets its own entry in the line item registry and its own service catalog entry.

### Edit

Change the canonical name, add or remove aliases manually, or reassign which canonical item an alias belongs to.

### Services Connection

Line items in the registry are the source of truth for the services catalog (Task 2). One canonical line item = one service entry. Merging two line items merges their service entries. Separating an alias creates a new service entry. The services tab reflects the registry state.

---

## 6. Generic Parser

After columns are mapped to metrics (either auto-detected or confirmed via the mapper), the parser normalizes data into `ProjectionItem[]` objects.

### Process

1. **Build column map** — each file column index is associated with a metric, which knows its sliceGroup and field. Example: column 7 → metric "f-cost" → writes to `item.F.cost`.

2. **Iterate rows** — for each data row:
   - Read identifier columns (Phase, Description, CostType UM) to build the `lineKey` and `keyParts[]`
   - Store the original raw identifier values alongside the normalized key
   - Run the row through reconciliation: check against the line item registry for alias matches. Resolved aliases map to their canonical item; unresolved fuzzy matches are flagged for the user in the upload UI.
   - For each mapped column, write the value into the correct `TimeSlice.field` on the correct slice
   - Formula columns: store the file's value and also re-compute from formula refs. If they diverge beyond a threshold, flag a data integrity warning.

3. **Last forecast columns** — if present, populate a previous forecast reference that the engine uses for variance calculations instead of looking up the stored previous version.

4. **Structure handling** — if breakout structure was detected, group parent/child rows by the suffix pattern before building items. Child rows are associated with their parent item.

5. **Output** — `ProjectionItem[]` compatible with the existing `ingestDump()` and `ingestBatch()` functions. Nothing changes downstream — the projection table, alerts, comments, and trend charts all work the same.

---

## 7. Vista Fallback

The existing Vista adapter (`packages/projections/src/adapters/vista.ts`) remains as a fallback.

### Trigger

If the generic parser fails (throws an error or produces zero valid items), the system retries with the Vista adapter automatically. A warning is logged so detection gaps can be identified and improved.

### Priority

1. Auto-detection engine + generic parser (primary path)
2. Vista adapter (fallback)
3. Error state shown to user (both failed)

The Vista adapter code is not modified — it stays as-is for stability.

---

## UX Flow Summary

### Upload Flow (Unified)

Every upload — first or hundredth — follows the same path. The only difference is how much is already known.

```
Upload spreadsheet (new project or existing)
  → Auto-detection runs (header matching, formula detection, structure detection)
  → Import Dialog opens as a two-step wizard:

  Step 1 — Columns (Metrics)
    → Summary: "X columns recognized · Y new columns to review"
    → Recognized columns listed with auto-mapped metric, collapsed by default
    → New/unrecognized columns shown for review:
        - Detected formula (if any), editable inline
        - "Possible Match" column for metrics similar to existing ones
        - Assign to existing metric, create new, or skip
    → User confirms or corrects

  Step 2 — Rows (Line Items)
    → Summary: "X rows matched · Y new items · Z possible duplicates"
    → Matched rows listed, collapsed by default
    → New line items shown for review
    → Fuzzy matches shown with "Possible Match" column:
        - Existing item it resembles (requires 2 of 3 fields similar)
        - [Same item] or [Different]
    → User confirms or corrects

  → "Confirm & Import"
  → Metrics saved to catalog (new + corrections)
  → Aliases saved to line item registry
  → Line items added to registry + services catalog
  → Projection items created/updated
```

**Silent import:** When Step 1 has zero new columns AND Step 2 has zero new/fuzzy rows, the dialog is skipped entirely. Success toast: "Imported X line items."

### Admin — Line Item Registry

```
Admin → Line Item Registry

  Merge:
    → Select two items that should be the same → "Merge"
    → One becomes canonical, other becomes alias
    → Propagates across all historical projects: rows unified
    → Services catalog entry merged

  Separate:
    → Expand aliases on an item → select alias → "Separate"
    → Alias becomes its own independent line item
    → Propagates backwards: historical projects re-split using preserved raw values
    → New services catalog entry created

  Edit:
    → Change canonical name, add/remove aliases, reassign aliases
```

---

## File Locations

| Component | Location |
|-----------|----------|
| Metric type + catalog logic | `packages/projections/src/metrics/` |
| Auto-detection engine | `packages/projections/src/detection/` |
| Row reconciliation + key normalization | `packages/projections/src/reconciliation/` |
| Line item registry (data model + logic) | `packages/projections/src/registry/` |
| Generic parser | `packages/projections/src/adapters/generic.ts` |
| Mapper dialog component | `apps/web/src/components/mapping-dialog.tsx` |
| Metrics admin page | `apps/web/src/routes/_dashboard/admin.metrics.tsx` |
| Line item registry page | `apps/web/src/routes/_dashboard/admin.registry.tsx` |
| Vista adapter (unchanged) | `packages/projections/src/adapters/vista.ts` |

---

## Tenant Considerations

- Each tenant has its own metrics catalog (stored per-tenant in the Zustand store)
- The auto-detection engine is tenant-agnostic — it doesn't care where the file came from
- Stratagraph currently has `projections: false` in feature flags; when enabled, it gets the same system
- Vista fallback only activates for tenants whose files match Vista's expected format

---

## What This Enables Next

With the mapping template system in place, the remaining projections tasks become straightforward:

- **Task 2 (Services Catalog):** New line items discovered during upload can auto-add to the services catalog since the mapper identifies them.
- **Task 4 (Ticket Generation from Projections):** Projection data is normalized, so ticket generation has clean input.
- **Task 5 (Projection Auto-Creation):** Bid line items seed estimates; upload populates cost side via the same mapper.
- **Task 6 (P&L View):** Revenue from tickets vs costs from uploads — both normalized through the same metric system.
