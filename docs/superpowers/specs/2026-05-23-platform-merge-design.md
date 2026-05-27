# Platform Merge: Superior + Stratagraph

> Merge two construction/operations prototypes into a single multi-tenant platform with a reusable projection engine.

## Context

Two apps exist:

- **Stratagraph** — drilling-services operations app (bids, jobs, tickets, wells, equipment, crews). TypeScript, Turborepo monorepo, Tailwind v4, TanStack Router, Zustand, rich `@repo/ui` component library. Better architecture.
- **Superior Construction** — financial cost-projection tool (Vista ERP ingestion, variance analysis, risk scoring, trend charts, editable forecasts, comments, version history). Plain JavaScript, Vite, React 18, Tailwind 3. Has the projection feature we need.

**Goal:** Merge into one platform where:
1. Each client (tenant) gets their own workspace with their own data
2. The projection module is generalized so any client can use it with their own cost data format
3. The platform can be resold to future clients

## Decision: Stratagraph as Base

Stratagraph's monorepo is the foundation. Superior's projection logic gets ported into it as a new `packages/projections` package, with UI components added to `packages/ui`.

Rationale:
- Stratagraph already has: TypeScript, monorepo, shared UI package, proper routing (TanStack), state management (Zustand), ~60 tested UI components
- Porting ~15 JSX files to TypeScript is less work than upgrading Superior's entire stack
- The monorepo structure already supports the package-per-domain pattern we need

## Architecture

```
stratagraph/
├── apps/
│   └── web/                         # Single app, multi-tenant
│       └── src/
│           ├── routes/_dashboard/
│           │   ├── projections.index.tsx        # projection project list
│           │   └── projections.$projectId.tsx   # projection detail (table + charts)
│           ├── components/
│           │   ├── projection-table.tsx         # wires data-grid to projection data
│           │   ├── projection-trend-modal.tsx   # trend chart per line item
│           │   ├── projection-alerts-panel.tsx  # risk alerts sidebar
│           │   ├── projection-comments.tsx      # threaded comments per line item
│           │   └── projection-upload.tsx        # import flow using import-dialog
│           ├── lib/
│           │   ├── store.ts                     # extended with projection slice
│           │   ├── types.ts                     # extended with projection types
│           │   └── tenant.ts                    # tenant config and context
│           └── data/
│               └── seed-projections.ts          # demo data for Superior's Suncoast 3A
├── packages/
│   ├── ui/                          # existing, extended
│   ├── config/                      # existing
│   └── projections/                 # NEW: reusable projection engine
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts             # public API
│           ├── types.ts             # abstract projection data model
│           ├── engine.ts            # variance calculation, derived fields, risk scoring
│           ├── adapters/
│           │   ├── types.ts         # ProjectionAdapter interface
│           │   ├── vista.ts         # Vista .xls/.csv parser (from Superior)
│           │   └── generic-csv.ts   # fallback CSV parser
│           └── export/
│               └── vista-xlsx.ts    # Vista-format .xlsx export
```

## Generalized Projection Data Model

### Core Types (in `packages/projections/src/types.ts`)

```typescript
// A 6-field measurement tuple — the atomic unit of cost data
interface TimeSlice {
  qty: number;
  hours: number;
  unitOfMeasure: string;
  manhoursPerUnit: number;  // hours / qty
  unitCost: number;         // cost / qty
  cost: number;
}

// One line item in a projection
interface ProjectionItem {
  lineKey: string;          // composite key (e.g., "B-100-|2Labor" for Vista)
  keyParts: string[];       // decomposed (e.g., ["B-100-", "2Labor"])
  label: string;            // display name (e.g., "B-100- Mobilization / Labor")

  // 5 time slices per Vista schema
  costThisPeriod: TimeSlice;   // CTP
  costToDate: TimeSlice;       // CTD
  costToComplete: TimeSlice;   // CTC (derived: forecast - costToDate)
  forecast: TimeSlice;         // F (editable)
  estimate: TimeSlice;         // Est (original bid)

  // Derived fields
  prevForecastCost: number;    // last version's forecast.cost (for vsPrev variance)
  qtyPercentComplete: number;  // costToDate.qty / forecast.qty
  costPercentComplete: number; // costToDate.cost / forecast.cost
  riskScore: number;           // 0-100, computed by engine
  riskSignals: RiskSignal[];   // which signals fired
}

// A point-in-time snapshot
interface ProjectionVersion {
  id: string;
  label: string;            // e.g., "March 2026" or filename
  createdAt: string;        // ISO datetime
  items: ProjectionItem[];
}

// A project being tracked
interface ProjectionProject {
  id: string;
  name: string;             // e.g., "Suncoast 3A"
  clientName: string;
  versions: ProjectionVersion[];
  draft: ProjectionVersion | null;  // working copy, not yet committed
  comments: Record<string, Comment[]>;  // keyed by lineKey
}

// Variance measurement
type VarianceLens = 'vsPrev' | 'vsOrig' | 'leftToSpend';

interface VarianceResult {
  lens: VarianceLens;
  delta: number;            // absolute change
  percent: number;          // percentage change
  direction: 'increase' | 'decrease' | 'flat';
  tone: 'positive' | 'negative' | 'neutral';
  // tone depends on context: cost increase = negative, but hours decrease on
  // a labor line with flat cost = positive (efficiency gain)
}

// Risk scoring
interface RiskSignal {
  id: string;
  label: string;
  weight: number;           // 0-1
  fired: boolean;
  detail: string;           // human-readable explanation
}

// Risk configuration — per-tenant thresholds
interface RiskConfig {
  varianceThreshold: number;     // e.g., 0.05 (5%)
  signals: {
    id: string;
    label: string;
    weight: number;              // 0-1
    enabled: boolean;
  }[];
}

// Threaded comment
interface Comment {
  id: string;
  lineKey: string;
  text: string;
  author: string;
  createdAt: string;
  versionId: string;        // which version it was written on
}
```

### Adapter Interface (in `packages/projections/src/adapters/types.ts`)

```typescript
interface ProjectionAdapter {
  id: string;                // "vista", "drilling", "generic"
  label: string;             // "Vista Cost Report"
  fileTypes: string[];       // [".xls", ".xlsx", ".csv"]

  // Parse an uploaded file into projection items
  parse(file: File): Promise<ProjectionItem[]>;

  // Optional: export a version back to the source format
  export?(version: ProjectionVersion): Promise<Blob>;

  // Column display configuration
  columns: {
    keyPartLabels: string[];           // ["Phase", "Cost Type"]
    additionalColumns?: ColumnDef[];   // adapter-specific columns
  };
}
```

### Engine (in `packages/projections/src/engine.ts`)

Ported from Superior's `projectStore.js` and `alerts.js`, converted to TypeScript and made stateless:

- `deriveSlice(slice: TimeSlice): TimeSlice` — recalculate unit rates from raw inputs
- `deriveItem(item: ProjectionItem, prevForecast?: TimeSlice): ProjectionItem` — recalculate CTC, percentages, risk
- `computeVariance(current: TimeSlice, baseline: TimeSlice, lens: VarianceLens): VarianceResult`
- `computeRiskScore(item: ProjectionItem, config: RiskConfig): { score: number, signals: RiskSignal[] }`
- `ingestVersion(items: ProjectionItem[], prevVersion?: ProjectionVersion): ProjectionVersion` — derive all fields for a new version

The engine is a pure-function library. No state, no side effects. The Zustand store in `apps/web` calls these functions.

## UI Components

Built on existing `@repo/ui` primitives:

| New Component | Based On | Purpose |
|---|---|---|
| `projection-table.tsx` | `data-grid` + `data-grid-column-header` | Main projection table with editable forecast cells, variance highlighting, risk badges |
| `projection-trend-modal.tsx` | `visx/line-chart` + `dialog` | Per-line-item trend chart showing cost/unit-rate over versions |
| `projection-alerts-panel.tsx` | `card` + `badge` + `alert` | Risk alerts sidebar with signal breakdown |
| `projection-comments.tsx` | `sheet` + `textarea` + `avatar` | Threaded comments per line item |
| `projection-upload.tsx` | `import-dialog` | File upload + preview + adapter auto-detection |
| `projection-summary-rows.tsx` | `data-grid` footer | Summary rows grouped by cost type |

### Editable Cells

The projection table needs inline-editable cells for forecast values (qty, hours, cost). These support:
- Direct number input
- Math expressions (e.g., `38*5`) with live preview
- Currency formatting on blur
- `Number.isFinite()` validation (existing Superior guardrail)

### Variance Highlighting

Three-tier visual treatment matching the design system:
- `destructive-soft` background for negative variances > 5%
- `success-soft` background for positive variances > 5%
- No highlight for variances within threshold

Threshold is configurable per tenant in the risk config.

## Multi-Tenant Strategy

### Tenant Configuration

```typescript
interface TenantConfig {
  id: string;                    // "superior", "stratagraph"
  name: string;                  // "Superior Construction"
  logo?: string;
  adapter: ProjectionAdapter;    // which parser/exporter to use
  riskConfig: RiskConfig;        // signal weights and thresholds
  features: {
    projections: boolean;        // Superior: true, Stratagraph: later
    operations: boolean;         // Stratagraph: true, Superior: later
    // more flags as modules are added
  };
  sidebarItems: SidebarItem[];   // which nav items to show
}
```

### Tenant Resolution

For now: a `tenant` key in the Zustand store, switchable via a tenant picker in the sidebar header. URL-based (`?tenant=superior`) as a convenience.

No authentication or backend yet — same as current state. When a backend is added, tenant becomes a server-side concept tied to auth.

### Sidebar

The sidebar shows different items per tenant:
- **Stratagraph:** Home, Bids, Jobs, Tickets, Equipment, Yards, Crew, Reports, Users, Services
- **Superior:** Home (dashboard), Projections
- Items controlled by `features` flags — turning on `projections` for Stratagraph later just flips a boolean

### Seed Data

Each tenant has its own seed data:
- Stratagraph: existing `seed-data.ts` (bids, jobs, wells, etc.)
- Superior: new `seed-projections.ts` with Suncoast 3A demo data (4-6 monthly versions ported from the existing demo)

## Migration Plan (What Gets Ported)

From Superior's `projections-app/src/`:

| Source File | Destination | Notes |
|---|---|---|
| `store/projectStore.js` | `packages/projections/src/engine.ts` + `apps/web/src/lib/store.ts` | Split: pure functions → engine, state management → store |
| `utils/parseVista.js` | `packages/projections/src/adapters/vista.ts` | Convert to TS, implement adapter interface |
| `utils/parseBatchUpload.js` | `packages/projections/src/adapters/vista.ts` | Merge with Vista adapter |
| `utils/exportVista.js` | `packages/projections/src/export/vista-xlsx.ts` | Convert to TS |
| `utils/alerts.js` | `packages/projections/src/engine.ts` | Risk scoring becomes part of engine |
| `utils/variance.js` | `packages/projections/src/engine.ts` | Variance calculation becomes part of engine |
| `utils/format.js` | `packages/ui/src/lib/format.ts` or keep in app | Currency/number formatting |
| `utils/csv.js` | `packages/projections/src/adapters/generic-csv.ts` | Generic CSV fallback |
| `components/ProjectionsTable.jsx` | `apps/web/src/components/projection-table.tsx` | Rebuild on data-grid |
| `components/TrendChartModal.jsx` | `apps/web/src/components/projection-trend-modal.tsx` | Rebuild on visx charts |
| `components/AlertsPanel.jsx` | `apps/web/src/components/projection-alerts-panel.tsx` | Rebuild on card/badge |
| `components/CommentsModal.jsx` | `apps/web/src/components/projection-comments.tsx` | Rebuild on sheet |
| `components/ImportReviewModal.jsx` | `apps/web/src/components/projection-upload.tsx` | Rebuild on import-dialog |
| `components/Dashboard.jsx` | `apps/web/src/routes/_dashboard/projections.index.tsx` | Portfolio view |
| `components/Sidebar.jsx` | Not needed | Use existing app-sidebar |
| `components/Topbar.jsx` | Not needed | Use existing layout |
| `components/EditableCell.jsx` | `apps/web/src/components/projection-table.tsx` | Inline in table component |
| `components/SummaryRows.jsx` | `apps/web/src/components/projection-summary-rows.tsx` | Rebuild on data-grid footer |
| `components/ColumnPicker.jsx` | Not needed | data-grid has built-in column visibility |
| `components/RowDetail.jsx` | `apps/web/src/components/projection-table.tsx` | Expandable row in data-grid |
| `components/FinancialChart.jsx` | `apps/web/src/routes/_dashboard/projections.index.tsx` | Dashboard charts |

## What Stays Untouched in Stratagraph

All existing Stratagraph functionality remains as-is:
- All routes under `_dashboard/` (home, bids, jobs, tickets, equipment, yards, crew, reports, services, users, customers)
- All `@repo/ui` components
- Store, types, seed data
- Navigation, layout, breadcrumbs

The merge is additive — we're adding the projection module alongside existing features, not modifying them.

## Out of Scope

- Backend / API / database (stays client-side with Zustand + localStorage)
- Authentication / authorization
- Real multi-tenant deployment (separate databases, tenant isolation)
- Mobile-responsive projection table
- PDF report generation
- Stratagraph's own P1/P2 polish items (those are tracked separately)
