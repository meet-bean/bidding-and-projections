import { create } from 'zustand';
import { TENANTS, type TenantId, type TenantConfig } from './tenant';
import { SERVICE_CATALOG } from '~/data/service-catalog';
import type { ProjectionProject, ProjectionItem, Metric, MetricsCatalog, LineItemRegistry, LineItemAlias } from '@repo/projections';
import {
  createEmptyProject,
  ingestDump,
  ingestBatch,
  updateForecast,
  saveDraft,
  discardDraft,
  startDraft,
  addComment,
  deleteComment,
  resolveAlert,
  reopenAlert,
  updateDraftItem,
  loadProject,
  rederiveVersions,
  createCatalog,
  addMetric,
  removeMetric,
  updateMetric,
  createRegistry,
  addLineItem,
  mergeLineItems,
  separateAlias,
  editLineItemName,
  lockVersion,
} from '@repo/projections';
import {
  SEED_BIDS,
  SEED_CUSTOMERS,
  SEED_JOBS,
  SEED_LOCATIONS,
  SEED_ORGANIZATION,
  SEED_RIGS,
  SEED_INVOICES,
  SEED_UNITS,
  SEED_USERS,
  SEED_WELLS,
  SEED_YARDS,
} from '~/data/seed-data';
import {
  SC_BIDS,
  SC_CUSTOMERS,
  SC_JOBS,
  SC_LOCATIONS,
  SC_ORGANIZATION,
  SC_RIGS,
  SC_INVOICES,
  SC_UNITS,
  SC_USERS,
  SC_WELLS,
  SC_YARDS,
} from '~/data/seed-superior';
import { SEED_SUNCOAST_3A } from '~/data/seed-projections';
import { buildForecastInvoiceLines, sumForecastInvoiceTotal } from './forecast-invoice-builder';

function getInitialTenantId(): TenantId {
  if (typeof window === 'undefined') return 'stratagraph';
  const fromUrl = new URLSearchParams(window.location.search).get('tenant') as TenantId | null;
  if (fromUrl && (fromUrl === 'superior' || fromUrl === 'stratagraph')) {
    localStorage.setItem('tenant', fromUrl);
    return fromUrl;
  }
  return (localStorage.getItem('tenant') as TenantId) || 'stratagraph';
}

function seedForTenant(id: TenantId) {
  if (id === 'superior') {
    return {
      customers: SC_CUSTOMERS,
      wells: SC_WELLS,
      bids: SC_BIDS,
      jobs: SC_JOBS,
      invoices: SC_INVOICES,
      units: SC_UNITS,
      yards: SC_YARDS,
      locations: SC_LOCATIONS,
      rigs: SC_RIGS,
      users: SC_USERS,
      organization: SC_ORGANIZATION,
    };
  }
  return {
    customers: SEED_CUSTOMERS,
    wells: SEED_WELLS,
    bids: SEED_BIDS,
    jobs: SEED_JOBS,
    invoices: SEED_INVOICES,
    units: SEED_UNITS,
    yards: SEED_YARDS,
    locations: SEED_LOCATIONS,
    rigs: SEED_RIGS,
    users: SEED_USERS,
    organization: SEED_ORGANIZATION,
  };
}
import type {
  Bid,
  BidStatus,
  Customer,
  DailyCode,
  Invoice,
  Job,
  Location,
  Notification,
  Organization,
  Rig,
  ServiceCatalogItem,
  MileageEntry,
  ServiceRun,
  InvoiceStatus,
  Unit,
  User,
  Well,
  Yard,
} from './types';

// ---------------------------------------------------------------------------
// Pure helpers — derive activity from ServiceRuns
// ---------------------------------------------------------------------------

/**
 * Derived bid lifecycle status.
 *  - If stored status is 'accepted' AND every job against the bid is 'completed'
 *    AND every ticket from those jobs is 'paid' → returns 'completed'.
 *  - Otherwise returns the stored status.
 *
 * Used to surface "Completed" in the UI without storing a redundant flag.
 * The bid record itself stays 'accepted' — finance can still see it was signed.
 */
export function deriveBidStatus(
  bid: Bid,
  jobs: Job[],
  invoices: Invoice[]
): BidStatus {
  if (bid.status !== 'accepted') return bid.status;
  const bidJobs = jobs.filter((j) => j.bidId === bid.id);
  if (bidJobs.length === 0) return 'accepted';
  if (!bidJobs.every((j) => j.status === 'completed')) return 'accepted';
  const bidTickets = invoices.filter((t) => bidJobs.some((j) => j.id === t.projectId));
  if (bidTickets.length === 0) return 'accepted'; // no invoices yet → AR pending
  if (!bidTickets.every((t) => t.status === 'paid')) return 'accepted';
  return 'completed';
}

function dateInRange(date: string, start: string, end?: string): boolean {
  if (date < start) return false;
  if (end && date > end) return false;
  return true;
}

function dateInPause(
  date: string,
  pauses: { from: string; to: string }[] | undefined
): boolean {
  if (!pauses) return false;
  return pauses.some((p) => date >= p.from && date <= p.to);
}

/** True when this code is running on this date for the given job. */
export function isCodeRunning(job: Job, date: string, code: DailyCode): boolean {
  const run = job.serviceRuns.find((r) => r.code === code && dateInRange(date, r.startDate, r.endDate));
  if (!run) return false;
  return !dateInPause(date, run.pauses);
}

/** Returns set of codes running on date (across all of the job's serviceRuns). */
export function codesRunningOn(job: Job, date: string): Set<DailyCode> {
  const out = new Set<DailyCode>();
  for (const r of job.serviceRuns) {
    if (!dateInRange(date, r.startDate, r.endDate)) continue;
    if (dateInPause(date, r.pauses)) continue;
    out.add(r.code);
  }
  return out;
}

/** Iterate every (date, runningCodes) pair this job has touched. Open-ended runs clamp to `clampEnd`. */
export function iterateJobDates(
  job: Job,
  clampEnd: string
): Array<{ date: string; codes: Set<DailyCode> }> {
  if (job.serviceRuns.length === 0) return [];
  const starts = job.serviceRuns.map((r) => r.startDate);
  const ends = job.serviceRuns.map((r) => r.endDate ?? clampEnd);
  const earliest = starts.reduce((a, b) => (a < b ? a : b));
  const latest = ends.reduce((a, b) => (a > b ? a : b));
  const out: Array<{ date: string; codes: Set<DailyCode> }> = [];
  const d = new Date(earliest + 'T00:00:00');
  const stop = new Date(latest + 'T00:00:00');
  while (d <= stop) {
    const iso = d.toISOString().slice(0, 10);
    const codes = codesRunningOn(job, iso);
    if (codes.size > 0) out.push({ date: iso, codes });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** True when this (job, date) has been explicitly confirmed by Mickey. */
export function isDateConfirmed(job: Job, date: string): boolean {
  if (!job.confirmedThrough) return false;
  return date <= job.confirmedThrough;
}

/** Total quantity of a code over a date range (counts days running, not in pause). */
export function countCodeDays(
  job: Job,
  code: DailyCode,
  rangeStart: string,
  rangeEnd: string
): number {
  let total = 0;
  for (const r of job.serviceRuns) {
    if (r.code !== code) continue;
    const start = r.startDate > rangeStart ? r.startDate : rangeStart;
    const end = (r.endDate ?? rangeEnd) < rangeEnd ? (r.endDate ?? rangeEnd) : rangeEnd;
    if (start > end) continue;
    const startD = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (!dateInPause(iso, r.pauses)) total++;
    }
  }
  return total;
}

/**
 * Sum of billable units for a code over the range — for each running day,
 * add the explicit dailyQuantity if set, else 1. Used for ticket billing
 * (e.g. OBM with qty 4 across 11 days = 44 units, not 11 days).
 */
export function countCodeUnits(
  job: Job,
  code: DailyCode,
  rangeStart: string,
  rangeEnd: string
): number {
  let total = 0;
  for (const r of job.serviceRuns) {
    if (r.code !== code) continue;
    const start = r.startDate > rangeStart ? r.startDate : rangeStart;
    const end = (r.endDate ?? rangeEnd) < rangeEnd ? (r.endDate ?? rangeEnd) : rangeEnd;
    if (start > end) continue;
    const startD = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (dateInPause(iso, r.pauses)) continue;
      const qty = job.dailyQuantities?.find((q) => q.date === iso && q.code === code)?.qty;
      total += qty ?? 1;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// State mutators (pure helpers)
// ---------------------------------------------------------------------------

function nextRunId(jobId: string, code: DailyCode): string {
  return `${jobId}-${code.toLowerCase()}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

/** Toggle a single date for a code. If currently running, add a 1-day pause. If not, add a 1-day run. */
function toggleSingleDate(job: Job, date: string, code: DailyCode): Job {
  const running = isCodeRunning(job, date, code);
  if (running) {
    // Pause this one day inside the containing run.
    return {
      ...job,
      serviceRuns: job.serviceRuns.map((r) => {
        if (r.code !== code) return r;
        if (!dateInRange(date, r.startDate, r.endDate)) return r;
        return { ...r, pauses: [...r.pauses, { from: date, to: date }] };
      }),
    };
  }
  // Not running — try to remove an enclosing pause, else add a fresh 1-day run.
  const idx = job.serviceRuns.findIndex(
    (r) => r.code === code && dateInRange(date, r.startDate, r.endDate) && dateInPause(date, r.pauses)
  );
  if (idx >= 0) {
    return {
      ...job,
      serviceRuns: job.serviceRuns.map((r, i) => {
        if (i !== idx) return r;
        // Split any pause that contains this date into pieces that don't.
        const newPauses = r.pauses.flatMap((p) => {
          if (date < p.from || date > p.to) return [p];
          const out: typeof r.pauses = [];
          if (p.from < date) out.push({ ...p, to: prevIso(date) });
          if (p.to > date) out.push({ ...p, from: nextIso(date) });
          return out;
        });
        return { ...r, pauses: newPauses };
      }),
    };
  }
  // Date is outside any existing run → add a new 1-day run.
  return {
    ...job,
    serviceRuns: [
      ...job.serviceRuns,
      { id: nextRunId(job.id, code), code, startDate: date, endDate: date, pauses: [] },
    ],
  };
}

function prevIso(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function nextIso(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

interface StratagraphState {
  serviceCatalog: ServiceCatalogItem[];
  customers: Customer[];
  wells: Well[];
  bids: Bid[];
  jobs: Job[];
  units: Unit[];
  yards: Yard[];
  locations: Location[];
  rigs: Rig[];
  users: User[];
  invoices: Invoice[];
  notifications: Notification[];
  organization: Organization;
  updateOrganization: (patch: Partial<Organization>) => void;

  // Lookups
  getCustomer: (id: string) => Customer | undefined;
  getWell: (id: string) => Well | undefined;
  wellsForCustomer: (customerId: string) => Well[];
  getBid: (id: string) => Bid | undefined;
  getActiveBidForCustomer: (customerId: string) => Bid | undefined;
  getJob: (id: string) => Job | undefined;
  /** Crew is just users with role='field_crew' — getEmployee is kept as an alias for compat. */
  getEmployee: (id: string) => User | undefined;
  getUnit: (id: string) => Unit | undefined;
  getYard: (id: string) => Yard | undefined;
  getLocation: (id: string) => Location | undefined;
  getRig: (id: string) => Rig | undefined;
  getUser: (id: string) => User | undefined;
  locationsForCustomer: (customerId: string) => Location[];
  rigsForLocation: (locationId: string) => Rig[];
  getCatalogItem: (id: string) => ServiceCatalogItem | undefined;

  /** LOV "create new" mutations — return the new entity id for immediate selection. */
  createLocation: (input: Omit<Location, 'id'>) => string;
  createRig: (input: Omit<Rig, 'id'>) => string;

  /** Customer / Unit / Yard CRUD. Each returns the entity id on create. */
  createCustomer: (input: Omit<Customer, 'id'>) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  createWell: (input: Omit<Well, 'id'>) => string;
  updateWell: (id: string, patch: Partial<Well>) => void;
  deleteWell: (id: string) => void;
  createUnit: (input: Omit<Unit, 'id'>) => string;
  updateUnit: (id: string, patch: Partial<Unit>) => void;
  createYard: (input: Omit<Yard, 'id'>) => string;
  updateYard: (id: string, patch: Partial<Yard>) => void;
  createUser: (input: Omit<User, 'id'>) => string;
  updateUser: (id: string, patch: Partial<User>) => void;

  // Activity selectors (derived from ServiceRuns)
  codesRunningOn: (jobId: string, date: string) => Set<DailyCode>;
  isCodeRunning: (jobId: string, date: string, code: DailyCode) => boolean;
  isDateConfirmed: (jobId: string, date: string) => boolean;
  countCodeDays: (jobId: string, code: DailyCode, rangeStart: string, rangeEnd: string) => number;
  /** Quantity-aware unit count for ticket billing. */
  countCodeUnits: (jobId: string, code: DailyCode, rangeStart: string, rangeEnd: string) => number;

  /** Resolve crew for (jobId, date): per-day override falls back to job-level default. */
  getCrewForDate: (
    jobId: string,
    date: string
  ) => { dayLoggerId?: string; nightLoggerId?: string };
  /** Read the miles entry for a specific day. Undefined if nothing logged. */
  getMilesForDate: (jobId: string, date: string) => MileageEntry | undefined;
  /** Sum per-day miles across a range, returning totals per mileage stream. */
  sumMileage: (
    jobId: string,
    rangeStart: string,
    rangeEnd: string
  ) => { crewMiles: number; unitMiles: number };

  /** Override (or clear) crew for a specific date. Passing null clears that role. */
  setCrewForDate: (
    jobId: string,
    date: string,
    role: 'day_logger' | 'night_logger',
    employeeId: string | null
  ) => void;
  /** Patch the miles entry for a specific date. Passing null clears that field. */
  setMilesForDate: (
    jobId: string,
    date: string,
    field: 'dayLoggerMiles' | 'nightLoggerMiles' | 'unitMiles',
    miles: number | null
  ) => void;
  /** Free-text activity note for a date. Null clears. */
  setDailyNote: (jobId: string, date: string, text: string | null) => void;
  getDailyNote: (jobId: string, date: string) => string | undefined;
  /**
   * Set the per-day quantity for a code. Passing null/0 marks the day as off
   * for that code. Bridges to the ServiceRun/pauses model so the activity
   * history grid still works.
   */
  setDailyQuantity: (
    jobId: string,
    date: string,
    code: DailyCode,
    qty: number | null
  ) => void;
  getDailyQuantity: (jobId: string, date: string, code: DailyCode) => number | undefined;

  // Mutations
  toggleException: (jobId: string, date: string, code: DailyCode) => void;
  confirmJobThrough: (jobId: string, date: string) => void;
  confirmAllJobsThrough: (date: string) => void;
  startService: (jobId: string, code: DailyCode, fromDate: string) => void;
  endService: (jobId: string, code: DailyCode, asOfDate: string) => void;
  pauseServiceRange: (
    jobId: string,
    code: DailyCode,
    fromDate: string,
    toDate: string,
    reason?: string
  ) => void;
  /** Create a new Job. Returns the new id. Status is derived from startDate (speculative when blank). */
  createJob: (
    input: Omit<Job, 'id' | 'jobNumber' | 'status' | 'serviceRuns' | 'activeCodes'> &
      Partial<Pick<Job, 'activeCodes'>>
  ) => string;
  /** Assign or unassign a crew member to a role (day_logger | night_logger). */
  assignCrew: (jobId: string, role: 'day_logger' | 'night_logger', employeeId: string | null) => void;
  /** Assign or unassign a unit to a job. Auto-syncs unit status with the job's lifecycle. */
  assignUnit: (jobId: string, unitId: string | null) => void;
  /** Patch arbitrary fields on a job (used by inline edits like lodging/GPS/field office). */
  updateJob: (jobId: string, patch: Partial<Job>) => void;
  /** Create a new bid. Returns id. Version auto-bumps to next for that customer. */
  createBid: (
    input: Omit<Bid, 'id' | 'version' | 'isActive' | 'createdDate'> &
      Partial<Pick<Bid, 'isActive'>>
  ) => string;
  /** Patch a bid. Refuses to touch accepted bids — caller must revise instead. */
  updateBid: (bidId: string, patch: Partial<Bid>) => void;
  /**
   * Flip a bid to 'accepted' and stamp the date. Idempotent — re-accepting is a
   * no-op. Marks bid as active and deactivates any other live bid for the same
   * customer so only one rate card bills at a time. Also pushes a notification
   * so the user can spin up a job in one click from the bell.
   */
  acceptBid: (bidId: string) => void;

  /** Push a fresh notification onto the stack. */
  pushNotification: (input: Omit<Notification, 'id' | 'createdAt' | 'read'>) => string;
  /** Mark one or all notifications as read. */
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  /** Advance an invoice through its lifecycle, stamping the appropriate date. */
  setInvoiceStatus: (
    invoiceId: string,
    status: InvoiceStatus,
    meta?: { signedBy?: string }
  ) => void;
  /**
   * Create a draft invoice for a job over a date range. Stamps
   * generatedDate to today and starts in 'draft' status; caller advances
   * the lifecycle from the detail page. Returns the new invoice id.
   */
  createInvoice: (input: {
    jobId: string;
    rangeStart: string;
    rangeEnd: string;
    invoiceNumber: string;
    totalUsd: number;
  }) => string;

  // Tenant
  tenantId: TenantId;
  setTenant: (id: TenantId) => void;
  getTenantConfig: () => TenantConfig;

  // Projections
  projectionProjects: ProjectionProject[];
  activeProjectionId: string | null;
  getActiveProjection: () => ProjectionProject | null;
  setActiveProjection: (id: string) => void;
  addProjectionProject: (project: ProjectionProject) => void;
  removeProjectionProject: (id: string) => void;
  updateActiveProjection: (updater: (p: ProjectionProject) => ProjectionProject) => void;
  /**
   * Auto-create a projection project (+ bid) from uploaded historicals.
   * Called by the upload dialog after parsing completes when no existing projection is selected.
   */
  autoCreateProjectionFromUpload: (
    projectName: string,
    customer: string,
    pm: string,
    items: ProjectionItem[]
  ) => void;

  // Metrics catalog (per-tenant)
  metricsCatalog: MetricsCatalog;
  addMetricToStore: (metric: Metric) => void;
  removeMetricFromStore: (metricId: string) => void;
  updateMetricInStore: (metricId: string, patch: Partial<Metric>) => void;

  // Line item registry (per-tenant)
  lineItemRegistry: LineItemRegistry;
  addRegistryItem: (input: { canonicalName: string; unitOfMeasure: string; costType: string; sourceProjectId: string }) => void;
  mergeRegistryItems: (targetId: string, alias: LineItemAlias) => void;
  separateRegistryAlias: (itemId: string, aliasRaw: string) => void;
  editRegistryItemName: (itemId: string, newName: string) => void;

  // Monthly quantity helpers (Superior tenant)
  getMonthlyQuantity: (projectId: string, lineItemId: string, yearMonth: string) => { qty: number; hours: number };
  setMonthlyQuantity: (projectId: string, lineItemId: string, yearMonth: string, qty: number, hours: number) => void;

  submitForecast: (projectId: string, versionId: string) => void;
  generateInvoiceFromForecast: (projectId: string, versionId: string) => void;
}

const _initialTenant = getInitialTenantId();
const _initialSeed = seedForTenant(_initialTenant);

export const useStore = create<StratagraphState>((set, get) => ({
  serviceCatalog: SERVICE_CATALOG,
  customers: _initialSeed.customers,
  wells: _initialSeed.wells,
  bids: _initialSeed.bids,
  jobs: _initialSeed.jobs,
  units: _initialSeed.units,
  yards: _initialSeed.yards,
  locations: _initialSeed.locations,
  rigs: _initialSeed.rigs,
  users: _initialSeed.users,
  organization: _initialSeed.organization,
  invoices: _initialSeed.invoices,
  notifications: _initialTenant === 'stratagraph' ? [
    {
      id: 'notif-seed-devon',
      kind: 'bid_accepted',
      title: 'Bid accepted — Foothill Energy',
      description: 'Cana Woodford 22H · 4 line items, ready to spin up a job.',
      createdAt: '2026-05-19T16:42:00Z',
      read: false,
      sourceId: 'bid-devon-v1',
      actionLabel: 'Create job',
      actionHref: '/jobs/new?bidId=bid-devon-v1',
    },
    {
      id: 'notif-seed-eog-invoice',
      kind: 'ticket_signed',
      title: 'Invoice signed — Ironvale Resources',
      description: 'Invoice 1018347-1 signed by Avery Halloran. Ready to submit.',
      createdAt: '2026-05-09T11:15:00Z',
      read: true,
      sourceId: 'ticket-eog-001',
      actionLabel: 'View invoice',
      actionHref: '/invoices/ticket-eog-001',
    },
  ] : [],

  getCustomer: (id) => get().customers.find((c) => c.id === id),
  getWell: (id) => get().wells.find((w) => w.id === id),
  wellsForCustomer: (customerId) => get().wells.filter((w) => w.customerId === customerId),
  getBid: (id) => get().bids.find((b) => b.id === id),
  getActiveBidForCustomer: (customerId) =>
    get().bids.find((b) => b.customerId === customerId && b.isActive),
  getJob: (id) => get().jobs.find((j) => j.id === id),
  getEmployee: (id) => get().users.find((u) => u.id === id && u.role === 'field_crew'),
  getUnit: (id) => get().units.find((u) => u.id === id),
  getYard: (id) => get().yards.find((y) => y.id === id),
  getLocation: (id) => get().locations.find((l) => l.id === id),
  getRig: (id) => get().rigs.find((r) => r.id === id),
  getUser: (id) => get().users.find((u) => u.id === id),
  locationsForCustomer: (customerId) =>
    get().locations.filter((l) => l.customerId === customerId),
  rigsForLocation: (locationId) => get().rigs.filter((r) => r.locationId === locationId),
  getCatalogItem: (id) => get().serviceCatalog.find((s) => s.id === id),

  createLocation: (input) => {
    const id = `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const next: Location = { id, ...input };
    set((s) => ({ locations: [...s.locations, next] }));
    return id;
  },

  createRig: (input) => {
    const id = `rig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const next: Rig = { id, ...input };
    set((s) => ({ rigs: [...s.rigs, next] }));
    return id;
  },

  createCustomer: (input) => {
    const id = `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ customers: [...s.customers, { id, ...input }] }));
    return id;
  },
  updateCustomer: (id, patch) =>
    set((s) => ({
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  createWell: (input) => {
    const id = `well-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ wells: [...s.wells, { id, ...input }] }));
    return id;
  },
  updateWell: (id, patch) =>
    set((s) => ({ wells: s.wells.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  deleteWell: (id) =>
    set((s) => ({ wells: s.wells.filter((w) => w.id !== id) })),

  createUnit: (input) => {
    const id = `unit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ units: [...s.units, { id, ...input }] }));
    return id;
  },
  updateUnit: (id, patch) =>
    set((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

  createYard: (input) => {
    const id = `yard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ yards: [...s.yards, { id, ...input }] }));
    return id;
  },
  updateYard: (id, patch) =>
    set((s) => ({ yards: s.yards.map((y) => (y.id === id ? { ...y, ...patch } : y)) })),

  createUser: (input) => {
    const prefix = input.role === 'field_crew' ? 'emp' : 'user';
    const id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ users: [...s.users, { id, ...input }] }));
    return id;
  },
  updateUser: (id, patch) =>
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

  updateOrganization: (patch) =>
    set((s) => ({ organization: { ...s.organization, ...patch } })),

  codesRunningOn: (jobId, date) => {
    const j = get().getJob(jobId);
    return j ? codesRunningOn(j, date) : new Set();
  },
  isCodeRunning: (jobId, date, code) => {
    const j = get().getJob(jobId);
    return j ? isCodeRunning(j, date, code) : false;
  },
  isDateConfirmed: (jobId, date) => {
    const j = get().getJob(jobId);
    return j ? isDateConfirmed(j, date) : false;
  },
  countCodeDays: (jobId, code, rangeStart, rangeEnd) => {
    const j = get().getJob(jobId);
    return j ? countCodeDays(j, code, rangeStart, rangeEnd) : 0;
  },
  countCodeUnits: (jobId, code, rangeStart, rangeEnd) => {
    const j = get().getJob(jobId);
    return j ? countCodeUnits(j, code, rangeStart, rangeEnd) : 0;
  },

  getCrewForDate: (jobId, date) => {
    const j = get().getJob(jobId);
    if (!j) return {};
    const override = j.crewAssignments?.find((a) => a.date === date);
    return {
      dayLoggerId: override?.dayLoggerId ?? j.dayLoggerId,
      nightLoggerId: override?.nightLoggerId ?? j.nightLoggerId,
    };
  },
  getMilesForDate: (jobId, date) => {
    const j = get().getJob(jobId);
    return j?.mileageEntries?.find((m) => m.date === date);
  },
  sumMileage: (jobId, rangeStart, rangeEnd) => {
    const j = get().getJob(jobId);
    if (!j?.mileageEntries) return { crewMiles: 0, unitMiles: 0 };
    let crewMiles = 0;
    let unitMiles = 0;
    for (const e of j.mileageEntries) {
      if (e.date < rangeStart || e.date > rangeEnd) continue;
      crewMiles += (e.dayLoggerMiles ?? 0) + (e.nightLoggerMiles ?? 0);
      unitMiles += e.unitMiles ?? 0;
    }
    return { crewMiles, unitMiles };
  },

  setCrewForDate: (jobId, date, role, employeeId) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const existing = j.crewAssignments ?? [];
        const idx = existing.findIndex((a) => a.date === date);
        const key = role === 'day_logger' ? 'dayLoggerId' : 'nightLoggerId';
        const value = employeeId ?? undefined;
        let next: typeof existing;
        if (idx === -1) {
          next = [...existing, { date, [key]: value }];
        } else {
          next = existing.map((a, i) => (i === idx ? { ...a, [key]: value } : a));
        }
        // Drop empty entries
        next = next.filter((a) => a.dayLoggerId || a.nightLoggerId);
        return { ...j, crewAssignments: next.length ? next : undefined };
      }),
    })),
  setMilesForDate: (jobId, date, field, miles) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const existing = j.mileageEntries ?? [];
        const idx = existing.findIndex((m) => m.date === date);
        const value = miles ?? undefined;
        let next: typeof existing;
        if (idx === -1) {
          next = [...existing, { date, [field]: value }];
        } else {
          next = existing.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
        }
        next = next.filter(
          (m) => m.dayLoggerMiles != null || m.nightLoggerMiles != null || m.unitMiles != null
        );
        return { ...j, mileageEntries: next.length ? next : undefined };
      }),
    })),

  setDailyNote: (jobId, date, text) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const existing = j.dailyNotes ?? [];
        const trimmed = text?.trim() ?? '';
        const idx = existing.findIndex((n) => n.date === date);
        let next: typeof existing;
        if (trimmed === '') {
          next = existing.filter((_, i) => i !== idx);
        } else if (idx === -1) {
          next = [...existing, { date, text: trimmed }];
        } else {
          next = existing.map((n, i) => (i === idx ? { ...n, text: trimmed } : n));
        }
        return { ...j, dailyNotes: next.length ? next : undefined };
      }),
    })),
  getDailyNote: (jobId, date) => {
    const j = get().getJob(jobId);
    return j?.dailyNotes?.find((n) => n.date === date)?.text;
  },

  setDailyQuantity: (jobId, date, code, qty) =>
    set((s) => {
      const job = s.jobs.find((j) => j.id === jobId);
      if (!job) return s;
      // Bridge to the boolean ServiceRun/pause model so the activity-history
      // grid continues to reflect what's running. Set qty>0 → ensure code is
      // running on this date; qty=null/0 → ensure code is NOT running.
      const wantRunning = qty != null && qty > 0;
      const currentlyRunning = isCodeRunning(job, date, code);
      let nextJob: Job = job;
      if (wantRunning !== currentlyRunning) {
        nextJob = toggleSingleDate(job, date, code);
      }
      // Update dailyQuantities
      const existing = nextJob.dailyQuantities ?? [];
      const idx = existing.findIndex((q) => q.date === date && q.code === code);
      let nextQ: typeof existing;
      if (!wantRunning) {
        nextQ = existing.filter((_, i) => i !== idx);
      } else if (idx === -1) {
        nextQ = [...existing, { date, code, qty: qty! }];
      } else {
        nextQ = existing.map((q, i) => (i === idx ? { ...q, qty: qty! } : q));
      }
      nextJob = { ...nextJob, dailyQuantities: nextQ.length ? nextQ : undefined };
      return { jobs: s.jobs.map((j) => (j.id === jobId ? nextJob : j)) };
    }),
  getDailyQuantity: (jobId, date, code) => {
    const j = get().getJob(jobId);
    return j?.dailyQuantities?.find((q) => q.date === date && q.code === code)?.qty;
  },

  toggleException: (jobId, date, code) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === jobId ? toggleSingleDate(j, date, code) : j)),
    })),

  confirmJobThrough: (jobId, date) =>
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === jobId
          ? { ...j, confirmedThrough: !j.confirmedThrough || date > j.confirmedThrough ? date : j.confirmedThrough }
          : j
      ),
    })),

  confirmAllJobsThrough: (date) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.status !== 'active' && j.status !== 'scheduled') return j;
        if (j.serviceRuns.length === 0) return j;
        return {
          ...j,
          confirmedThrough:
            !j.confirmedThrough || date > j.confirmedThrough ? date : j.confirmedThrough,
        };
      }),
    })),

  startService: (jobId, code, fromDate) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const newRun: ServiceRun = {
          id: nextRunId(jobId, code),
          code,
          startDate: fromDate,
          pauses: [],
        };
        return { ...j, serviceRuns: [...j.serviceRuns, newRun] };
      }),
    })),

  endService: (jobId, code, asOfDate) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          serviceRuns: j.serviceRuns.map((r) =>
            r.code === code && !r.endDate ? { ...r, endDate: asOfDate } : r
          ),
        };
      }),
    })),

  pauseServiceRange: (jobId, code, fromDate, toDate, reason) =>
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          serviceRuns: j.serviceRuns.map((r) => {
            if (r.code !== code) return r;
            if (!dateInRange(fromDate, r.startDate, r.endDate)) return r;
            return { ...r, pauses: [...r.pauses, { from: fromDate, to: toDate, reason }] };
          }),
        };
      }),
    })),

  createJob: (input) => {
    // Build next sequential job number (Stratagraph uses 1018xxx series; pick max + 1)
    const nums = get()
      .jobs.map((j) => parseInt(j.jobNumber, 10))
      .filter((n) => Number.isFinite(n));
    const nextNum = (nums.length > 0 ? Math.max(...nums) : 1018345) + 1;
    const jobNumber = String(nextNum);
    const id = `job-${jobNumber}-${Date.now().toString(36)}`;
    const status: Job['status'] = input.startDate ? 'scheduled' : 'speculative';
    // Default activeCodes to every daily-billable code from the bid — the
    // op manager will deactivate what doesn't apply rather than re-add what does.
    let activeCodes = input.activeCodes;
    if (!activeCodes) {
      const bid = get().bids.find((b) => b.id === input.bidId);
      const catalog = get().serviceCatalog;
      if (bid) {
        const codes = new Set<DailyCode>();
        for (const li of bid.lineItems) {
          const cat = catalog.find((c) => c.id === li.catalogItemId);
          if (cat?.dailyCode && cat.billingUnit === 'per_day') {
            codes.add(cat.dailyCode);
          }
        }
        activeCodes = Array.from(codes);
      } else {
        activeCodes = [];
      }
    }
    const job: Job = {
      id,
      jobNumber,
      status,
      serviceRuns: [],
      activeCodes,
      ...input,
    };
    set((s) => {
      // Mark assigned crew + unit as deployed (mirrors assignCrew/assignUnit)
      const users = s.users.map((u) => {
        if (u.role !== 'field_crew') return u;
        if (u.id === job.dayLoggerId || u.id === job.nightLoggerId) {
          return { ...u, currentJobId: id, available: false };
        }
        return u;
      });
      const units = job.unitId
        ? s.units.map((u) =>
            u.id === job.unitId
              ? {
                  ...u,
                  currentJobId: id,
                  status: (status === 'active' ? 'logging' : 'ready') as Unit['status'],
                }
              : u
          )
        : s.units;
      return { jobs: [...s.jobs, job], users, units };
    });
    return id;
  },

  assignCrew: (jobId, role, employeeId) =>
    set((s) => {
      const jobs = s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        return role === 'day_logger'
          ? { ...j, dayLoggerId: employeeId ?? undefined }
          : { ...j, nightLoggerId: employeeId ?? undefined };
      });
      // Update each crew user's currentJobId: assignee gets it, previous holder loses it.
      const previousId =
        role === 'day_logger'
          ? s.jobs.find((j) => j.id === jobId)?.dayLoggerId
          : s.jobs.find((j) => j.id === jobId)?.nightLoggerId;
      const users = s.users.map((u) => {
        if (u.role !== 'field_crew') return u;
        if (employeeId && u.id === employeeId) {
          return { ...u, currentJobId: jobId, available: false };
        }
        if (previousId && u.id === previousId && u.id !== employeeId) {
          return { ...u, currentJobId: undefined, available: true };
        }
        return u;
      });
      return { jobs, users };
    }),

  assignUnit: (jobId, unitId) =>
    set((s) => {
      const job = s.jobs.find((j) => j.id === jobId);
      if (!job) return s;
      const previousUnitId = job.unitId;
      const jobs = s.jobs.map((j) => (j.id === jobId ? { ...j, unitId: unitId ?? undefined } : j));
      const units = s.units.map((u) => {
        // Newly-assigned unit picks up this job; status follows the job's lifecycle.
        if (unitId && u.id === unitId) {
          const nextStatus =
            job.status === 'active' ? 'logging' :
            job.status === 'scheduled' ? 'ready' :
            job.status === 'completed' ? 'idle' :
            u.status;
          return { ...u, currentJobId: jobId, status: nextStatus };
        }
        // Previously-assigned unit gets freed (status → idle)
        if (previousUnitId && u.id === previousUnitId && u.id !== unitId) {
          return { ...u, currentJobId: undefined, status: 'idle' as const };
        }
        return u;
      });
      return { jobs, units };
    }),

  updateJob: (jobId, patch) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
    })),

  createBid: (input) => {
    const id = `bid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => {
      const existingForCustomer = s.bids.filter((b) => b.customerId === input.customerId);
      const nextVersion =
        existingForCustomer.length === 0
          ? 1
          : Math.max(...existingForCustomer.map((b) => b.version)) + 1;
      const bid: Bid = {
        id,
        version: nextVersion,
        isActive: input.isActive ?? false,
        createdDate: new Date().toISOString().slice(0, 10),
        customerId: input.customerId,
        status: input.status,
        salesperson: input.salesperson,
        lineItems: input.lineItems,
        notes: input.notes,
      };
      return { bids: [...s.bids, bid] };
    });
    return id;
  },

  updateBid: (bidId, patch) =>
    set((s) => ({
      bids: s.bids.map((b) => {
        if (b.id !== bidId) return b;
        if (b.status === 'accepted') return b; // locked
        return { ...b, ...patch };
      }),
    })),

  acceptBid: (bidId) =>
    set((s) => {
      const bid = s.bids.find((b) => b.id === bidId);
      if (!bid || bid.status === 'accepted') return s;
      const today = new Date().toISOString().slice(0, 10);
      const customer = s.customers.find((c) => c.id === bid.customerId);
      const well = bid.wellId ? s.wells.find((w) => w.id === bid.wellId) : undefined;
      const notification: Notification = {
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'bid_accepted',
        title: `Bid accepted — ${customer?.name ?? 'customer'}`,
        description: well
          ? `${well.name} · ${bid.lineItems.length} line items, ready to spin up a job.`
          : `${bid.lineItems.length} line items, ready to spin up a job.`,
        createdAt: new Date().toISOString(),
        read: false,
        sourceId: bid.id,
        actionLabel: 'Create job',
        actionHref: `/jobs/new?bidId=${bid.id}`,
      };
      return {
        bids: s.bids.map((b) => {
          if (b.id === bidId) {
            return { ...b, status: 'accepted', acceptedDate: today, isActive: true };
          }
          if (b.customerId === bid.customerId && b.isActive) {
            return { ...b, isActive: false };
          }
          return b;
        }),
        notifications: [notification, ...s.notifications],
      };
    }),

  pushNotification: (input) => {
    const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const notif: Notification = {
      id,
      createdAt: new Date().toISOString(),
      read: false,
      ...input,
    };
    set((s) => ({ notifications: [notif, ...s.notifications] }));
    return id;
  },
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  setInvoiceStatus: (invoiceId, status, meta) =>
    set((s) => ({
      invoices: s.invoices.map((t) => {
        if (t.id !== invoiceId) return t;
        const today = new Date().toISOString().slice(0, 10);
        const next: Invoice = { ...t, status };
        if (status === 'sent' && !next.sentDate) next.sentDate = today;
        if (meta?.signedBy) next.signedBy = meta.signedBy;
        if (status === 'paid' && !next.paidDate) next.paidDate = today;
        return next;
      }),
    })),

  createInvoice: ({ jobId, rangeStart, rangeEnd, invoiceNumber, totalUsd }) => {
    const id = `invoice-${jobId}-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const invoice: Invoice = {
      id,
      invoiceNumber,
      projectId: jobId,
      status: 'draft',
      rangeStart,
      rangeEnd,
      generatedDate: today,
      totalUsd,
    };
    set((s) => ({ invoices: [...s.invoices, invoice] }));
    return id;
  },

  tenantId: _initialTenant,
  setTenant: (id) => {
    if (typeof window !== 'undefined') localStorage.setItem('tenant', id);
    const seed = seedForTenant(id);
    set({
      tenantId: id,
      ...seed,
      organization: seed.organization,
      notifications: [],
      projectionProjects: id === 'superior' ? [SEED_SUNCOAST_3A] : [],
      metricsCatalog: createCatalog(id),
      lineItemRegistry: createRegistry(id),
    });
  },
  getTenantConfig: () => TENANTS[get().tenantId] ?? TENANTS.stratagraph,

  projectionProjects: _initialTenant === 'superior' ? [SEED_SUNCOAST_3A] : [],
  activeProjectionId: null,
  getActiveProjection: () => {
    const s = get();
    return s.projectionProjects.find((p) => p.id === s.activeProjectionId) ?? null;
  },
  setActiveProjection: (id) => set({ activeProjectionId: id }),
  addProjectionProject: (project) =>
    set((s) => ({
      projectionProjects: [...s.projectionProjects, project],
      activeProjectionId: project.id,
    })),
  removeProjectionProject: (id) =>
    set((s) => {
      const projects = s.projectionProjects.filter((p) => p.id !== id);
      return {
        projectionProjects: projects,
        activeProjectionId:
          s.activeProjectionId === id ? (projects[0]?.id ?? null) : s.activeProjectionId,
      };
    }),
  updateActiveProjection: (updater) =>
    set((s) => {
      if (!s.activeProjectionId) return s;
      return {
        projectionProjects: s.projectionProjects.map((p) =>
          p.id === s.activeProjectionId ? updater(p) : p,
        ),
      };
    }),

  // Called by the upload dialog after parsing completes when no existing projection is selected.
  autoCreateProjectionFromUpload: (projectName, customer, pm, items) => {
    const project = createEmptyProject(projectName);
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
    for (const item of items) {
      get().addRegistryItem({
        canonicalName: item.label || item.lineKey,
        unitOfMeasure: item.unitOfMeasure || '',
        costType: '',
        sourceProjectId: project.id,
      });
    }

    // Ingest items into the project
    const ingested = ingestDump(project, items, 'Initial Upload');
    set((s) => ({
      projectionProjects: [...s.projectionProjects, ingested],
      activeProjectionId: ingested.id,
    }));
  },

  metricsCatalog: createCatalog(_initialTenant),
  addMetricToStore: (metric) =>
    set((s) => ({ metricsCatalog: addMetric(s.metricsCatalog, metric) })),
  removeMetricFromStore: (metricId) =>
    set((s) => ({ metricsCatalog: removeMetric(s.metricsCatalog, metricId) })),
  updateMetricInStore: (metricId, patch) =>
    set((s) => ({ metricsCatalog: updateMetric(s.metricsCatalog, metricId, patch) })),

  lineItemRegistry: createRegistry(_initialTenant),
  addRegistryItem: (input) =>
    set((s) => ({ lineItemRegistry: addLineItem(s.lineItemRegistry, input) })),
  mergeRegistryItems: (targetId, alias) =>
    set((s) => ({ lineItemRegistry: mergeLineItems(s.lineItemRegistry, targetId, alias) })),
  separateRegistryAlias: (itemId, aliasRaw) =>
    set((s) => ({ lineItemRegistry: separateAlias(s.lineItemRegistry, itemId, aliasRaw) })),
  editRegistryItemName: (itemId, newName) =>
    set((s) => ({ lineItemRegistry: editLineItemName(s.lineItemRegistry, itemId, newName) })),

  getMonthlyQuantity: (projectId, lineItemId, yearMonth) => {
    const job = get().jobs.find((j) => j.id === projectId);
    if (!job) return { qty: 0, hours: 0 };
    const parts = yearMonth.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const daysInMonth = new Date(y, m, 0).getDate();
    let totalQty = 0;
    const totalHours = 0;
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

  setMonthlyQuantity: (projectId, lineItemId, yearMonth, qty, _hours) => {
    const ymParts = yearMonth.split('-');
    const y = Number(ymParts[0]);
    const m = Number(ymParts[1]);
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

  submitForecast: (projectId, versionId) => {
    set((s) => ({
      projectionProjects: s.projectionProjects.map((p) =>
        p.id === projectId ? lockVersion(p, versionId) : p
      ),
    }));
  },

  generateInvoiceFromForecast: (projectId, versionId) => {
    const project = get().projectionProjects.find((p) => p.id === projectId);
    if (!project) return;
    const version = project.versions.find((v) => v.id === versionId);
    if (!version || !version.saved) return;

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
}));

export const REGION_LABELS: Record<import('./types').Region, string> = {
  W_TEX: 'West Texas',
  S_TEX: 'South Texas',
  LA: 'Louisiana',
  OK: 'Oklahoma',
  OTHER: 'Other',
  S_FL: 'South FL',
  C_FL: 'Central FL',
  PANHANDLE: 'Panhandle',
};

export const TENANT_REGIONS: Record<import('./tenant').TenantId, import('./types').Region[]> = {
  stratagraph: ['W_TEX', 'S_TEX', 'LA', 'OK', 'OTHER'],
  superior: ['S_FL', 'C_FL', 'PANHANDLE'],
};

export const JOB_STATUS_LABELS = {
  speculative: 'Speculative',
  scheduled: 'Scheduled',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export const UNIT_STATUS_LABELS = {
  idle: 'Idle',
  logging: 'Logging',
  ready: 'Ready',
  turn: 'Turn',
  build: 'Build',
  on_barge: 'On Barge',
} as const;
