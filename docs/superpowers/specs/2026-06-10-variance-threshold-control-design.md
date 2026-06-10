# Variance Threshold Control — Design

**Date:** 2026-06-10
**Status:** Approved

## Problem

The projections variance threshold is a hardcoded constant (`VARIANCE_THRESHOLD_PCT = 5` in `packages/projections/src/engine.ts`). It drives (a) when variance alerts fire (forecast vs last month, forecast vs original bid) and (b) what the Status → Variance filter matches. Users can't tune it.

## Decision

**One user-configurable threshold, set from the projections toolbar.** Variance ≥ threshold → alert icon shows AND the Variance filter catches the row. No second threshold: the old hardcoded 15% medium→high severity upgrade on variance alerts is removed — variance alerts are always medium severity.

## Design

### Engine (`packages/projections/src/engine.ts`)

- `computeAlerts(project, thresholdPct = VARIANCE_THRESHOLD_PCT)` — optional param, default preserves current behavior.
- The two variance alert rules (`var-prev`, `var-orig`) compare against `thresholdPct` and always emit `severity: 'medium'` (15% upgrade removed).
- `VARIANCE_THRESHOLD_PCT` stays exported as the default value.

### State (`apps/web/src/lib/store.ts`)

- `varianceThresholdPct: number` (default 5) + `setVarianceThresholdPct(pct)` in the projection slice, persisted to localStorage so it survives reload.

### UI (`apps/web/src/components/projection-toolbar.tsx`)

- Quiet inline control next to the Filters reading "Variance ≥ 5%"; click opens a small popover with a number input (0.5 steps, clamped 0–100). Platform quiet-chrome style.
- `applyProjectionFilters` takes `thresholdPct` so the Variance filter and the alert icons always agree.

### Call sites

All `computeAlerts(project)` callers pass the store value: projection-table, projection-dashboard (×2), projection-alerts-panel, projections.$projectId route.

### Real-time behavior

Alerts are pure recomputes (`useMemo` keyed on project + threshold) — changing the threshold instantly updates row icons, alerts panel, dashboard counts, and filter results. Resolved alerts are tracked by stable IDs, so alerts re-hidden by raising the threshold reappear with their resolved state intact when lowered again.

### Consequence (accepted)

The "High risk" filter no longer catches large variances — only other high-severity rules (e.g. overspend).

## Out of scope

- Per-tenant/settings-page persistence of the threshold.
- Threshold-derived severity tiers.
