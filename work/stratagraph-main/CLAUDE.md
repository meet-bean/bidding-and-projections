# Superior + Stratagraph Platform

> Multi-tenant operations platform. **Stratagraph** tenant: drilling-services operations (bids, jobs, tickets, equipment, crews). **Superior Construction** tenant: cost projection module (Vista ERP data, variance analysis, risk scoring, trend charts, comments).

## Project Overview

- **Stratagraph client:** Mickey (core user) — drilling operations, bids → jobs → tickets
- **Superior Construction client:** Financial cost projection tracking via Vista ERP reports
- **Platform goal:** Single monorepo, multi-tenant. Each client gets feature-flagged modules. The projection engine (`packages/projections`) is generalized for resale to future clients.
- **Status:** Platform merge complete as of 2026-05-23. Stratagraph demo was 2026-05-21.

## Tech Stack

| Layer    | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Build    | Turborepo + pnpm workspaces, Vite 7                     |
| UI       | React 19, Tailwind v4, lucide-react, tw-animate-css     |
| Data     | TanStack Query, Zod                                     |
| State    | Zustand                                                 |
| Routing  | TanStack Router + Start                                 |
| Server   | Nitro (nightly)                                         |
| Language | TypeScript 5, Node 22                                   |

## Workspace

```
stratagraph/
├── apps/
│   └── web/                # Vite + TanStack Start app (multi-tenant)
│       └── src/
│           ├── components/ # bid-editor, projection-table, projection-comments,
│           │               # projection-alerts-panel, projection-trend-modal,
│           │               # projection-upload, entity-dialogs, navigation, ...
│           ├── data/       # seed-data, seed-projections, service-catalog
│           ├── lib/        # store (zustand, projection + tenant slices), types, tenant, ticket-builder
│           └── routes/     # _dashboard/{home,bids,jobs,tickets,equipment,reports,services,
│           │               #             projections.index,projections.$projectId}
├── packages/
│   ├── ui/                 # ~60+ shared UI components
│   ├── config/             # tsconfig, eslint
│   └── projections/        # NEW: generalized projection engine
│       └── src/
│           ├── types.ts    # TimeSlice, ProjectionItem, ProjectionProject, ...
│           ├── engine.ts   # pure functions: ingest, derive, variance, alerts, comments
│           ├── adapters/   # vista.ts, batch-upload.ts, types.ts
│           └── export/     # vista-xlsx.ts, csv.ts
├── turbo.json
└── pnpm-workspace.yaml
```

## Data Schema

Domain (drilling services sold by Stratagraph to oil & gas customers):

- **Customer** — has many **Wells**
- **Well** — a single drilling site; one job at a time
- **Bid** — proposal to a customer; **converts into a Job** when accepted
- **Job** — the work at one Well. Has assigned **field workers**, **equipment**, and **services**. One job is always at exactly one well.
- **Ticket** — a bill sent to the customer for work on a job. A job produces **multiple tickets** over its life.
- **Equipment** — owned by Stratagraph; stored in a **Yard** when not assigned to a job.
- **Yard** — physical storage location for equipment.
- **Service** — line-item offering from the service catalog ([service-catalog.ts](apps/web/src/data/service-catalog.ts)).

Seed data lives in [seed-data.ts](apps/web/src/data/seed-data.ts). Ticket generation logic in [ticket-builder.ts](apps/web/src/lib/ticket-builder.ts).

## Multi-Tenant Architecture

### Tenant Switching
- Sidebar footer has a `<select>` to switch tenants; persists to `localStorage`
- URL convenience: `?tenant=superior` on first load seeds localStorage
- Feature flags live in [tenant.ts](apps/web/src/lib/tenant.ts): `{ projections: boolean, operations: boolean }`
- Sidebar nav items are derived from the active tenant's feature flags

### Tenants
| Tenant | ID | Features | Seed data |
|---|---|---|---|
| Stratagraph | `stratagraph` | operations | seed-data.ts (bids, jobs, wells, ...) |
| Superior Construction | `superior` | projections | seed-projections.ts (Suncoast 3A, 4 versions) |

## Current State

### Platform merge (done 2026-05-23)
- **done** — `packages/projections`: engine, Vista adapter, batch-upload, XLSX/CSV export
- **done** — Projection routes: `/projections` (list) + `/projections/:projectId` (detail)
- **done** — Projection table with editable forecast cells, variance highlighting, progress bars
- **done** — Trend modal (SVG multi-line chart per line item)
- **done** — Comments panel (project-level, rolls over across versions)
- **done** — Alerts panel (computed from engine, 9 alert types)
- **done** — Upload dialog (batch Vista file import)
- **done** — Multi-tenant sidebar + tenant switcher
- **done** — P&L View on Reports page: portfolio rollup (KPIs, trend chart, project table) + per-project drill-down (monthly P&L, cost-type breakdown). Both tenants: Superior uses uploaded financials, Stratagraph derives from invoices + job service runs. Margin alerts on project rows.

### Stratagraph P0 — Demo flows (all done)
1. **done** — Bid creation and editing ([bid-editor.tsx](apps/web/src/components/bid-editor.tsx))
2. **done** — Bid → Job conversion
3. **done** — Job detail with field workers, equipment, services, day cards, activity tab
4. **done** — Ticket generation from job
5. **done** — Customer + unit (well) dialogs, equipment, yards, services, reports, home dashboard

### Stratagraph P1 — Pre-demo polish (from 2026-05-20 internal review)
1. Wells as child of Customer; well selector on Bid
2. Bid accept/reject state (Pending → Accepted)
3. New Job pulls from Accepted bids only; auto-populates from bid
4. Equipment + crew assignment moves to the Bid (kill Job's Services & Assignment tab)
5. Field ticket start date locked to "day after last ticket"; end date editable
6. Generate-ticket button always says "Generate" (not "View")
7. Home screen rework (needs OK — nav-adjacent)
8. Equipment utilization report
9. Crew availability report
10. Equipment status terms: Deployed / Available
11. Job → Activity tab: show equipment; "replace equipment" action
12. Ticket statuses: Created / Sent / Signed / Paid

### P2 — Deferred
1. Service shorthands → multi-line-items schema
2. Mobile UX
3. Cosmetic: double-border on team/customers search bar
4. Click-yard-to-see-units
5. Bid PDF / send-bid flow

## Conventions

- Existing code conventions inferred from the repo — no hard style rules established yet.

## Guardrails (Never Bypass)

- **Never add new navigation (sidebar items, top-level routes, breadcrumb entries) without consulting first.** Information architecture is the demo's spine — changes there need human sign-off.

## Stakeholder Context

- **Mickey (core user):** Feels the daily pain of tracking projects in his head and Excel. Wants to see his workflow reflected — bids, jobs, wells, crews, equipment — without leaving the app. Demo must make him feel "this is mine."
- **Mickey's boss (budget approver):** Joining the demo. Time-saved + error-reduction is necessary but **not sufficient**. The pitch to him is that better visibility into equipment and crew utilization will **increase revenue**. Surface anything that demonstrates utilization, capacity, or bottlenecks.

## Reference Documents

- Stakeholder transcript (forthcoming) — source for the P1 feedback pass.
