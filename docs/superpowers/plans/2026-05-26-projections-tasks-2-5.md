# Projections Tasks 2–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the services catalog, monthly job screen, invoice generation from forecasts, and projection auto-creation — completing the projections tool for both Superior and Stratagraph tenants.

**Architecture:** Four phases built in dependency order. Phase 0 renames tickets→invoices and jobs→projects internally (terminology standardization). Phase 1 builds the line item registry and services catalog. Phase 2 adds the monthly entry form for Superior. Phase 3 wires invoice generation from forecasts and projection auto-creation from uploads.

**Tech Stack:** React 19, Zustand 5, TanStack Router, Tailwind v4, @repo/ui components, @repo/projections engine, Vitest

---

## File Structure

### Phase 0 — Terminology Standardization
- Modify: `apps/web/src/lib/types.ts` — Rename `FieldTicket` → `Invoice`, `TicketStatus` → `InvoiceStatus`, `jobId` → `projectId`, add `forecastVersionId`
- Modify: `apps/web/src/lib/store.ts` — Rename all ticket references to invoice, jobId to projectId in invoice methods
- Modify: `apps/web/src/lib/ticket-builder.ts` → rename file to `invoice-builder.ts`, update types
- Modify: `apps/web/src/lib/tenant.ts` — Nav label "Tickets" → "Invoices"
- Modify: `apps/web/src/routes/_dashboard/tickets.index.tsx` → rename to `invoices.index.tsx`
- Modify: `apps/web/src/routes/_dashboard/tickets.$ticketId.tsx` → rename to `invoices.$invoiceId.tsx`
- Modify: `apps/web/src/data/seed-data.ts` — Rename seed ticket references
- Modify: `apps/web/src/data/seed-superior.ts` — Same
- Modify: All components that reference `FieldTicket`, `ticket`, or `jobId` on tickets

### Phase 1 — Line Item Registry & Services Catalog
- Create: `packages/projections/src/registry/types.ts` — `LineItem`, `LineItemAlias`, `LineItemRegistry` types
- Create: `packages/projections/src/registry/registry.ts` — CRUD, merge, separate, alias matching, fuzzy matching
- Create: `packages/projections/src/registry/index.ts` — Re-export
- Modify: `packages/projections/src/index.ts` — Export registry module
- Modify: `apps/web/src/lib/store.ts` — Add `lineItemRegistry` slice per tenant
- Modify: `apps/web/src/lib/types.ts` — Add tenant-aware registry state types
- Create: `apps/web/src/routes/_dashboard/admin.registry.tsx` — Line Item Registry admin page
- Modify: `apps/web/src/routes/_dashboard/services.tsx` — Wire to registry instead of hardcoded catalog
- Modify: `apps/web/src/lib/tenant.ts` — Add registry nav item under Admin
- Create: `packages/projections/src/registry/__tests__/registry.test.ts` — Unit tests

### Phase 2 — Monthly Entry Form
- Create: `apps/web/src/components/monthly-entry-form.tsx` — New component: rows=line items, inputs=qty+hours per item per month
- Modify: `apps/web/src/lib/store.ts` — Add monthly quantity getters/setters that read/write `DailyQuantity` aggregated to month level
- Modify: `apps/web/src/lib/types.ts` — Add `MonthlyQuantity` type (convenience wrapper)
- Modify: `apps/web/src/routes/_dashboard/jobs.index.tsx` or equivalent project route — Render monthly form for Superior tenant
- Create: `apps/web/src/components/month-picker.tsx` — Month selector component

### Phase 3 — Invoice from Forecast + Projection Auto-Creation
- Create: `apps/web/src/lib/forecast-invoice-builder.ts` — Build invoice lines from submitted forecast data
- Modify: `apps/web/src/lib/store.ts` — Add `submitForecast()`, `generateInvoiceFromForecast()` actions
- Modify: `packages/projections/src/engine.ts` — Add `lockVersion()` for forecast submission
- Modify: `apps/web/src/routes/_dashboard/invoices.index.tsx` — Add "Generate Invoice" with project/forecast selector
- Modify: `apps/web/src/lib/store.ts` — Add `autoCreateProjectionFromUpload()` that also creates a bid from estimate values

---

## Phase 0: Terminology Standardization

### Task 1: Rename FieldTicket → Invoice in types

**Files:**
- Modify: `apps/web/src/lib/types.ts`

This is a mechanical rename. Every downstream task depends on this.

- [ ] **Step 1: Rename types in types.ts**

Replace these type definitions:

```typescript
// OLD
export type TicketStatus = 'draft' | 'sent' | 'paid';
export interface FieldTicket {
  id: string;
  ticketNumber: string;
  jobId: string;
  status: TicketStatus;
  // ...
}

// NEW
export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export interface Invoice {
  id: string;
  invoiceNumber: string;
  /** The project this invoice bills for. Same entity as "job" in Stratagraph UI. */
  projectId: string;
  status: InvoiceStatus;
  rangeStart: string;
  rangeEnd: string;
  generatedDate: string;
  sentDate?: string;
  signedDate?: string;
  signedBy?: string;
  paidDate?: string;
  totalUsd: number;
  notes?: string;
  /** When generated from a forecast (Superior flow), references the locked version. */
  forecastVersionId?: string;
}
```

Also add backward-compat type aliases at the bottom temporarily (remove after all references are updated):
```typescript
/** @deprecated Use Invoice */
export type FieldTicket = Invoice;
/** @deprecated Use InvoiceStatus */
export type TicketStatus = InvoiceStatus;
```

- [ ] **Step 2: Verify the app still compiles**

Run: `cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main" && pnpm tsc --noEmit 2>&1 | head -30`
Expected: No errors (deprecation aliases keep things working)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/types.ts
git commit -m "refactor: rename FieldTicket → Invoice, add projectId and forecastVersionId"
```

### Task 2: Rename ticket references in store

**Files:**
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Rename store state and methods**

In the store state interface, rename:
- `tickets: FieldTicket[]` → `invoices: Invoice[]`
- `createTicket()` → `createInvoice()`
- `setTicketStatus()` → `setInvoiceStatus()`
- All internal references to `ticket` → `invoice`
- All references to `.jobId` on tickets → `.projectId`

In `deriveBidStatus()`, update the parameter type and field access:
```typescript
export function deriveBidStatus(
  bid: Bid,
  jobs: Job[],
  invoices: Invoice[]
): BidStatus {
  if (bid.status !== 'accepted') return bid.status;
  const bidJobs = jobs.filter((j) => j.bidId === bid.id);
  if (bidJobs.length === 0) return 'accepted';
  if (!bidJobs.every((j) => j.status === 'completed')) return 'accepted';
  const bidInvoices = invoices.filter((inv) => bidJobs.some((j) => j.id === inv.projectId));
  if (bidInvoices.length === 0) return 'accepted';
  if (!bidInvoices.every((inv) => inv.status === 'paid')) return 'accepted';
  return 'completed';
}
```

In `seedForTenant()`, rename `tickets` key to `invoices`.

- [ ] **Step 2: Rename ticket-builder.ts → invoice-builder.ts**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main"
git mv apps/web/src/lib/ticket-builder.ts apps/web/src/lib/invoice-builder.ts
```

In the renamed file, rename `TicketLine` → `InvoiceLine`, `BuildLinesInput` → `BuildInvoiceLinesInput`, `buildTicketLines` → `buildInvoiceLines`, `sumTicketTotal` → `sumInvoiceTotal`.

- [ ] **Step 3: Update all imports across the app**

Search and replace in all `.ts`/`.tsx` files:
- `from './ticket-builder'` → `from './invoice-builder'`
- `from '~/lib/ticket-builder'` → `from '~/lib/invoice-builder'`
- `buildTicketLines` → `buildInvoiceLines`
- `sumTicketTotal` → `sumInvoiceTotal`
- `TicketLine` → `InvoiceLine`
- References to `store.tickets` → `store.invoices`
- References to `createTicket` → `createInvoice`
- References to `setTicketStatus` → `setInvoiceStatus`

Run: `grep -r "ticket" apps/web/src/ --include="*.ts" --include="*.tsx" -l` to find remaining references.

- [ ] **Step 4: Rename seed data**

In `apps/web/src/data/seed-data.ts`: rename `SEED_TICKETS` → `SEED_INVOICES`, update all `ticketNumber` → `invoiceNumber`, `jobId` → `projectId`.

In `apps/web/src/data/seed-superior.ts`: rename `SC_TICKETS` → `SC_INVOICES`, same field renames.

- [ ] **Step 5: Verify compilation**

Run: `cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main" && pnpm tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename all ticket references to invoice across store, builder, and seed data"
```

### Task 3: Rename ticket routes and UI labels

**Files:**
- Rename: `apps/web/src/routes/_dashboard/tickets.index.tsx` → `invoices.index.tsx`
- Rename: `apps/web/src/routes/_dashboard/tickets.$ticketId.tsx` → `invoices.$invoiceId.tsx`
- Modify: `apps/web/src/lib/tenant.ts`

- [ ] **Step 1: Rename route files**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main"
git mv apps/web/src/routes/_dashboard/tickets.index.tsx apps/web/src/routes/_dashboard/invoices.index.tsx
git mv "apps/web/src/routes/_dashboard/tickets.\$ticketId.tsx" "apps/web/src/routes/_dashboard/invoices.\$invoiceId.tsx"
```

- [ ] **Step 2: Update route file internals**

In `invoices.index.tsx`:
- Update the `createFileRoute` path from `/tickets` to `/invoices`
- Rename all UI text: "Tickets" → "Invoices", "ticket" → "invoice", "Generate Ticket" → "Generate Invoice"
- Update navigation links from `/tickets/` to `/invoices/`

In `invoices.$invoiceId.tsx`:
- Update `createFileRoute` path from `/tickets/$ticketId` to `/invoices/$invoiceId`
- Rename param from `ticketId` to `invoiceId`
- Update all UI text: "Field Service Ticket" → "Invoice", "Ticket #" → "Invoice #"

- [ ] **Step 3: Update nav labels in tenant.ts**

```typescript
// In OPERATIONS_NAV, change:
{ id: 'invoices', label: 'Invoices', href: '/invoices', icon: 'Receipt' },

// In the merge logic, update the id check:
// (was 'tickets', now 'invoices')
```

- [ ] **Step 4: Update all internal links**

Search for `/tickets` in component files and update to `/invoices`:
- `job-activity-tab.tsx` (locked row links to ticket)
- `home.tsx` (dashboard may link to tickets)
- `notification` action hrefs
- Any `navigate()` or `Link` to `/tickets/`

Run: `grep -r "/tickets" apps/web/src/ --include="*.tsx" -l` to find remaining references.

- [ ] **Step 5: Remove deprecated type aliases from types.ts**

Now that all references are updated, remove:
```typescript
// DELETE these lines:
export type FieldTicket = Invoice;
export type TicketStatus = InvoiceStatus;
```

- [ ] **Step 6: Verify app runs**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main" && pnpm dev
```

Navigate to `/invoices` — should show the invoice list. Click an invoice — should show detail.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename ticket routes to invoices, update all nav and UI labels"
```

---

## Phase 1: Line Item Registry & Services Catalog

### Task 4: Line Item Registry data model

**Files:**
- Create: `packages/projections/src/registry/types.ts`
- Create: `packages/projections/src/registry/registry.ts`
- Create: `packages/projections/src/registry/index.ts`
- Modify: `packages/projections/src/index.ts`
- Create: `packages/projections/src/registry/__tests__/registry.test.ts`

- [ ] **Step 1: Write the registry types**

Create `packages/projections/src/registry/types.ts`:

```typescript
export interface LineItemAlias {
  raw: string;
  normalizedTo: string;
  sourceProjectId: string;
  sourceUploadDate: string;
}

export interface LineItem {
  id: string;
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;
  aliases: LineItemAlias[];
  createdAt: string;
  projectIds: string[];
}

export interface LineItemRegistry {
  tenantId: string;
  items: LineItem[];
}

export interface FuzzyMatch {
  existingItem: LineItem;
  matchedFields: ('name' | 'costType' | 'unitOfMeasure')[];
  confidence: number;
}
```

- [ ] **Step 2: Write failing tests for core registry operations**

Create `packages/projections/src/registry/__tests__/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createRegistry,
  addLineItem,
  findLineItem,
  findFuzzyMatches,
  mergeLineItems,
  separateAlias,
  normalizeKey,
} from '../registry';

describe('normalizeKey', () => {
  it('uppercases and strips delimiters', () => {
    expect(normalizeKey('b-100')).toBe('B100');
    expect(normalizeKey('B.100-')).toBe('B100');
    expect(normalizeKey(' b 100 ')).toBe('B100');
  });
});

describe('createRegistry', () => {
  it('creates empty registry for tenant', () => {
    const reg = createRegistry('superior');
    expect(reg.tenantId).toBe('superior');
    expect(reg.items).toEqual([]);
  });
});

describe('addLineItem', () => {
  it('adds a new item', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    expect(reg.items).toHaveLength(1);
    expect(reg.items[0].canonicalName).toBe('Concrete Formwork');
    expect(reg.items[0].projectIds).toEqual(['proj-1']);
  });

  it('skips duplicate by normalized name + costType', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    reg = addLineItem(reg, {
      canonicalName: 'concrete formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-2',
    });
    expect(reg.items).toHaveLength(1);
    expect(reg.items[0].projectIds).toEqual(['proj-1', 'proj-2']);
  });
});

describe('findLineItem', () => {
  it('finds by canonical name', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Rebar Installation',
      unitOfMeasure: 'TON',
      costType: '3Material',
      sourceProjectId: 'proj-1',
    });
    const found = findLineItem(reg, 'rebar installation', '3Material');
    expect(found?.canonicalName).toBe('Rebar Installation');
  });

  it('finds by alias', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Rebar Installation',
      unitOfMeasure: 'TON',
      costType: '3Material',
      sourceProjectId: 'proj-1',
    });
    reg = mergeLineItems(reg, reg.items[0].id, {
      raw: 'Rebar Install.',
      normalizedTo: reg.items[0].id,
      sourceProjectId: 'proj-2',
      sourceUploadDate: '2026-05-26',
    });
    const found = findLineItem(reg, 'Rebar Install.', '3Material');
    expect(found?.canonicalName).toBe('Rebar Installation');
  });
});

describe('findFuzzyMatches', () => {
  it('returns matches when 2 of 3 fields are similar', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    const matches = findFuzzyMatches(reg, 'Concrete Formwrk', 'SF', '2Labor');
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedFields).toContain('costType');
  });

  it('returns empty when only 1 field matches', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    const matches = findFuzzyMatches(reg, 'Steel Erection', 'TON', '2Labor');
    expect(matches).toHaveLength(0);
  });
});

describe('mergeLineItems', () => {
  it('adds alias to existing item', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    reg = mergeLineItems(reg, reg.items[0].id, {
      raw: 'Conc. Formwork',
      normalizedTo: reg.items[0].id,
      sourceProjectId: 'proj-2',
      sourceUploadDate: '2026-05-26',
    });
    expect(reg.items[0].aliases).toHaveLength(1);
    expect(reg.items[0].aliases[0].raw).toBe('Conc. Formwork');
  });
});

describe('separateAlias', () => {
  it('removes alias and creates new item', () => {
    let reg = createRegistry('superior');
    reg = addLineItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    reg = mergeLineItems(reg, reg.items[0].id, {
      raw: 'Conc. Formwork',
      normalizedTo: reg.items[0].id,
      sourceProjectId: 'proj-2',
      sourceUploadDate: '2026-05-26',
    });
    reg = separateAlias(reg, reg.items[0].id, 'Conc. Formwork');
    expect(reg.items).toHaveLength(2);
    expect(reg.items[0].aliases).toHaveLength(0);
    expect(reg.items[1].canonicalName).toBe('Conc. Formwork');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main"
pnpm --filter @repo/projections exec vitest run src/registry/__tests__/registry.test.ts 2>&1 | tail -20
```

Expected: FAIL — module not found

- [ ] **Step 4: Implement the registry**

Create `packages/projections/src/registry/registry.ts`:

```typescript
import type {
  LineItem,
  LineItemAlias,
  LineItemRegistry,
  FuzzyMatch,
} from './types';

let _counter = 0;
function uid(): string {
  return `li-${Date.now().toString(36)}-${(++_counter).toString(36)}`;
}

export function normalizeKey(s: string): string {
  return s.toUpperCase().replace(/[\s.\-_]+/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isFuzzyMatch(a: string, b: string, threshold = 0.3): boolean {
  const na = normalizeKey(a);
  const nb = normalizeKey(b);
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;
  return levenshtein(na, nb) / maxLen <= threshold;
}

export function createRegistry(tenantId: string): LineItemRegistry {
  return { tenantId, items: [] };
}

export function addLineItem(
  registry: LineItemRegistry,
  input: {
    canonicalName: string;
    unitOfMeasure: string;
    costType: string;
    sourceProjectId: string;
  }
): LineItemRegistry {
  const normName = normalizeKey(input.canonicalName);
  const normCost = normalizeKey(input.costType);
  const existing = registry.items.find(
    (item) => normalizeKey(item.canonicalName) === normName && normalizeKey(item.costType) === normCost
  );
  if (existing) {
    if (!existing.projectIds.includes(input.sourceProjectId)) {
      return {
        ...registry,
        items: registry.items.map((item) =>
          item.id === existing.id
            ? { ...item, projectIds: [...item.projectIds, input.sourceProjectId] }
            : item
        ),
      };
    }
    return registry;
  }
  const newItem: LineItem = {
    id: uid(),
    canonicalName: input.canonicalName,
    unitOfMeasure: input.unitOfMeasure,
    costType: input.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [input.sourceProjectId],
  };
  return { ...registry, items: [...registry.items, newItem] };
}

export function findLineItem(
  registry: LineItemRegistry,
  name: string,
  costType: string
): LineItem | undefined {
  const normName = normalizeKey(name);
  const normCost = normalizeKey(costType);
  return registry.items.find((item) => {
    if (normalizeKey(item.canonicalName) === normName && normalizeKey(item.costType) === normCost) {
      return true;
    }
    return item.aliases.some((a) => normalizeKey(a.raw) === normName) && normalizeKey(item.costType) === normCost;
  });
}

export function findFuzzyMatches(
  registry: LineItemRegistry,
  name: string,
  unitOfMeasure: string,
  costType: string
): FuzzyMatch[] {
  const results: FuzzyMatch[] = [];
  for (const item of registry.items) {
    const matched: ('name' | 'costType' | 'unitOfMeasure')[] = [];
    if (isFuzzyMatch(item.canonicalName, name)) matched.push('name');
    if (normalizeKey(item.costType) === normalizeKey(costType)) matched.push('costType');
    if (normalizeKey(item.unitOfMeasure) === normalizeKey(unitOfMeasure)) matched.push('unitOfMeasure');
    if (matched.length >= 2) {
      results.push({ existingItem: item, matchedFields: matched, confidence: matched.length / 3 });
    }
  }
  return results;
}

export function mergeLineItems(
  registry: LineItemRegistry,
  targetItemId: string,
  alias: LineItemAlias
): LineItemRegistry {
  return {
    ...registry,
    items: registry.items.map((item) =>
      item.id === targetItemId
        ? { ...item, aliases: [...item.aliases, alias] }
        : item
    ),
  };
}

export function separateAlias(
  registry: LineItemRegistry,
  itemId: string,
  aliasRaw: string
): LineItemRegistry {
  const source = registry.items.find((i) => i.id === itemId);
  if (!source) return registry;
  const alias = source.aliases.find((a) => a.raw === aliasRaw);
  if (!alias) return registry;

  const updatedSource = {
    ...source,
    aliases: source.aliases.filter((a) => a.raw !== aliasRaw),
  };
  const newItem: LineItem = {
    id: uid(),
    canonicalName: aliasRaw,
    unitOfMeasure: source.unitOfMeasure,
    costType: source.costType,
    aliases: [],
    createdAt: new Date().toISOString(),
    projectIds: [alias.sourceProjectId],
  };

  return {
    ...registry,
    items: registry.items.map((i) => (i.id === itemId ? updatedSource : i)).concat(newItem),
  };
}

export function editLineItemName(
  registry: LineItemRegistry,
  itemId: string,
  newName: string
): LineItemRegistry {
  return {
    ...registry,
    items: registry.items.map((item) =>
      item.id === itemId ? { ...item, canonicalName: newName } : item
    ),
  };
}

export function removeLineItem(
  registry: LineItemRegistry,
  itemId: string
): LineItemRegistry {
  return {
    ...registry,
    items: registry.items.filter((i) => i.id !== itemId),
  };
}
```

- [ ] **Step 5: Create index and export from package**

Create `packages/projections/src/registry/index.ts`:

```typescript
export * from './types';
export * from './registry';
```

Add to `packages/projections/src/index.ts`:

```typescript
export * from './registry';
```

- [ ] **Step 6: Run tests**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph/work/stratagraph-main"
pnpm --filter @repo/projections exec vitest run src/registry/__tests__/registry.test.ts 2>&1
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/projections/src/registry/
git commit -m "feat: add line item registry with merge, separate, alias, and fuzzy matching"
```

### Task 5: Wire registry into the store

**Files:**
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Add registry state to the Zustand store**

Add to state interface:
```typescript
lineItemRegistry: LineItemRegistry;
```

Initialize per tenant in `seedForTenant()`:
```typescript
import { createRegistry } from '@repo/projections';

// In the store creation, after existing state:
lineItemRegistry: createRegistry(getInitialTenantId()),
```

Add mutations:
```typescript
addRegistryItem: (input: { canonicalName: string; unitOfMeasure: string; costType: string; sourceProjectId: string }) => {
  set((s) => ({ lineItemRegistry: addLineItem(s.lineItemRegistry, input) }));
},
mergeRegistryItems: (targetId: string, alias: LineItemAlias) => {
  set((s) => ({ lineItemRegistry: mergeLineItems(s.lineItemRegistry, targetId, alias) }));
},
separateRegistryAlias: (itemId: string, aliasRaw: string) => {
  set((s) => ({ lineItemRegistry: separateAlias(s.lineItemRegistry, itemId, aliasRaw) }));
},
editRegistryItemName: (itemId: string, newName: string) => {
  set((s) => ({ lineItemRegistry: editLineItemName(s.lineItemRegistry, itemId, newName) }));
},
```

Also update `setTenant()` to reset registry for the new tenant:
```typescript
lineItemRegistry: createRegistry(id),
```

- [ ] **Step 2: Verify compilation**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/store.ts
git commit -m "feat: wire line item registry into Zustand store with per-tenant state"
```

### Task 6: Line Item Registry admin page

**Files:**
- Create: `apps/web/src/routes/_dashboard/admin.registry.tsx`
- Modify: `apps/web/src/lib/tenant.ts`

- [ ] **Step 1: Add nav item**

In `tenant.ts`, add to the admin children in `OPERATIONS_NAV` (after services):
```typescript
{ id: 'admin-registry', label: 'Line Items', href: '/admin/registry', icon: 'List' },
```

Also add to `PROJECTIONS_NAV` admin children:
```typescript
{ id: 'admin-registry', label: 'Line Items', href: '/admin/registry', icon: 'List' },
```

- [ ] **Step 2: Create the registry route**

Create `apps/web/src/routes/_dashboard/admin.registry.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useAppStore } from '~/lib/store';
import { PageHeader } from '@repo/ui';
import { Button, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui';
import { useState } from 'react';
import { Pencil, GitMerge, GitBranch, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/admin/registry')({
  component: RegistryPage,
});

function RegistryPage() {
  const registry = useAppStore((s) => s.lineItemRegistry);
  const editName = useAppStore((s) => s.editRegistryItemName);
  const separate = useAppStore((s) => s.separateRegistryAlias);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = registry.items.filter(
    (item) =>
      item.canonicalName.toLowerCase().includes(search.toLowerCase()) ||
      item.costType.toLowerCase().includes(search.toLowerCase()) ||
      item.aliases.some((a) => a.raw.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Line Item Registry"
        description="Canonical line items across all projects. Merge duplicates, separate mistakes, manage aliases."
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items, cost types, or aliases…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium"></th>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Cost Type</th>
              <th className="px-4 py-2 text-left font-medium">UoM</th>
              <th className="px-4 py-2 text-left font-medium">Aliases</th>
              <th className="px-4 py-2 text-left font-medium">Projects</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <>
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2">
                    {item.aliases.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedId === item.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">{item.canonicalName}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{item.costType}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.unitOfMeasure}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary">{item.aliases.length}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.projectIds.length}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const name = prompt('New name:', item.canonicalName);
                        if (name) editName(item.id, name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
                {expandedId === item.id &&
                  item.aliases.map((alias) => (
                    <tr key={`${item.id}-${alias.raw}`} className="bg-muted/10 border-b">
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5 pl-10 text-muted-foreground italic">
                        {alias.raw}
                      </td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5 text-xs text-muted-foreground">
                        from {alias.sourceProjectId}
                      </td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => separate(item.id, alias.raw)}
                          title="Separate into independent item"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No line items yet. Items are added automatically when projections are uploaded.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to Admin → Line Items. Should show empty state for both tenants. This page will populate as uploads happen.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/admin.registry.tsx apps/web/src/lib/tenant.ts
git commit -m "feat: add Line Item Registry admin page with search, aliases, separate"
```

### Task 7: Wire services page to registry (Superior) while keeping catalog for Stratagraph

**Files:**
- Modify: `apps/web/src/routes/_dashboard/services.tsx`

- [ ] **Step 1: Update services page to show registry items for Superior**

The services page currently shows the hardcoded `SERVICE_CATALOG`. For Superior, it should show line items from the registry instead.

```typescript
// At the top of the component:
const tenantId = useAppStore((s) => s.tenantId);
const registry = useAppStore((s) => s.lineItemRegistry);

// Derive the display list based on tenant:
const displayItems = tenantId === 'stratagraph'
  ? SERVICE_CATALOG.map((item) => ({
      name: item.name,
      category: item.category,
      code: item.dailyCode ?? '',
      unit: item.billingUnit,
      rate: item.defaultRate,
      rateNote: item.rateNote,
    }))
  : registry.items.map((item) => ({
      name: item.canonicalName,
      category: item.costType,
      code: '',
      unit: item.unitOfMeasure,
      rate: null,
      rateNote: null,
    }));
```

Update the DataListShell columns to work with both shapes. Category filter for Superior uses `costType` values instead of `ServiceCategory`.

- [ ] **Step 2: Verify in browser**

Switch to Superior → Admin → Services. Should show registry items (empty initially).
Switch to Stratagraph → Admin → Services. Should show the 103 catalog items as before.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/_dashboard/services.tsx
git commit -m "feat: services page shows registry items for Superior, catalog for Stratagraph"
```

---

## Phase 2: Monthly Entry Form

### Task 8: Month picker component

**Files:**
- Create: `apps/web/src/components/month-picker.tsx`

- [ ] **Step 1: Create the month picker**

```typescript
import { Button } from '@repo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [year, month] = value.split('-').map(Number);

  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    onChange(`${y}-${m}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => shift(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[160px] text-center font-medium">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <Button variant="ghost" size="icon" onClick={() => shift(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/month-picker.tsx
git commit -m "feat: add MonthPicker component"
```

### Task 9: Monthly entry form component

**Files:**
- Create: `apps/web/src/components/monthly-entry-form.tsx`
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Add monthly quantity helpers to store**

Add these methods to the store:

```typescript
getMonthlyQuantity: (projectId: string, lineItemId: string, yearMonth: string): { qty: number; hours: number } => {
  const job = get().jobs.find((j) => j.id === projectId) ??
    get().jobs.find((j) => j.id === projectId);
  if (!job) return { qty: 0, hours: 0 };
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let totalQty = 0;
  let totalHours = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const entry = job.dailyQuantities?.find(
      (dq) => dq.date === iso && dq.code === (lineItemId as DailyCode)
    );
    if (entry) {
      totalQty += entry.qty;
    }
  }
  return { qty: totalQty, hours: totalHours };
},

setMonthlyQuantity: (projectId: string, lineItemId: string, yearMonth: string, qty: number, hours: number) => {
  // Distribute evenly across working days in the month
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const workingDays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      workingDays.push(`${yearMonth}-${String(d).padStart(2, '0')}`);
    }
  }
  const perDay = workingDays.length > 0 ? qty / workingDays.length : 0;
  set((s) => {
    const jobs = s.jobs.map((job) => {
      if (job.id !== projectId) return job;
      const existing = (job.dailyQuantities ?? []).filter(
        (dq) => !(dq.code === (lineItemId as DailyCode) && dq.date.startsWith(yearMonth))
      );
      const newEntries = workingDays.map((date) => ({
        date,
        code: lineItemId as DailyCode,
        qty: perDay,
      }));
      return { ...job, dailyQuantities: [...existing, ...newEntries] };
    });
    return { jobs };
  });
},
```

- [ ] **Step 2: Create monthly entry form**

Create `apps/web/src/components/monthly-entry-form.tsx`:

```typescript
import { useState } from 'react';
import { useAppStore } from '~/lib/store';
import { MonthPicker } from './month-picker';
import { Input, Button, Badge } from '@repo/ui';
import { Check } from 'lucide-react';

interface MonthlyEntryFormProps {
  projectId: string;
}

export function MonthlyEntryForm({ projectId }: MonthlyEntryFormProps) {
  const today = new Date();
  const [yearMonth, setYearMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );

  const registry = useAppStore((s) => s.lineItemRegistry);
  const getMonthly = useAppStore((s) => s.getMonthlyQuantity);
  const setMonthly = useAppStore((s) => s.setMonthlyQuantity);

  const [edits, setEdits] = useState<Record<string, { qty: string; hours: string }>>({});

  function handleSave(lineItemId: string) {
    const edit = edits[lineItemId];
    if (!edit) return;
    setMonthly(projectId, lineItemId, yearMonth, Number(edit.qty) || 0, Number(edit.hours) || 0);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[lineItemId];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker value={yearMonth} onChange={setYearMonth} />
        <Badge variant="outline">{registry.items.length} line items</Badge>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Line Item</th>
              <th className="px-4 py-2 text-left font-medium">Cost Type</th>
              <th className="px-4 py-2 text-left font-medium">UoM</th>
              <th className="px-4 py-2 text-right font-medium w-28">Qty</th>
              <th className="px-4 py-2 text-right font-medium w-28">Hours</th>
              <th className="px-4 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {registry.items.map((item) => {
              const saved = getMonthly(projectId, item.id, yearMonth);
              const editing = edits[item.id];
              const qtyVal = editing?.qty ?? String(saved.qty || '');
              const hoursVal = editing?.hours ?? String(saved.hours || '');

              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{item.canonicalName}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-xs">{item.costType}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.unitOfMeasure}</td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={qtyVal}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [item.id]: { qty: e.target.value, hours: prev[item.id]?.hours ?? hoursVal },
                        }))
                      }
                      className="w-28 text-right ml-auto"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={hoursVal}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [item.id]: { qty: prev[item.id]?.qty ?? qtyVal, hours: e.target.value },
                        }))
                      }
                      className="w-28 text-right ml-auto"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {editing && (
                      <Button variant="ghost" size="icon" onClick={() => handleSave(item.id)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {registry.items.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No line items yet. Upload a projection to populate items.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into project detail page for Superior**

In the projection detail route (`projections.$projectId.tsx`), add a tab or section that renders `<MonthlyEntryForm projectId={project.id} />` when the tenant is Superior.

- [ ] **Step 4: Verify in browser**

Switch to Superior tenant. Open a projection project. The monthly entry form should appear with line items from the registry, month picker navigation, and qty/hours inputs.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/monthly-entry-form.tsx apps/web/src/components/month-picker.tsx apps/web/src/lib/store.ts apps/web/src/routes/_dashboard/projections.\$projectId.tsx
git commit -m "feat: add monthly entry form for Superior — qty + hours per line item per month"
```

---

## Phase 3: Invoice from Forecast + Projection Auto-Creation

### Task 10: Forecast submission (lock version)

**Files:**
- Modify: `packages/projections/src/engine.ts`
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Add lockVersion to engine**

In `packages/projections/src/engine.ts`, add:

```typescript
export function lockVersion(
  project: ProjectionProject,
  versionId: string
): ProjectionProject {
  return {
    ...project,
    versions: project.versions.map((v) =>
      v.id === versionId ? { ...v, saved: true, label: v.label.includes('(Submitted)') ? v.label : `${v.label} (Submitted)` } : v
    ),
  };
}
```

- [ ] **Step 2: Add submitForecast action to store**

```typescript
submitForecast: (projectId: string, versionId: string) => {
  set((s) => ({
    projectionProjects: s.projectionProjects.map((p) =>
      p.id === projectId ? lockVersion(p, versionId) : p
    ),
  }));
},
```

- [ ] **Step 3: Add "Submit Forecast" button to projection detail**

In `projections.$projectId.tsx`, add a button next to the version selector:

```typescript
<Button
  variant="default"
  onClick={() => store.submitForecast(project.id, activeVersion.id)}
  disabled={activeVersion.label.includes('(Submitted)')}
>
  Submit Forecast
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add packages/projections/src/engine.ts apps/web/src/lib/store.ts apps/web/src/routes/_dashboard/projections.\$projectId.tsx
git commit -m "feat: add forecast submission — locks version as immutable"
```

### Task 11: Invoice generation from forecast

**Files:**
- Create: `apps/web/src/lib/forecast-invoice-builder.ts`
- Modify: `apps/web/src/lib/store.ts`
- Modify: `apps/web/src/routes/_dashboard/invoices.index.tsx`

- [ ] **Step 1: Create forecast invoice builder**

Create `apps/web/src/lib/forecast-invoice-builder.ts`:

```typescript
import type { ProjectionVersion } from '@repo/projections';
import type { InvoiceLine } from './invoice-builder';

export function buildForecastInvoiceLines(version: ProjectionVersion): InvoiceLine[] {
  return version.items
    .filter((item) => item.F.cost > 0)
    .map((item) => ({
      description: item.label,
      qty: item.F.qty,
      unitPrice: item.F.uc,
      amount: item.F.cost,
    }));
}

export function sumForecastInvoiceTotal(lines: InvoiceLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}
```

- [ ] **Step 2: Add generateInvoiceFromForecast to store**

```typescript
generateInvoiceFromForecast: (projectId: string, versionId: string) => {
  const project = get().projectionProjects.find((p) => p.id === projectId);
  if (!project) return;
  const version = project.versions.find((v) => v.id === versionId);
  if (!version || !version.label.includes('(Submitted)')) return;

  const lines = buildForecastInvoiceLines(version);
  const total = sumForecastInvoiceTotal(lines);
  const invoiceCount = get().invoices.length;

  const invoice: Invoice = {
    id: `inv-forecast-${Date.now()}`,
    invoiceNumber: `INV-${String(invoiceCount + 1).padStart(4, '0')}`,
    projectId,
    status: 'draft',
    rangeStart: version.createdAt.slice(0, 10),
    rangeEnd: new Date().toISOString().slice(0, 10),
    generatedDate: new Date().toISOString().slice(0, 10),
    totalUsd: total,
    forecastVersionId: versionId,
  };

  set((s) => ({ invoices: [...s.invoices, invoice] }));
},
```

- [ ] **Step 3: Add "Generate Invoice" dialog to invoices page**

In `invoices.index.tsx`, update the "Generate Invoice" button to open a dialog that lets the user:
1. Select a project (from `projectionProjects` for Superior, from `jobs` for Stratagraph)
2. For Superior: select a submitted forecast version
3. Preview the invoice lines
4. Click "Generate" to create the draft invoice

```typescript
// Inside the dialog:
const projectionProjects = useAppStore((s) => s.projectionProjects);
const tenantId = useAppStore((s) => s.tenantId);
const generateFromForecast = useAppStore((s) => s.generateInvoiceFromForecast);

// Show project picker
// For each project, show submitted versions as selectable
// On confirm: generateFromForecast(selectedProjectId, selectedVersionId)
```

- [ ] **Step 4: Verify in browser**

1. Switch to Superior
2. Open a projection → Submit Forecast (version gets "(Submitted)" label)
3. Go to Invoices → Generate Invoice
4. Select the project and submitted forecast
5. Invoice appears as draft with forecast line items

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/forecast-invoice-builder.ts apps/web/src/lib/store.ts apps/web/src/routes/_dashboard/invoices.index.tsx
git commit -m "feat: generate invoices from submitted forecasts — Superior flow"
```

### Task 12: Projection auto-creation from uploads

**Files:**
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Add autoCreateFromUpload action**

When a file is uploaded and parsed, if items contain estimate values, auto-create a bid:

```typescript
autoCreateProjectionFromUpload: (
  projectName: string,
  customer: string,
  pm: string,
  items: ProjectionItem[]
) => {
  const project = createEmptyProject();
  project.name = projectName;
  project.customer = customer;
  project.pm = pm;
  project.jobNumber = `SC-${String(get().projectionProjects.length + 1).padStart(3, '0')}`;

  // Create bid from estimate values
  const bidLineItems = items
    .filter((item) => item.Est.cost > 0)
    .map((item, i) => ({
      id: `bli-${i}`,
      catalogItemId: item.lineKey,
      rate: item.Est.uc > 0 ? item.Est.uc : item.Est.cost,
      estimatedQty: item.Est.qty > 0 ? item.Est.qty : undefined,
    }));

  if (bidLineItems.length > 0) {
    const bidId = `bid-auto-${Date.now()}`;
    const bid: Bid = {
      id: bidId,
      customerId: customer,
      version: 1,
      isActive: true,
      status: 'accepted',
      createdDate: new Date().toISOString().slice(0, 10),
      acceptedDate: new Date().toISOString().slice(0, 10),
      salesperson: pm,
      lineItems: bidLineItems,
    };
    set((s) => ({ bids: [...s.bids, bid] }));
  }

  // Add line items to registry
  const addItem = get().addRegistryItem;
  for (const item of items) {
    const parts = item.keyParts;
    addItem({
      canonicalName: item.label || parts[0] || item.lineKey,
      unitOfMeasure: item.unitOfMeasure || '',
      costType: parts[1] || '',
      sourceProjectId: project.id,
    });
  }

  // Ingest items into the project
  const ingested = ingestDump(project, items);
  set((s) => ({
    projectionProjects: [...s.projectionProjects, ingested],
  }));
},
```

- [ ] **Step 2: Wire into the upload dialog**

In the projection upload component, after parsing completes and items are ready, call `autoCreateProjectionFromUpload` if this is a new project (no existing projection). If it's an existing project, use the existing `ingestDump`/`ingestBatch` flow.

- [ ] **Step 3: Verify in browser**

1. Switch to Superior
2. Upload a Vista file with estimate values
3. Verify: projection project created, bid created with estimate values, line items added to registry

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/store.ts
git commit -m "feat: auto-create projection + bid from uploaded historicals"
```

---

## Task Summary

| Phase | Task | Description |
|-------|------|-------------|
| 0 | 1 | Rename FieldTicket → Invoice in types |
| 0 | 2 | Rename ticket refs in store, builder, seeds |
| 0 | 3 | Rename ticket routes, update nav and UI labels |
| 1 | 4 | Line Item Registry data model + tests |
| 1 | 5 | Wire registry into Zustand store |
| 1 | 6 | Line Item Registry admin page |
| 1 | 7 | Services page shows registry for Superior |
| 2 | 8 | Month picker component |
| 2 | 9 | Monthly entry form + store wiring |
| 3 | 10 | Forecast submission (lock version) |
| 3 | 11 | Invoice generation from forecast |
| 3 | 12 | Projection auto-creation from uploads |
