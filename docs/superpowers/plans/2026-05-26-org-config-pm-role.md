# Organization Configuration & PM Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Organization Configuration screen with editable company identity (wired into ticket templates), a Project Manager role, and PM assignment on jobs.

**Architecture:** New `Organization` type stored in Zustand, seeded per tenant. New `project_manager` value on `UserRole`. New `projectManagerId` on `Job`. New route at `/admin/organization`. Ticket template reads org identity from store instead of hardcoded strings.

**Tech Stack:** React 19, Zustand, TanStack Router, Tailwind v4, @repo/ui components

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/src/lib/types.ts` | Add `Organization` interface, `project_manager` to `UserRole` |
| Modify | `apps/web/src/lib/store.ts` | Add `organization` slice + `updateOrganization` action |
| Modify | `apps/web/src/data/seed-data.ts` | Add `SEED_ORGANIZATION` for Stratagraph tenant |
| Modify | `apps/web/src/data/seed-superior.ts` | Add `SC_ORGANIZATION` + PM/admin seed users + `projectManagerId` on jobs |
| Modify | `apps/web/src/lib/tenant.ts` | Add Organization nav item to Admin group |
| Create | `apps/web/src/routes/_dashboard/admin/organization.tsx` | Organization Configuration page |
| Modify | `apps/web/src/routes/_dashboard/tickets.$ticketId.tsx` | Replace hardcoded company identity with store values |
| Modify | `apps/web/src/routes/_dashboard/jobs.new.tsx` | Add PM dropdown |
| Modify | `apps/web/src/routes/_dashboard/jobs.$jobId.tsx` | Display PM in job header |
| Modify | `apps/web/src/components/entity-dialogs/team-member-dialog.tsx` | Add `project_manager` to role options |

---

### Task 1: Data Model — Organization type, PM role, Job field

**Files:**
- Modify: `apps/web/src/lib/types.ts:355-362` (UserRole + labels)
- Modify: `apps/web/src/lib/types.ts:240-309` (Job interface)

- [ ] **Step 1: Add Organization interface to types.ts**

Add after the `User` interface (after line 389):

```typescript
export interface Organization {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
}
```

- [ ] **Step 2: Add `project_manager` to UserRole**

Change line 355 from:
```typescript
export type UserRole = 'executive' | 'sales' | 'operations' | 'field_crew';
```
to:
```typescript
export type UserRole = 'executive' | 'sales' | 'operations' | 'project_manager' | 'field_crew';
```

Update `USER_ROLE_LABELS` (lines 357-362) from:
```typescript
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  executive: 'Executive',
  sales: 'Sales',
  operations: 'Operations',
  field_crew: 'Field Crew',
};
```
to:
```typescript
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  executive: 'Executive',
  sales: 'Sales',
  operations: 'Operations',
  project_manager: 'Project Manager',
  field_crew: 'Field Crew',
};
```

- [ ] **Step 3: Add `projectManagerId` to Job interface**

Add after line 262 (`geologist?: string;`):
```typescript
  projectManagerId?: string;
```

- [ ] **Step 4: Verify the app still compiles**

Run: `cd work/stratagraph-main && pnpm tsc --noEmit`
Expected: No type errors (new fields are all optional, new union member is additive)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/types.ts
git commit -m "feat: add Organization type, project_manager role, projectManagerId on Job"
```

---

### Task 2: Seed Data — Organization defaults + Superior PM/admin users

**Files:**
- Modify: `apps/web/src/data/seed-data.ts`
- Modify: `apps/web/src/data/seed-superior.ts`

- [ ] **Step 1: Add Stratagraph seed organization to seed-data.ts**

Add at the bottom of the file, before any closing exports:

```typescript
export const SEED_ORGANIZATION: Organization = {
  name: 'Stratagraph',
  legalName: 'STRATAGRAPH, INC',
  address: 'P.O. Box 53848',
  city: 'Lafayette',
  state: 'LA',
  zip: '70505',
};
```

Add the import at the top of the file:
```typescript
import type { Organization } from '~/lib/types';
```
(Merge into existing import if one exists.)

- [ ] **Step 2: Add Superior Construction seed organization + users to seed-superior.ts**

Add the organization export:

```typescript
export const SC_ORGANIZATION: import('~/lib/types').Organization = {
  name: 'Superior Construction',
  legalName: 'SUPERIOR CONSTRUCTION, LLC',
  address: '1200 Main St',
  city: 'Tampa',
  state: 'FL',
  zip: '33602',
};
```

Add PM and admin users to the `SC_USERS` array (before the closing `]`):

```typescript
  {
    id: 'sc-user-pm-jpc',
    name: 'Juan Pablo Cardenas',
    email: 'jpcardenas@superiorconstruction.com',
    role: 'project_manager',
    title: 'Project Manager',
    active: true,
  },
  {
    id: 'sc-user-pm-tv',
    name: 'Trushit Vaishnav',
    email: 'tvaishnav@superiorconstruction.com',
    role: 'project_manager',
    title: 'Project Manager',
    active: true,
  },
  {
    id: 'sc-user-admin-be',
    name: 'Brian Ellison',
    email: 'bellison@superiorconstruction.com',
    role: 'executive',
    title: 'Admin',
    active: true,
  },
```

- [ ] **Step 3: Assign PMs to existing Superior jobs**

In `SC_JOBS`, add `projectManagerId` to each job:

- `sc-job-suncoast-3a`: add `projectManagerId: 'sc-user-pm-jpc',`
- `sc-job-bayshore`: add `projectManagerId: 'sc-user-pm-jpc',`
- `sc-job-palm-harbor`: add `projectManagerId: 'sc-user-pm-tv',`
- `sc-job-riverside`: add `projectManagerId: 'sc-user-pm-tv',`
- `sc-job-harbor-walk`: add `projectManagerId: 'sc-user-pm-jpc',`

Add the field after the `dayLoggerId` line in each job object.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/data/seed-data.ts apps/web/src/data/seed-superior.ts
git commit -m "feat: seed organization defaults and PM users for both tenants"
```

---

### Task 3: Zustand Store — Organization slice

**Files:**
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Add Organization to seedForTenant**

Import the new seed data. Add to the top-level imports (around line 26-48):

```typescript
import { SEED_ORGANIZATION } from '~/data/seed-data';
```

And add to the existing seed-superior import block:
```typescript
import { SC_ORGANIZATION } from '~/data/seed-superior';
```
(Merge `SC_ORGANIZATION` into the existing `import { SC_BIDS, SC_CUSTOMERS, ... } from '~/data/seed-superior';` line.)

Update `seedForTenant` (lines 61-88) — add `organization` to each return:

In the `superior` branch (line 63), add:
```typescript
organization: SC_ORGANIZATION,
```

In the default return (line 76), add:
```typescript
organization: SEED_ORGANIZATION,
```

- [ ] **Step 2: Add organization to the store interface**

In `StratagraphState` (around line 319), add after `notifications: Notification[];`:

```typescript
organization: Organization;
updateOrganization: (patch: Partial<Organization>) => void;
```

Add `Organization` to the existing type import from `'./types'` (line 89-107).

- [ ] **Step 3: Add organization to the store implementation**

In the `useStore = create<StratagraphState>(...)` block (around line 507), add after `users: _initialSeed.users,`:

```typescript
organization: _initialSeed.organization,
```

Add the `updateOrganization` action near the other update actions (after `updateUser` around line 618):

```typescript
updateOrganization: (patch) =>
  set((s) => ({ organization: { ...s.organization, ...patch } })),
```

- [ ] **Step 4: Update the setTenant switcher**

The `setTenant` action reseeds all data when switching tenants. Find it in the store (search for `setTenant`) and ensure `organization` is included in the reset:

Add `organization: seed.organization,` to the `set()` call alongside the other reseeded fields.

- [ ] **Step 5: Verify compilation**

Run: `cd work/stratagraph-main && pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/store.ts apps/web/src/data/seed-data.ts apps/web/src/data/seed-superior.ts
git commit -m "feat: add organization slice to Zustand store with per-tenant seeding"
```

---

### Task 4: Sidebar Nav — Add Organization item

**Files:**
- Modify: `apps/web/src/lib/tenant.ts:46-55` (OPERATIONS_NAV admin children)

- [ ] **Step 1: Add Organization to OPERATIONS_NAV Admin children**

In `OPERATIONS_NAV` (line 46), add Organization as the first child of the Admin group. Change the `children` array from:

```typescript
    children: [
      { id: 'admin-team', label: 'Team', href: '/users', icon: 'Users' },
```

to:

```typescript
    children: [
      { id: 'admin-org', label: 'Organization', href: '/admin/organization', icon: 'Building' },
      { id: 'admin-team', label: 'Team', href: '/users', icon: 'Users' },
```

- [ ] **Step 2: Add Organization to PROJECTIONS_NAV Admin children**

In `PROJECTIONS_NAV` (line 58), add Organization to the Admin children as well:

```typescript
    children: [
      { id: 'admin-org', label: 'Organization', href: '/admin/organization', icon: 'Building' },
      { id: 'admin-metrics', label: 'Metrics', href: '/admin/metrics', icon: 'Calculator' },
    ],
```

- [ ] **Step 3: Verify the sidebar icon imports**

Check that `'Building'` is a valid icon in the sidebar's icon mapping. The sidebar uses lucide-react icon names. If the mapping doesn't include `Building`, use `Building2` (which is already used for Customers). Search `app-sidebar.tsx` for the icon map and add `Building` if needed:

```typescript
import { Building } from 'lucide-react';
```

And add to the icon map: `Building: Building,`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/tenant.ts apps/web/src/components/navigation/app-sidebar.tsx
git commit -m "feat: add Organization nav item under Admin group"
```

---

### Task 5: Organization Configuration Page

**Files:**
- Create: `apps/web/src/routes/_dashboard/admin/organization.tsx`

- [ ] **Step 1: Create the route file**

First verify the admin directory exists:
```bash
ls apps/web/src/routes/_dashboard/admin/
```

Create `apps/web/src/routes/_dashboard/admin/organization.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@repo/ui';
import { useStore } from '~/lib/store';
import { USER_ROLE_LABELS, type UserRole } from '~/lib/types';

export const Route = createFileRoute('/_dashboard/admin/organization')({
  component: OrganizationPage,
});

const ROLE_PERMISSIONS: {
  role: UserRole;
  description: string;
  screens: string;
}[] = [
  { role: 'executive', description: 'Company leadership', screens: 'All screens (read-only)' },
  { role: 'sales', description: 'Business development', screens: 'Home, Bids, Customers, Reports' },
  { role: 'operations', description: 'Field operations management', screens: 'All screens' },
  { role: 'project_manager', description: 'Project oversight & forecasting', screens: 'Home, Jobs, Projections, Tickets, Reports' },
  { role: 'field_crew', description: 'Field workers (loggers, supervisors)', screens: 'Jobs (assigned only)' },
];

function OrganizationPage() {
  const org = useStore((s) => s.organization);
  const updateOrganization = useStore((s) => s.updateOrganization);

  const [form, setForm] = useState(org);
  const [saved, setSaved] = useState(false);

  const dirty =
    form.name !== org.name ||
    form.legalName !== org.legalName ||
    form.address !== org.address ||
    form.city !== org.city ||
    form.state !== org.state ||
    form.zip !== org.zip ||
    (form.phone ?? '') !== (org.phone ?? '') ||
    (form.email ?? '') !== (org.email ?? '');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateOrganization(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Company identity and role configuration.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Legal Name">
                <Input
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  placeholder="As shown on tickets & bids"
                />
              </Field>
            </div>
            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="State">
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </Field>
              <Field label="Zip">
                <Input
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-4">
              {saved ? (
                <span className="text-sm text-green-600">Saved</span>
              ) : null}
              <Button type="submit" disabled={!dirty}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles &amp; Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Screen Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_PERMISSIONS.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell>
                      <Badge variant="outline">{USER_ROLE_LABELS[r.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.description}
                    </TableCell>
                    <TableCell className="text-sm">{r.screens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Role-based access enforcement is coming soon. This table shows the planned
            screen visibility for each role.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Start the dev server and navigate to `/admin/organization`. Confirm:
- Company identity form is populated with seed data
- Save button is disabled until a field changes
- Roles & Permissions table shows all 5 roles

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/_dashboard/admin/organization.tsx
git commit -m "feat: add Organization Configuration page with identity form and roles table"
```

---

### Task 6: Wire Organization Identity into Ticket Template

**Files:**
- Modify: `apps/web/src/routes/_dashboard/tickets.$ticketId.tsx:144-162,271-274`

- [ ] **Step 1: Add organization to the component's store selectors**

Near the top of the ticket detail component (where other `useStore` calls are), add:

```typescript
const organization = useStore((s) => s.organization);
```

- [ ] **Step 2: Replace hardcoded company name in header (line 145)**

Change:
```tsx
<div className="text-primary text-xl font-bold tracking-tight">STRATAGRAPH, INC</div>
```
to:
```tsx
<div className="text-primary text-xl font-bold tracking-tight">{organization.legalName}</div>
```

- [ ] **Step 3: Replace hardcoded "Remit To" address (lines 160-162)**

Change:
```tsx
<div className="text-sm">Stratagraph, Inc</div>
<div className="text-muted-foreground text-xs">P.O. Box 53848</div>
<div className="text-muted-foreground text-xs">Lafayette, LA 70505</div>
```
to:
```tsx
<div className="text-sm">{organization.name}</div>
<div className="text-muted-foreground text-xs">{organization.address}</div>
<div className="text-muted-foreground text-xs">{organization.city}, {organization.state} {organization.zip}</div>
```

- [ ] **Step 4: Replace hardcoded terms reference (line 272)**

Change:
```tsx
Charges are bound by the TERMS and CONDITIONS of the Stratagraph, Inc. Final
Deliverable Package and are not included in the estimated cost of Field Service.
```
to:
```tsx
Charges are bound by the TERMS and CONDITIONS of the {organization.legalName} Final
Deliverable Package and are not included in the estimated cost of Field Service.
```

- [ ] **Step 5: Verify**

Navigate to a ticket detail page and confirm the company identity renders from the store, not hardcoded. Switch tenants and confirm it updates.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/_dashboard/tickets.\$ticketId.tsx
git commit -m "feat: wire ticket template to organization identity from store"
```

---

### Task 7: Job Creation Form — PM Dropdown

**Files:**
- Modify: `apps/web/src/routes/_dashboard/jobs.new.tsx:53-67,87-104,257-349`

- [ ] **Step 1: Add PM state and data**

In the `NewJobPage` component, add a `projectManagers` memo and state (after the existing `crew` memo around line 54):

```typescript
const projectManagers = useMemo(
  () => allUsers.filter((u) => u.role === 'project_manager' && u.active),
  [allUsers]
);
```

Add state (after `unitId` state around line 67):

```typescript
const [projectManagerId, setProjectManagerId] = useState<string>('');
```

- [ ] **Step 2: Pass projectManagerId into createJob**

In the `handleSubmit` function (around line 87), add `projectManagerId` to the createJob call. After `unitId: unitId || undefined,` (line 103), add:

```typescript
projectManagerId: projectManagerId || undefined,
```

- [ ] **Step 3: Add PM dropdown to the form**

In the "Crew & equipment" section (after the grid with Day Logger, Night Logger, Unit — around line 348), add a new row before the closing `</div>` of the border-t section. Change the grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-4` and add a fourth field:

```tsx
<Field label="Project Manager">
  <Select
    value={projectManagerId || '__none__'}
    onValueChange={(v) => setProjectManagerId(v === '__none__' ? '' : v)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Unassigned">
        {(v: string) =>
          v === '__none__' || !v
            ? 'Unassigned'
            : projectManagers.find((pm) => pm.id === v)?.name ?? 'Unassigned'
        }
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__none__">
        <span className="text-muted-foreground italic">Unassigned</span>
      </SelectItem>
      {projectManagers.map((pm) => (
        <SelectItem key={pm.id} value={pm.id}>
          {pm.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</Field>
```

Also update the section header text from `Crew &amp; equipment` to `Crew, equipment &amp; management` to reflect the PM addition.

- [ ] **Step 4: Verify**

Navigate to `/jobs/new`, pick a bid, confirm the PM dropdown appears with PM users from seed data. Create a job with a PM assigned.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/_dashboard/jobs.new.tsx
git commit -m "feat: add Project Manager dropdown to job creation form"
```

---

### Task 8: Job Detail Page — Show PM

**Files:**
- Modify: `apps/web/src/routes/_dashboard/jobs.$jobId.tsx:58-158`

- [ ] **Step 1: Add PM lookup**

In the `JobDetail` component, after the `unit` selector (line 64), add:

```typescript
const pm = useStore((s) => (job?.projectManagerId ? s.getUser(job.projectManagerId) : undefined));
```

- [ ] **Step 2: Display PM in the job header metadata line**

In the metadata line (around line 113-158), after the unit display (after the closing of the unit `span` around line 157), add:

```tsx
{pm ? (
  <span className="text-muted-foreground text-sm">
    {' · PM: '}
    <span className="text-foreground font-medium">{pm.name}</span>
  </span>
) : null}
```

- [ ] **Step 3: Verify**

Navigate to a Superior Construction job that has a PM assigned (e.g., SC-4010). Confirm the PM name appears in the header metadata.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/jobs.\$jobId.tsx
git commit -m "feat: display Project Manager in job detail header"
```

---

### Task 9: Team Member Dialog — Support PM Role

**Files:**
- Modify: `apps/web/src/components/entity-dialogs/team-member-dialog.tsx`

- [ ] **Step 1: Verify PM already works in the dialog**

The team member dialog has an "Internal user" flow that includes a role dropdown. Check whether the role select iterates over `UserRole` values or has a hardcoded list. If it reads from `USER_ROLE_LABELS`, the PM role should already appear after Task 1's type change. Load the dialog and confirm.

If the role options are hardcoded (e.g., a static array of `['executive', 'sales', 'operations']`), add `'project_manager'` to that array.

- [ ] **Step 2: Verify PM users show in the Team page**

Navigate to the Team page → Users tab. The tab filters for `role !== 'field_crew'`, so PMs should already appear. Confirm Juan Pablo Cardenas and Trushit Vaishnav show up (on Superior tenant).

- [ ] **Step 3: Test creating a new PM**

Click "Add Team Member" → Internal User → set role to "Project Manager" → fill name + email → save. Confirm the new PM appears in the Users tab.

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add apps/web/src/components/entity-dialogs/team-member-dialog.tsx
git commit -m "feat: support project_manager role in team member dialog"
```

---

### Task 10: Final Verification & Cleanup

- [ ] **Step 1: Full flow test — Superior Construction tenant**

1. Switch to Superior Construction tenant
2. Navigate to Admin → Organization — confirm company identity form shows "Superior Construction" data
3. Edit the legal name, save, navigate to a ticket — confirm it shows the updated name
4. Navigate to Admin → Team → Users tab — confirm Juan Pablo, Trushit (PM), and Brian Ellison (Executive) appear
5. Create a new job → confirm PM dropdown shows Juan Pablo and Trushit
6. View an existing job (SC-4010) → confirm PM shows in header

- [ ] **Step 2: Full flow test — Stratagraph tenant**

1. Switch to Stratagraph tenant
2. Navigate to Admin → Organization — confirm "STRATAGRAPH, INC" data
3. Navigate to a ticket — confirm it shows Stratagraph identity (not hardcoded but from store)
4. Create a job — confirm PM dropdown is empty (no PMs in Stratagraph seed data)

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd work/stratagraph-main && pnpm tsc --noEmit`
Expected: Clean — no errors

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup for org config and PM role feature"
```
