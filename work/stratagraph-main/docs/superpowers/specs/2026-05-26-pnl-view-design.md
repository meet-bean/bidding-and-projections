# P&L View Design Spec

## Goal

Add a Profit & Loss dashboard to the Reports page. Portfolio rollup shows aggregated KPIs, trend chart, and per-project table. Clicking a project drills into monthly P&L with cost-type breakdown. Works for both tenants: Superior uses uploaded financials, Stratagraph derives data from invoices and job activity.

## Architecture

The P&L view is a new tab on the existing `/reports` route. No new sidebar nav item — it slots alongside the existing equipment utilization and crew availability sections as a peer tab. Data comes from two sources depending on tenant:

- **Superior:** `ProjectionProject.financials` (FinancialSummary) — monthly revenue/cost/profit/gpPct snapshots ingested from Vista ERP uploads. Already exists in the store.
- **Stratagraph:** Revenue derived from invoice totals grouped by project and month. Costs derived from job service runs + bid rates. Computed on the fly from existing store data.

No new backend types needed. The P&L view is pure presentation logic over existing data.

## Data Model

### Existing types (no changes)

```ts
// packages/projections/src/types.ts — already exists
interface FinancialSummaryMonth {
  date: string;       // 'YYYY-MM-01'
  revenue: number;
  cost: number;
  profit: number;
  gpPct: number;
}

interface FinancialSummary {
  months: FinancialSummaryMonth[];
  originalBid: { revenue: number; cost: number; profit: number; gpPct: number } | null;
}

// On ProjectionProject
financials: FinancialSummary | null;
```

### New derived type (presentation only)

```ts
// apps/web/src/lib/pnl.ts
interface PnlProject {
  id: string;
  name: string;
  customer: string;
  months: FinancialSummaryMonth[];
  originalBid: { revenue: number; cost: number; profit: number; gpPct: number } | null;
  totals: { revenue: number; cost: number; profit: number; gpPct: number };
}

interface PnlPortfolio {
  projects: PnlProject[];
  totals: { revenue: number; cost: number; profit: number; gpPct: number };
  months: FinancialSummaryMonth[];  // aggregated across projects
  originalBid: { revenue: number; cost: number; profit: number; gpPct: number } | null;
}
```

### Cost-type breakdown (project detail)

For Superior, aggregate `ProjectionItem` costs by `costType` from the active projection version. Group into standard categories: Labor, Material, Subcontract, Equipment Rental, Other.

For Stratagraph, derive from job service runs: each service has a category in the service catalog. Sum costs by category.

```ts
interface CostBreakdown {
  type: string;    // 'Labor' | 'Material' | 'Subcontract' | 'Equipment' | 'Other'
  amount: number;
  percentage: number;
}
```

## Data Flow

### Superior tenant

```
ProjectionProject.financials.months → PnlProject.months
ProjectionProject.financials.originalBid → PnlProject.originalBid
ProjectionProject.versions[active].items → group by costType → CostBreakdown[]
Aggregate all PnlProject → PnlPortfolio
```

### Stratagraph tenant

```
Invoices grouped by projectId + month → revenue per month
Jobs.serviceRuns × bid rates → cost per month (from confirmed day cards)
Group into PnlProject per job
Service catalog categories → CostBreakdown[]
Aggregate all PnlProject → PnlPortfolio
```

## UI Structure

### Reports page tab bar

Add "P&L" as a new tab on the reports page. Tab order: **Overview** (existing equipment/crew metrics) | **P&L** (new).

### Portfolio view (P&L tab default)

Layout top-to-bottom:

1. **KPI cards row** (4 cards):
   - Total Revenue — green tint if positive
   - Total Cost — red tint
   - Gross Profit — green if positive, red if negative
   - GP% — with "vs bid" delta indicator (green ▲ or red ▼)

2. **Monthly trend chart**:
   - SVG line chart (reuse pattern from ProjectionTrendModal)
   - Two lines: Revenue (solid green) and Cost (dashed red)
   - X-axis: months, Y-axis: dollar amounts
   - Hover shows values (optional, can defer)

3. **Project table**:
   - Columns: Project name (with customer subtitle), Revenue, Cost, Profit, GP%, vs Bid
   - Rows are clickable — navigate to project detail
   - Sorted by revenue descending
   - Profit column: green text if positive, red if negative
   - vs Bid column: green ▲ if above bid GP%, red ▼ if below

### Project detail view (drill-down)

URL: stays on `/reports` with project selection state (query param or local state — not a new route).

Layout top-to-bottom:

1. **Back link**: "← Back to Portfolio"

2. **KPI cards row** (5 cards): Revenue, Cost, Profit, GP%, Bid GP% (with "Original target" subtitle)

3. **Monthly trend chart**: Same as portfolio but filtered to this project

4. **Two-panel layout** (side by side):
   - **Left: Monthly P&L table** — Month, Revenue, Cost, Profit, GP% per row
   - **Right: Cost-type breakdown** — Latest month's costs grouped by type (Labor, Material, Sub, Equipment, Other) with amounts and percentages

### Stratagraph differences

- No "vs Bid" column if no originalBid data exists for a project
- Revenue derived from invoices may show "Billed" instead of "Revenue" label
- Cost breakdown uses service catalog categories instead of projection cost types

## Alerts

Reuse the projection engine's alerting patterns. Flag projects where:

- GP% drops below a threshold (e.g., 8%)
- GP% declines month-over-month for 2+ consecutive months
- Cost exceeds bid estimate by >10%

Display as colored dots or badges on the project rows in the portfolio table. No separate alerts panel — keep it lightweight.

## Testing

- Pure functions for data aggregation (PnlProject from financials, PnlPortfolio from projects, CostBreakdown from items)
- Stratagraph revenue derivation (invoices → monthly totals)
- Edge cases: project with no financials, project with no invoices, empty portfolio, single-month data

## Out of Scope

- Editable P&L (this is read-only)
- Export to PDF/Excel (can add later)
- Real-time updates (data refreshes on page load)
- Hover tooltips on chart (nice-to-have, can defer)
- Portfolio-level cost breakdown (only on project detail)
