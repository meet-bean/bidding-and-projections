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

Five components, built in order:

1. Metrics Catalog (data model + admin page)
2. Auto-Detection Engine
3. Mapper Dialog
4. Generic Parser
5. Vista Fallback Integration

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

## 3. Mapper Dialog

A modal dialog that appears during project creation, immediately after file upload.

### When It Appears

| Scenario | Behavior |
|----------|----------|
| First upload (empty catalog) | Shows all columns for review |
| All columns recognized | No dialog — silent import with success toast |
| Some new columns | Dialog shows only new/unrecognized columns with summary: "12 columns recognized · 3 new columns to review" |

### Column Row Layout

Each row in the mapper shows:

| Element | Description |
|---------|-------------|
| **Column name** | Header from the file |
| **Sample value** | First non-empty data value |
| **Detected metric** | Auto-detected assignment, editable inline (click to change via dropdown of existing metrics or "Create new metric") |
| **Formula** | Detected formula if applicable, editable inline |
| **Slice group tag** | CTP / CTD / CTC / F / Est badge |
| **Skip toggle** | Exclude this column from import |

### Actions

- **Confirm & Import** — saves new metrics to the catalog, runs the parser
- **Skip All New** — imports only recognized columns, ignores new ones

### Inline Editing

When the auto-detection gets something wrong, the user clicks on the detected metric or formula cell and can:

- Select a different existing metric from a dropdown
- Create a new metric on the spot
- Edit the formula expression
- Change the slice group assignment

Corrections are saved to the metrics catalog so the same column is recognized correctly on future uploads.

### Last Forecast Handling

If the engine detects columns that look like prior period data (header contains "Prior", "Last", "Prev", or matches a known metric from an earlier date), they are flagged as **Last Forecast** columns. These map to the previous version's slice and take precedence over the system-stored version history, covering the case where the user made offline adjustments between uploads.

---

## 4. Generic Parser

After columns are mapped to metrics (either auto-detected or confirmed via the mapper), the parser normalizes data into `ProjectionItem[]` objects.

### Process

1. **Build column map** — each file column index is associated with a metric, which knows its sliceGroup and field. Example: column 7 → metric "f-cost" → writes to `item.F.cost`.

2. **Iterate rows** — for each data row:
   - Read identifier columns (Phase, Description, CostType UM) to build the `lineKey` and `keyParts[]`
   - For each mapped column, write the value into the correct `TimeSlice.field` on the correct slice
   - Formula columns: store the file's value and also re-compute from formula refs. If they diverge beyond a threshold, flag a data integrity warning.

3. **Last forecast columns** — if present, populate a previous forecast reference that the engine uses for variance calculations instead of looking up the stored previous version.

4. **Structure handling** — if breakout structure was detected, group parent/child rows by the suffix pattern before building items. Child rows are associated with their parent item.

5. **Output** — `ProjectionItem[]` compatible with the existing `ingestDump()` and `ingestBatch()` functions. Nothing changes downstream — the projection table, alerts, comments, and trend charts all work the same.

---

## 5. Vista Fallback

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

### Project Creation with First Upload

```
Create New Project
  → Upload spreadsheet
  → Mapper dialog opens (all columns shown)
  → System shows auto-detected types and formulas per column
  → User reviews, corrects inline if needed
  → "Confirm & Import"
  → Metrics saved to catalog
  → Projection items created
  → Project opens with data
```

### Subsequent Upload — Known Format

```
Upload spreadsheet to existing project
  → All columns match metrics catalog
  → No dialog — silent import
  → Success toast: "Imported 45 line items"
  → Projection updated with new version
```

### Subsequent Upload — New Columns

```
Upload spreadsheet to existing project
  → 12 columns recognized, 3 new
  → Mapper dialog opens showing only 3 new columns
  → User confirms or skips each
  → "Confirm & Import"
  → New metrics added to catalog
  → Projection updated
```

---

## File Locations

| Component | Location |
|-----------|----------|
| Metric type + catalog logic | `packages/projections/src/metrics/` |
| Auto-detection engine | `packages/projections/src/detection/` |
| Generic parser | `packages/projections/src/adapters/generic.ts` |
| Mapper dialog component | `apps/web/src/components/mapping-dialog.tsx` |
| Metrics admin page | `apps/web/src/routes/_dashboard/admin.metrics.tsx` |
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
