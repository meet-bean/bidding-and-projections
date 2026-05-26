# Organization Configuration, Project Manager Role & Job Assignment

**Date:** 2026-05-26
**Status:** Draft

## Problem

Company identity (name, address) is hardcoded in ticket and bid templates. There is no way to configure this per-tenant. Additionally, there is no Project Manager role — PMs at Superior Construction manage multiple projects and do forecasting, but cannot be assigned to jobs. Roles and screen access are implicit in code with no visible configuration surface.

## Scope

1. **Organization Configuration screen** — editable company identity, stored per-tenant
2. **Wire org identity into tickets and bids** — replace hardcoded "STRATAGRAPH, INC" / address
3. **Project Manager role** — new `UserRole` value, assignable to multiple jobs
4. **Job creation form** — PM dropdown
5. **Roles & Permissions reference table** — read-only on the org screen (enforcement deferred)

## Data Model Changes

### Organization (new type)

```typescript
export interface Organization {
  name: string;          // Display name: "Stratagraph"
  legalName: string;     // For documents: "STRATAGRAPH, INC"
  address: string;       // "P.O. Box 53848"
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
}
```

Stored in Zustand as `organization` at the top level of the store. Seed data provides defaults matching the current hardcoded values per tenant:

- **Stratagraph:** "STRATAGRAPH, INC", P.O. Box 53848, Lafayette, LA 70505
- **Superior Construction:** "SUPERIOR CONSTRUCTION, LLC" (address TBD from user — seed with placeholder)

### UserRole (modified)

```typescript
// Before
export type UserRole = 'executive' | 'sales' | 'operations' | 'field_crew';

// After
export type UserRole = 'executive' | 'sales' | 'operations' | 'project_manager' | 'field_crew';
```

Update `USER_ROLE_LABELS` to include `project_manager: 'Project Manager'`.

Project Managers:
- Appear in the "Users" tab on the Team page (not the Field Crew tab)
- Have no crew-specific fields (no `crewRole`, `dayRate`, `available`, `currentJobId`)
- Can be assigned to multiple jobs simultaneously (no exclusivity constraint)

### Job (modified)

```typescript
// Add to Job interface:
projectManagerId?: string;  // FK to User with role 'project_manager'
```

## UI Changes

### 1. Organization Configuration Screen

**Route:** `/_dashboard/admin/organization`
**Nav:** New item under Admin group: `{ id: 'admin-org', label: 'Organization', href: '/admin/organization', icon: 'Building' }`

**Layout — two sections:**

**Company Identity (top)**
- Editable form with fields: Name, Legal Name, Address, City, State, Zip, Phone, Email
- Save button persists to Zustand store
- Values are read by ticket and bid templates

**Roles & Permissions (bottom)**
- Read-only table showing each `UserRole` and which screens/features it can access
- Columns: Role | Description | Screen Access
- Data is derived from a static mapping (not editable yet):

| Role | Description | Screen Access |
|------|-------------|---------------|
| Executive | Company leadership | All screens (read-only) |
| Sales | Business development | Home, Bids, Customers, Reports |
| Operations | Field operations management | All screens |
| Project Manager | Project oversight & forecasting | Home, Jobs, Projections, Tickets, Reports |
| Field Crew | Field workers (loggers, supervisors) | Jobs (assigned only) |

This table is informational for now. Actual enforcement is deferred.

### 2. Ticket Template Changes

**File:** `tickets.$ticketId.tsx`

Replace hardcoded company identity:
- Line 145: `"STRATAGRAPH, INC"` → `organization.legalName`
- Line 160-162: Hardcoded address → `organization.name`, `organization.address`, `organization.city, organization.state organization.zip`
- Line 272: Terms reference → `organization.legalName` interpolated

Read `organization` from the Zustand store via `useStore`.

### 3. Team Page Changes

**File:** `users.tsx`

The "Users" tab already shows non-crew roles. Adding `project_manager` to `UserRole` means PMs will automatically appear in the Users tab since it filters `role !== 'field_crew'`.

No structural changes needed — just ensure the Team Member Dialog supports the new role in its dropdown.

### 4. Team Member Dialog Changes

**File:** `team-member-dialog.tsx`

Add `'project_manager'` to the role select options. When `project_manager` is selected, hide field-crew-specific fields (crewRole, dayRate, certifications, yearsExperience). PM fields are the same as other internal users: name, email, role, region, title.

### 5. Job Creation Form Changes

**File:** `jobs.new.tsx`

Add a "Project Manager" select dropdown:
- Positioned after the Region field (or after existing crew dropdowns)
- Filters users to `role === 'project_manager' && active`
- Optional — can be left blank and set later
- Value saved as `projectManagerId` on the created job

### 6. Job Detail Page Changes

**File:** `jobs.$jobId.tsx`

Display the assigned Project Manager in the job header/meta section. Allow changing via inline edit (same pattern as other job fields).

### 7. Sidebar Nav Update

**File:** `tenant.ts`

Add Organization to the Admin children in both `OPERATIONS_NAV` and the merged nav:

```typescript
{ id: 'admin-org', label: 'Organization', href: '/admin/organization', icon: 'Building' }
```

Position it as the first item in the Admin group (before Team).

## Seed Data

### Organization defaults

```typescript
// Stratagraph tenant
{
  name: 'Stratagraph',
  legalName: 'STRATAGRAPH, INC',
  address: 'P.O. Box 53848',
  city: 'Lafayette',
  state: 'LA',
  zip: '70505',
  phone: '',
  email: '',
}

// Superior Construction tenant
{
  name: 'Superior Construction',
  legalName: 'SUPERIOR CONSTRUCTION, LLC',
  address: '1200 Main St',
  city: 'Tampa',
  state: 'FL',
  zip: '33602',
  phone: '',
  email: '',
}
```

### PM seed users

Add 1-2 project manager users to seed data:

```typescript
{
  id: 'user-pm-1',
  name: 'Elena Vasquez',
  email: 'elena.vasquez@superiorconstruction.com',
  role: 'project_manager',
  title: 'Senior Project Manager',
  region: 'GOM',
  active: true,
}
```

Assign the PM to 1-2 existing seed jobs via `projectManagerId`.

## Out of Scope

- Role-based access enforcement (gating screens by role) — deferred
- Editable role-permission mapping — deferred
- Organization logo upload — deferred
- Multi-org support — deferred
- Bid template company identity wiring — only the ticket template has hardcoded identity today; bid editor doesn't render a company header currently
