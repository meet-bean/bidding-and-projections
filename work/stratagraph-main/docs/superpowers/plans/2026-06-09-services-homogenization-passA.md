# Services Homogenization — Pass A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Services screen render BOTH tenants from one shared `Service` model in one `services` store (no adapter shim) — the genuine "one database, one feature." Operations (bids/jobs/invoices) keep reading the old `serviceCatalog` until Pass B.

**Architecture:** Promote Superior's registry (`ServiceItem`/`serviceRegistry`) into the canonical `Service`/`services` store; extend `Service` with the shared identity + money + billing fields; seed Stratagraph's rate card into the SAME store; render both via one `ServicesTable` + an adaptive detail modal. Cost UCs (Original/Actual/Forecast) are derived per service via the metrics resolver from per-source OE/CTD/F bases.

**Tech Stack:** TypeScript, React 19, Zustand, TanStack Table (`DataListShell`), Tailwind v4, vitest. Spec: `docs/superpowers/specs/2026-06-09-services-homogenization-design.md`. Builds on branch `feat/services-ctd-aggregation`.

---

## Context the engineer needs

- The Superior catalog already exists: registry `ServiceItem` (`packages/projections/src/registry/types.ts`) = `{ id, canonicalName, unitOfMeasure, costType, aliases, createdAt, projectIds, sources }`. Engine in `registry.ts`: `createRegistry`, `addServiceItem`, `findFuzzyMatches`, `mergeServiceItems`, `separateAlias`, `editServiceItemName`, `removeServiceItem`, plus selectors `primaryPhase`, and the import classifier `classifyImport`. Tests: `registry/__tests__/registry.test.ts`.
- Aggregation: `apps/web/src/lib/service-catalog-aggregate.ts` has `aggregateCtd`, `resolveCtd`, `ctdMetrics`, `formatMetric`, using `resolveMetricValue` from `@repo/projections`. The metrics catalog groups: `CTD`, `OE` (→ `Est` slice), `F`. UC formulas: `<G>.cost / <G>.qty`.
- `ServiceSource` (today) = `{ projectId, lineKey, phaseCode, date, qty, hours, cost }` where qty/hours/cost are CTD bases.
- Stratagraph rate card: `SERVICE_CATALOG: ServiceCatalogItem[]` in `apps/web/src/data/service-catalog.ts`; item = `{ id, category, name, defaultRate, rateNote, dailyCode?, billingUnit }`. Labels: `CATEGORY_LABELS`, `BILLING_UNIT_LABELS` in the same file.
- Store (`apps/web/src/lib/store.ts`): `serviceRegistry` state + actions `editRegistryItemName`, `separateRegistryAlias`, `setServiceItemUom`, `removeRegistryItem`, `applyReconciliation`, `clearProjectionData`. Seeded in `setTenant`, `toggleDemoMode`, and the initial state via `buildDemoRegistry`/`createRegistry`. `tenantId` is `'stratagraph' | 'superior'`.
- The current Superior screen `SuperiorServices` lives inline in `apps/web/src/routes/_dashboard/services.tsx`; the Stratagraph branch (rate-card table) is the other half of that file.
- Tests: `cd packages/projections && pnpm test`. App typecheck: `cd apps/web && npx tsc --noEmit` (exit 0; a clean tree has no `error TS`).
- Do NOT `git add -A`; stage only files a task names. Never touch the untracked `Superior  Construction/` dir.

## File structure (Pass A)

| File | Responsibility |
|---|---|
| `packages/projections/src/registry/types.ts` | `ServiceItem`→`Service` (+tenantId, recommendedRate, rateNote, billingUnit?); `ServiceSource` ctd/oe/f |
| `packages/projections/src/registry/registry.ts` | engine renamed to `Service`; source upsert for new shape |
| `apps/web/src/lib/service-catalog-aggregate.ts` | `aggregateGroup(catalog, groupId, sources)`; OE/CTD/F UC |
| `apps/web/src/lib/service-rows.ts` | `Service[]` → view rows (identity + derived UCs + usedIn) |
| `apps/web/src/data/service-seed.ts` | `buildServices(tenantId, …)` — Stratagraph rate card + Superior projects → `Service[]` |
| `apps/web/src/lib/store.ts` | single `services` store + actions; seed per tenant |
| `apps/web/src/components/services-table.tsx` | shared table, both tenants |
| `apps/web/src/components/service-detail-dialog.tsx` | tenant-adaptive modal |
| `apps/web/src/routes/_dashboard/services.tsx` | thin wrapper → `<ServicesTable>` |

---

## GROUP 1 — Shared model, store, seeding

### Task 1: Rename `ServiceItem` → `Service`; extend with shared fields

**Files:** `packages/projections/src/registry/types.ts`, `registry.ts`, `registry/__tests__/registry.test.ts`, and every importer (`apps/web/src/lib/{store,service-catalog-aggregate,service-catalog-rows}.ts`, `apps/web/src/components/{service-detail-dialog,service-reconcile-dialog}.tsx`, `apps/web/src/data/seed-demo.ts`, `apps/web/src/routes/_dashboard/services.tsx`, `packages/projections/src/metrics/aggregate.test.ts`).

- [ ] **Step 1: Extend the type** in `types.ts` — rename `ServiceItem` to `Service` and add fields:

```ts
export interface Service {
  id: string;
  tenantId: 'stratagraph' | 'superior';
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;          // Superior cost type code, or Stratagraph category
  aliases: ServiceAlias[];
  createdAt: string;
  projectIds: string[];
  sources: ServiceSource[];
  recommendedRate: number | null;  // Stratagraph defaultRate; Superior null
  rateNote: string | null;
  billingUnit: string | null;      // Stratagraph billing cadence; Superior null
  dailyCode: string | null;        // Stratagraph code; Superior null (phase comes from sources)
}
export interface ServiceRegistry { tenantId: string; items: Service[]; }
```

- [ ] **Step 2: Rename in `registry.ts`** — replace `ServiceItem` with `Service` throughout; in `addServiceItem` the new-item literal must set the new fields with safe defaults: `tenantId: 'superior'`, `recommendedRate: null`, `rateNote: null`, `billingUnit: null`, `dailyCode: null` (the `input` object stays as-is; these default for registry-created Superior items).

- [ ] **Step 3: Update all importers** — change `import type { ServiceItem }` → `{ Service }` and any `ServiceItem` annotations to `Service` in the files listed above. This is a mechanical rename; do NOT change behavior.

- [ ] **Step 4: Run tests + typecheck**

Run: `cd packages/projections && pnpm test`
Run: `cd apps/web && npx tsc --noEmit`
Expected: registry tests green (update any test literal constructing a `Service` to include the new required fields with the defaults above); tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/registry apps/web/src
git commit -m "refactor(services): ServiceItem -> Service with shared identity/money/billing fields"
```

### Task 2: `ServiceSource` carries OE/CTD/F bases

**Files:** `packages/projections/src/registry/types.ts`, `registry.ts`, `registry/__tests__/registry.test.ts`.

- [ ] **Step 1: Write the failing test** (add to `registry.test.ts`):

```ts
describe('ServiceSource OE/CTD/F bases', () => {
  const src = () => ({
    projectId: 'p1', lineKey: 'k', phaseCode: 'B-300', date: '2025-09-01',
    ctd: { qty: 10, hours: 2, cost: 100 },
    oe:  { qty: 12, cost: 90 },
    f:   { qty: 12, cost: 110 },
  });
  it('stores all three slices on the source', () => {
    const reg = addServiceItem(createRegistry('superior'), {
      canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
      sourceProjectId: 'p1', source: src(),
    });
    expect(reg.items[0]!.sources[0]).toEqual(src());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/projections && pnpm test -- registry`
Expected: FAIL (type error / shape mismatch on `source`).

- [ ] **Step 3: Implement** — in `types.ts` replace `ServiceSource`:

```ts
export interface ServiceSource {
  projectId: string; lineKey: string; phaseCode: string; date: string;
  ctd: { qty: number; hours: number; cost: number };
  oe:  { qty: number; cost: number };
  f:   { qty: number; cost: number };
}
```
In `registry.ts`, the source-upsert dedup in `addServiceItem` compares sources by `(projectId, lineKey)` — keep that key; for the "replace if changed" check compare on the nested values (`ctd.qty/hours/cost`, `oe.qty/cost`, `f.qty/cost`) or simply replace when the key matches (idempotent). Adjust any existing registry test source literals to the new shape.

- [ ] **Step 4: Run tests** — `pnpm test -- registry` green.

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/registry
git commit -m "feat(services): ServiceSource carries OE/CTD/F bases"
```

### Task 3: `aggregateGroup` (generalize CTD aggregation to any slice group)

**Files:** `apps/web/src/lib/service-catalog-aggregate.ts`, `packages/projections/src/metrics/aggregate.test.ts`.

- [ ] **Step 1: Write the failing test** (add to `aggregate.test.ts`):

```ts
import { aggregateGroup } from '../../../apps/web/src/lib/service-catalog-aggregate';
// (or co-locate the test with the lib if cross-package import is awkward — keep it in apps/web tests)

it('aggregateGroup OE: sums bases, recomputes uc on sums', () => {
  const catalog = createCatalog('superior');
  const sources = [
    { projectId:'p1', lineKey:'a', phaseCode:'B', date:'',
      ctd:{qty:0,hours:0,cost:0}, oe:{qty:100,cost:1000}, f:{qty:0,cost:0} },
    { projectId:'p2', lineKey:'b', phaseCode:'B', date:'',
      ctd:{qty:0,hours:0,cost:0}, oe:{qty:300,cost:5000}, f:{qty:0,cost:0} },
  ];
  const v = aggregateGroup(catalog, 'OE', sources);
  expect(v['oe-qty']).toBe(400);
  expect(v['oe-cost']).toBe(6000);
  expect(v['oe-uc']).toBeCloseTo(6000/400); // recomputed on sums, not averaged
});
```
(If the cross-package import is awkward, put this test in `apps/web` under a vitest config there, or test `aggregateGroup` via a small co-located spec. Keep the assertions identical.)

- [ ] **Step 2: Run test to verify it fails** — `aggregateGroup` not exported.

- [ ] **Step 3: Implement** in `service-catalog-aggregate.ts` — generalize the existing CTD logic. The group→slice map: `CTD`→CTD, `OE`→Est, `F`→F. Build a synthetic `ProjectionItem` with the relevant slice populated from the summed bases, then resolve every metric in that group:

```ts
import type { Metric, MetricsCatalog, ProjectionItem, ServiceSource } from '@repo/projections';
import { resolveMetricValue } from '@repo/projections';

const ZERO = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
const SLICE_OF: Record<string, 'CTD' | 'Est' | 'F'> = { CTD: 'CTD', OE: 'Est', F: 'F' };

function groupBases(groupId: string, s: ServiceSource): { qty: number; hours: number; cost: number } {
  if (groupId === 'CTD') return s.ctd;
  if (groupId === 'OE') return { qty: s.oe.qty, hours: 0, cost: s.oe.cost };
  return { qty: s.f.qty, hours: 0, cost: s.f.cost }; // F
}

function synthItem(slice: 'CTD' | 'Est' | 'F', b: { qty: number; hours: number; cost: number }): ProjectionItem {
  const base = { lineKey:'', keyParts:[], label:'', unitOfMeasure:'',
    CTP:{...ZERO}, CTD:{...ZERO}, CTC:{...ZERO}, F:{...ZERO}, Est:{...ZERO},
    estVar:0, comp:0, prevForecast:0, calcHrs:0, wsRisk:0, isNew:false, stale:false } as ProjectionItem;
  base[slice] = { ...ZERO, qty: b.qty, hours: b.hours, cost: b.cost };
  return base;
}

export function groupMetrics(catalog: MetricsCatalog, groupId: string): Metric[] {
  return catalog.metrics.filter((m) => m.group === groupId);
}

export function aggregateGroup(catalog: MetricsCatalog, groupId: string, sources: ServiceSource[]): Record<string, number> {
  const sum = sources.reduce((a, s) => { const b = groupBases(groupId, s); return { qty:a.qty+b.qty, hours:a.hours+b.hours, cost:a.cost+b.cost }; }, { qty:0, hours:0, cost:0 });
  const item = synthItem(SLICE_OF[groupId] ?? 'CTD', sum);
  const out: Record<string, number> = {};
  for (const m of groupMetrics(catalog, groupId)) out[m.id] = resolveMetricValue(item, m, { catalog, prevItems: [] });
  return out;
}

/** Convenience: the UC ($/unit) for a group across sources. */
export function groupUC(catalog: MetricsCatalog, groupId: string, sources: ServiceSource[]): number | null {
  const ucMetric = groupMetrics(catalog, groupId).find((m) => m.field === 'uc');
  if (!ucMetric) return null;
  const v = aggregateGroup(catalog, groupId, sources)[ucMetric.id];
  return Number.isFinite(v) && v > 0 ? v : null;
}
```
Update the existing `buildDemoRegistry`/screen callers of `aggregateCtd` to use `aggregateGroup(catalog, 'CTD', sources)` (or keep a thin `aggregateCtd = (c,s)=>aggregateGroup(c,'CTD',s)` alias). Keep `formatMetric`.

- [ ] **Step 4: Run tests** — `cd packages/projections && pnpm test` green; `cd apps/web && npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/service-catalog-aggregate.ts packages/projections/src/metrics/aggregate.test.ts
git commit -m "feat(services): aggregateGroup generalizes OE/CTD/F UC aggregation"
```

### Task 4: Seeding — both tenants into one `Service[]`

**Files:** Create `apps/web/src/data/service-seed.ts`; modify `apps/web/src/data/seed-demo.ts`.

- [ ] **Step 1: Stratagraph builder + Superior builder.** In `service-seed.ts`:

```ts
import type { Service, ProjectionProject } from '@repo/projections';
import { createRegistry, addServiceItem } from '@repo/projections';
import { SERVICE_CATALOG } from './service-catalog';

let _c = 0; const sid = () => `svc-${(++_c).toString(36)}`;

/** Stratagraph rate card → Service[] (operational + recommendedRate; no sources). */
export function buildStratagraphServices(): Service[] {
  return SERVICE_CATALOG.map((it) => ({
    id: it.id, tenantId: 'stratagraph',
    canonicalName: it.name, unitOfMeasure: it.billingUnit.replace(/^per_/, ''),
    costType: it.category, aliases: [], createdAt: '',
    projectIds: [], sources: [],
    recommendedRate: it.defaultRate, rateNote: it.rateNote,
    billingUnit: it.billingUnit, dailyCode: it.dailyCode ?? null,
  }));
}

/** Superior projects → Service[] via the registry (identity + OE/CTD/F sources). */
export function buildSuperiorServices(projects: ProjectionProject[]): Service[] {
  let reg = createRegistry('superior');
  for (const proj of projects) {
    const latest = proj.versions[proj.versions.length - 1];
    if (!latest) continue;
    for (const item of latest.items) {
      reg = addServiceItem(reg, {
        canonicalName: item.label, unitOfMeasure: item.unitOfMeasure,
        costType: item.keyParts[1] || '', sourceProjectId: proj.id,
        source: {
          projectId: proj.id, lineKey: item.lineKey, phaseCode: item.keyParts[0] ?? '', date: latest.createdAt,
          ctd: { qty: item.CTD.qty, hours: item.CTD.hours, cost: item.CTD.cost },
          oe:  { qty: item.Est.qty, cost: item.Est.cost },
          f:   { qty: item.F.qty,  cost: item.F.cost },
        },
      });
    }
  }
  return reg.items;
}
```
(`sid` is available if a builder ever needs fresh ids; the Stratagraph one reuses catalog ids.)

- [ ] **Step 2: Replace `buildDemoRegistry`** in `seed-demo.ts` so it returns a `ServiceRegistry` whose `items` come from `buildSuperiorServices(DEMO_PROJECTION_PROJECTS)`:

```ts
import { buildSuperiorServices } from './service-seed';
export function buildDemoRegistry(tenantId: string) {
  return { tenantId, items: tenantId === 'superior' ? buildSuperiorServices(DEMO_PROJECTION_PROJECTS) : [] };
}
```

- [ ] **Step 3: Typecheck** — `cd apps/web && npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/data/service-seed.ts apps/web/src/data/seed-demo.ts
git commit -m "feat(services): seed builders for both tenants into one Service model"
```

### Task 5: Single `services` store

**Files:** `apps/web/src/lib/store.ts`.

- [ ] **Step 1: Replace `serviceRegistry` with `services: Service[]`.** Keep the existing action NAMES (`editRegistryItemName`, `separateRegistryAlias`, `setServiceItemUom`, `removeRegistryItem`, `applyReconciliation`) but operate on `s.services` (wrap the registry helpers: build a `{tenantId, items: s.services}`, call the helper, write back `.items`). Seed it in `setTenant`/`toggleDemoMode`/initial-state:
  - Superior tenant (or demo): `services: [...buildSuperiorServices(projects)]`.
  - Stratagraph tenant: `services: buildStratagraphServices()`.
  Use the existing `buildDemoRegistry(id).items` for the Superior/demo path, and `buildStratagraphServices()` for Stratagraph. Keep `serviceCatalog` (rate card) intact — operations still use it (Pass B removes it).

- [ ] **Step 2: Typecheck + manual sanity** — `cd apps/web && npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/store.ts
git commit -m "feat(services): single services store seeded per tenant"
```

---

## GROUP 2 — Shared screen & modal

### Task 6: `Service[]` → view rows

**Files:** Create `apps/web/src/lib/service-rows.ts` (replaces `service-catalog-rows.ts`).

- [ ] **Step 1: Implement** the row mapper with derived money:

```ts
import type { MetricsCatalog, Service } from '@repo/projections';
import { primaryPhase } from '@repo/projections';
import { costTypeLabel, type CostType } from './cost-types';
import { groupUC } from './service-catalog-aggregate';

export interface ServiceRow {
  id: string; tenantId: string; name: string;
  type: string;          // costType label OR Stratagraph category (raw)
  code: string | null;   // dailyCode OR primary phase
  unit: string;
  usedIn: number;
  recommendedRate: number | null; rateNote: string | null;
  originalUC: number | null; actualUC: number | null; forecastUC: number | null;
  service: Service;
}

export function toServiceRows(services: Service[], catalog: MetricsCatalog): ServiceRow[] {
  return services.map((s) => {
    const phase = primaryPhase(s); // works on Service (sources/projectIds present)
    const isSup = s.tenantId === 'superior';
    return {
      id: s.id, tenantId: s.tenantId, name: s.canonicalName,
      type: isSup ? costTypeLabel(s.costType) : s.costType, // Superior label; Stratagraph category already human-ish
      code: s.dailyCode ?? phase.code,
      unit: s.unitOfMeasure || '—',
      usedIn: isSup ? s.projectIds.length : 0,
      recommendedRate: s.recommendedRate, rateNote: s.rateNote,
      originalUC:  isSup ? groupUC(catalog, 'OE',  s.sources) : null,
      actualUC:    isSup ? groupUC(catalog, 'CTD', s.sources) : null,
      forecastUC:  isSup ? groupUC(catalog, 'F',   s.sources) : null,
      service: s,
    };
  });
}
```
Delete `service-catalog-rows.ts` and repoint its importers to `service-rows.ts`.

- [ ] **Step 2: Typecheck** — clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/service-rows.ts apps/web/src/lib/service-catalog-rows.ts apps/web/src/routes/_dashboard/services.tsx
git commit -m "feat(services): unified Service view-row mapper"
```

### Task 7: `ServicesTable` (shared)

**Files:** Create `apps/web/src/components/services-table.tsx`.

- [ ] **Step 1: Build the table** rendering `ServiceRow[]` via `DataListShell` (`createColumnHelper`/`DataGridColumnHeader` from `~/components/data-list-shell`). Columns: **Name** (with phase/`code` badge + name), **Type** (badge), **Code**, **Unit** (badge), **Used in**, then four right-aligned $/unit columns — **Recommended Rate, Original UC, Actual UC, Forecast UC** — each cell: `null → "—"`, else `$` + `toLocaleString('en-US',{maximumFractionDigits:2})`, `tabular-nums`, headers `className="justify-end"` (alignment fix already shipped). Props: `{ rows: ServiceRow[]; tenantId: string; onRowClick: (r) => void; actions?: ReactNode }`. Filters: Type + Unit (options derived from the rows), `searchableKeys=['name']`.

- [ ] **Step 2: Typecheck** — clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/services-table.tsx
git commit -m "feat(services): shared ServicesTable for both tenants"
```

### Task 8: Adaptive detail modal

**Files:** `apps/web/src/components/service-detail-dialog.tsx`.

- [ ] **Step 1: Make it tenant-adaptive** on `row.service.tenantId`:
  - **Superior:** the per-source breakdown table with columns = `groupMetrics(catalog,'OE'|'CTD'|'F')` UCs is heavy; for v1 show, per source, the **OE/CTD/F UC** (via `aggregateGroup` on that single source's `[source]`) + a **Totals** row (via `aggregateGroup` on all sources). Keep rename/UoM/merge-split/remove (existing store actions).
  - **Stratagraph:** identity (name, type, code, unit) + **Recommended Rate** (+ `rateNote`), no source breakdown; keep rename if applicable.
  Read `catalog = useStore(s=>s.metricsCatalog)` and `projects = useStore(s=>s.projectionProjects)` for project names.

- [ ] **Step 2: Browser verify** (see Task 10) — opens cleanly for both tenants.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/service-detail-dialog.tsx
git commit -m "feat(services): tenant-adaptive detail modal"
```

### Task 9: `services.tsx` thin wrapper

**Files:** `apps/web/src/routes/_dashboard/services.tsx`.

- [ ] **Step 1: Replace BOTH branches** (Superior `SuperiorServices` and the Stratagraph rate-card table) with one path: `const services = useStore(s=>s.services); const catalog = useStore(s=>s.metricsCatalog); const rows = useMemo(()=>toServiceRows(services, catalog), [services, catalog]);` → render `<ServicesTable rows={rows} tenantId={tenantId} onRowClick={setDetailRow} actions={…}/>` + `<ServiceDetailDialog .../>` + the Import & reconcile dialog (Superior). Keep the "Clear All Data" action (Superior). Remove the dead `ServiceCatalogItem`-based column code from this file (it now lives only in operations, untouched).

- [ ] **Step 2: Typecheck** — clean.

- [ ] **Step 3: Browser verify** (Task 10).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/services.tsx
git commit -m "feat(services): one Services screen for both tenants"
```

### Task 10: Verify (both tenants)

- [ ] **Step 1: Tests + typecheck** — `cd packages/projections && pnpm test` (green); `cd apps/web && npx tsc --noEmit` (exit 0).
- [ ] **Step 2: Browser, Superior tenant** (demo mode on): `/services` shows shared columns + Original/Actual/Forecast UC populated; row → modal shows per-source OE/CTD/F UC + totals that sum; Import & reconcile still works. Screenshot.
- [ ] **Step 3: Browser, Stratagraph tenant** (switch tenant): `/services` shows the SAME columns; Recommended Rate populated (rateNote where rate is null), cost UCs "—"; row → modal shows identity + rate. Screenshot.
- [ ] **Step 4: Confirm operations unbroken** — open a Stratagraph bid and an invoice; they still read the old `serviceCatalog` and work. (Pass B will migrate them.)
- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix(services): post-verification adjustments"
```

---

## Self-review notes (spec coverage)

- One shared `Service` record + single `services` store → Tasks 1, 5. ✓
- Shared column names (Name/Type/Code/Unit/Used-in + 4 $/unit) → Tasks 6, 7. ✓
- Both tenants seeded into one store → Task 4 (Stratagraph rate card + Superior projects). ✓
- Original/Actual/Forecast as UC, derived, catalog-driven → Tasks 2, 3, 6. ✓
- Recommended Rate field (Stratagraph defaultRate; Superior null) → Tasks 1, 4, 6. ✓
- One screen + adaptive modal → Tasks 7, 8, 9. ✓
- Operations untouched in Pass A (still on `serviceCatalog`) → not modified; verified Task 10 step 4. ✓
- Deferred (NOT in plan): edit-Recommended-Rate UI; Pass B operations repoint + deleting `serviceCatalog`. ✓
- Open question (Stratagraph unit bare "day" vs "per day"): Task 4 strips `per_` → bare "day" per spec assumption.
