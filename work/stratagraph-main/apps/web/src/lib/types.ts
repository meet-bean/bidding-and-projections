/**
 * Domain types for the Stratagraph prototype.
 * Mock-data-only — these will map onto Prisma models in the production build.
 */

export type ServiceCategory = 'logging' | 'xrf_ftir' | 'real_time' | 'cuttings' | 'unmanned_gas';

/**
 * Top-level service line a job is operating under. Drives invoicing and tax-id
 * routing (geosteering is a separate subsidiary with its own QB instance, etc.).
 */
export type OrderType = 'mudlogging' | 'geosteering' | 'wellbore_placement';

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  mudlogging: 'Mudlogging',
  geosteering: 'Geosteering',
  wellbore_placement: 'Wellbore Placement',
};
export type Region = 'W_TEX' | 'S_TEX' | 'LA' | 'OK' | 'OTHER' | 'S_FL' | 'C_FL' | 'PANHANDLE';
export type JobStatus = 'speculative' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type UnitStatus = 'idle' | 'logging' | 'ready' | 'turn' | 'build' | 'on_barge';
/**
 * Invoice lifecycle — collapsed to the three states ops actually tracks:
 *  - draft: created but not yet sent
 *  - sent: out to customer (covers signed/invoiced — Mickey doesn't distinguish)
 *  - paid: cash collected
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type CrewRole = 'day_logger' | 'night_logger' | 'sample_catcher' | 'supervisor';

/**
 * Billing unit for a catalog item — drives how the item is grouped on the
 * job detail and how the ticket builder rolls up totals.
 *  - per_day:    charged once per day the service is running (LOG, FTIR, OBM…)
 *  - per_event:  charged once per occurrence (rig up/down, hotshot)
 *  - per_mile:   charged per mile traveled (unit/crew/sample transport)
 *  - per_well:   one-time per well (final deliverable, consumables)
 *  - per_sample: per sample analyzed (calcimetry, off-site analysis)
 *  - per_other:  catch-all (per-night lodging, per-hour, per-fold, per-jar…)
 */
export type BillingUnit =
  | 'per_day'
  | 'per_event'
  | 'per_mile'
  | 'per_well'
  | 'per_sample'
  | 'per_other';

/** A service in the master service catalog (sourced from Blank bid.xlsx). */
export interface ServiceCatalogItem {
  id: string;
  category: ServiceCategory;
  name: string;
  /** Default unit price in USD. Null when the price is "TBD" or "Cost + X%". */
  defaultRate: number | null;
  /** Free-text rate when defaultRate is null (e.g. "Cost + 25%", "TBD"). */
  rateNote: string | null;
  /** Short code used in the daily activity grid (LOG, XRF, FTIR, MASS, OBM, etc). */
  dailyCode?: DailyCode;
  /** How this item is billed — daily, per-event, per-mile, etc. */
  billingUnit: BillingUnit;
}

/** Daily activity columns from the LA/W TEX/S TEX tracking sheets. */
export type DailyCode =
  | 'LOG'
  | 'XRF'
  | 'FTIR'
  | 'MASS'
  | 'UMMS'
  | 'UMG'
  | 'GAS_M'
  | 'CATCH'
  | 'CO2'
  | 'H2S'
  | 'ISO'
  | 'CVT'
  | 'MPD'
  | 'FLUO'
  | 'RT'
  | 'WIT'
  | 'SAFE'
  | 'OBM'
  | 'STBY'
  | 'HOLD'
  | 'OT';

export interface DailyCodeMeta {
  code: DailyCode;
  label: string;
  kind: 'service' | 'modifier';
  catalogItemId?: string;
}

export interface Customer {
  id: string;
  name: string;
  billingAddress: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  contactTitle?: string;
  invoiceMethod: 'email' | 'mail' | 'portal' | 'ariba' | 'open_invoice';
  msaOnFile: boolean;
  w9OnFile: boolean;
  achEnabled: boolean;
  salesperson: string;
}

/**
 * A drilling well owned by a customer. One Job is run at one Well; a Customer
 * can have many Wells. Bids are scoped to a specific Well so Mickey picks
 * Customer → Well → Services in one place, and the Job inherits both.
 */
export interface Well {
  id: string;
  customerId: string;
  name: string;
  apiNumber?: string;
  county?: string;
  state?: string;
  /** Optional pad name when several wells share infrastructure. */
  pad?: string;
  /** Rig coordinates — wells don't have street addresses. */
  gpsCoordinates?: string;
  /** Geographic area within the customer's operations. */
  locationId?: string;
  /** Drilling rig assigned to the well. */
  rigId?: string;
  status: 'planned' | 'drilling' | 'completed' | 'inactive';
  notes?: string;
}

export const WELL_STATUS_LABELS: Record<Well['status'], string> = {
  planned: 'Planned',
  drilling: 'Drilling',
  completed: 'Completed',
  inactive: 'Inactive',
};

export interface BidService {
  id: string;
  catalogItemId: string;
  /** Bid-specific rate override. Falls back to catalog defaultRate when null. */
  rate: number;
  /** Estimated qty / days for reference only. Real qty comes from daily activity. */
  estimatedQty?: number;
}

/**
 * Bid lifecycle.
 *  - draft     → not yet sent. Retained for historical data; UI no longer produces.
 *  - sent      → "Pending" — out to customer, awaiting decision.
 *  - accepted  → "Active" — signed off; rate card is live and work runs against it.
 *  - completed → all jobs against the bid have wound down AND all tickets are paid.
 *                Marks the contract as fully recognized revenue.
 *  - lost      → customer declined.
 */
export type BidStatus = 'draft' | 'sent' | 'accepted' | 'completed' | 'lost';

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  draft: 'Draft',
  sent: 'Pending',
  accepted: 'Active',
  completed: 'Completed',
  lost: 'Lost',
};

export interface Bid {
  id: string;
  customerId: string;
  /** Well this bid is scoped to. New bids require one; legacy bids may omit. */
  wellId?: string;
  version: number;
  /** True when this bid is the live rate card used to bill the customer. */
  isActive: boolean;
  status: BidStatus;
  createdDate: string;
  /** Date the customer accepted the bid (set when status flips to 'accepted'). */
  acceptedDate?: string;
  salesperson: string;
  services: BidService[];
  notes?: string;
}

/**
 * A continuous span during which a daily-code service was running on a job.
 * Activity for any (job × date × code) is *derived* from these runs — services
 * are running by default once started, until ended or paused. Mickey's mental
 * model: "I turn on a service and it keeps running until I stop it or pause it."
 */
export interface ServiceRun {
  id: string;
  code: DailyCode;
  /** Inclusive start date (YYYY-MM-DD). */
  startDate: string;
  /** Inclusive end date. Undefined = still running (open-ended). */
  endDate?: string;
  /** Day-level exceptions within the run where the service was paused. Inclusive on both ends. */
  pauses: { from: string; to: string; reason?: string }[];
}

/** Free-text activity note for a single date (drilling progress, etc.). */
export interface DailyNote {
  date: string;
  text: string;
}

/**
 * Per-day quantity override for a daily code. The mere presence of a value
 * marks the day as "running" for that code (no separate ServiceRun needed).
 * Numeric quantity > 1 means multiple units that day — e.g. OBM has qty 4
 * when 4 loggers are exposed to oil-base mud.
 */
export interface DailyQuantity {
  date: string;
  code: DailyCode;
  qty: number;
}

/** Per-day crew override. Either field empty = inherit job-level default. */
export interface DailyCrewAssignment {
  date: string;
  dayLoggerId?: string;
  nightLoggerId?: string;
}

/** Per-day miles logged by each crew column. */
export interface MileageEntry {
  date: string;
  /** Round-trip miles driven by the day logger from closest field office. */
  dayLoggerMiles?: number;
  /** Round-trip miles driven by the night logger from closest field office. */
  nightLoggerMiles?: number;
  /** Unit miles for that day (rare — usually per-event, not daily). */
  unitMiles?: number;
}

export interface Job {
  id: string;
  jobNumber: string;
  customerId: string;
  bidId: string;
  /** FK to Well. Optional for legacy seed data that only has wellName. */
  wellId?: string;
  /** Top-level service line — drives invoicing routing. */
  orderType: OrderType;
  wellName: string;
  apiNumber?: string;
  county?: string;
  state?: string;
  region: Region;
  status: JobStatus;
  startDate?: string;
  endDate?: string;
  unitId?: string;
  dayLoggerId?: string;
  nightLoggerId?: string;
  companyMan?: string;
  /** Customer geologist coordinating data delivery / interpretation. */
  geologist?: string;
  projectManagerId?: string;
  /** FK to Location (basin/county area within the customer's operations). */
  locationId?: string;
  /** FK to Rig (the drilling rig). Cascades from Location. */
  rigId?: string;
  afe?: string;
  /** Run number for pad drilling: same well, multiple runs share a grouping identifier. */
  runNumber?: number;
  /** Optional well pad name when several wells share infrastructure. */
  wellPad?: string;
  /** Call-out flag: dispatched with little/no prep. Flagged separately for reporting. */
  isCallOut?: boolean;
  /** Hotel / per-diem lodging. Booked by Ops Manager for crew on this job. */
  lodging?: string;
  /** Rig coordinates — rig sites have no street address. */
  gpsCoordinates?: string;
  /** Stratagraph field office mileage is billed from (not logger's home). */
  fieldOffice?: string;
  /** Service-state log. Activity per (date × code) is derived from these runs. */
  serviceRuns: ServiceRun[];
  /**
   * Per-day crew overrides. Each entry replaces the job-level dayLoggerId /
   * nightLoggerId for that single date. Days without an entry inherit the
   * job-level default. Lets a job rotate crew across days (e.g. Days 1-5 =
   * Wright, Days 6-14 = Bouldin) without losing the historical record.
   */
  crewAssignments?: DailyCrewAssignment[];
  /** Per-day free-text activity notes (drilling progress, etc.). */
  dailyNotes?: DailyNote[];
  /** Per-day quantity overrides for daily codes (presence implies "running"). */
  dailyQuantities?: DailyQuantity[];
  /**
   * Per-day mileage entries. Captures what the client spreadsheet logs in the
   * MILES columns next to each CREW column — driven from closest field office
   * by each logger on that day. Unit miles are per-event (pickup, rig-down),
   * not daily — those are stored as separate non-dated entries.
   */
  mileageEntries?: MileageEntry[];
  /**
   * Last date Mickey explicitly confirmed activity is correct. Days after this
   * are "auto-running" (derived but unconfirmed) and show a dim/unconfirmed
   * state in the UI. Undefined = nothing confirmed yet.
   */
  confirmedThrough?: string;
  /** Which DailyCodes are configured to run on this job (subset of bid). */
  activeCodes: DailyCode[];
  notes?: string;
}

export interface Unit {
  id: string;
  code: string;
  type: 'analytical' | 'logging' | 'mass_spec' | 'gas_monitor' | 'earthwork' | 'lifting' | 'hauling' | 'paving';
  /** FK to Yard. Drives field-office mileage on tickets + relocation tracking. */
  yardId: string;
  region: Region;
  status: UnitStatus;
  currentJobId?: string;
  notes?: string;
}

/**
 * A geographic area where a customer operates — basin, county, or specific
 * lease. Sits between Company and Rig in the customer hierarchy. Drives the
 * cascading dropdown on job creation (Company → Location → Rig).
 */
export interface Location {
  id: string;
  name: string;
  customerId: string;
  region: Region;
  /** Optional basin tag (Delaware, Permian, Eagle Ford, Haynesville, etc.). */
  basin?: string;
}

/**
 * A specific drilling rig. Lives at a Location and is owned by a drilling
 * contractor (Patterson, Precision, etc.). Job assignment cascades:
 * pick Company → narrows Locations → narrows Rigs.
 */
export interface Rig {
  id: string;
  name: string;
  locationId: string;
  /** Drilling contractor (Patterson, Precision, Windham, etc.). */
  contractor?: string;
}

/**
 * Top-level role for everyone at Stratagraph — admins, sales, ops, AND field crew.
 * Drives navigation visibility + write permissions. Field crew get the
 * `field_crew` role plus a sub-role (`crewRole`) for shift assignment.
 */
export type UserRole = 'executive' | 'sales' | 'operations' | 'project_manager' | 'field_crew';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  executive: 'Executive',
  sales: 'Sales',
  operations: 'Operations',
  project_manager: 'Project Manager',
  field_crew: 'Field Crew',
};

/**
 * Anyone at Stratagraph. Replaces the old Employee/User split — field crew are
 * now Users with `role: 'field_crew'` and crew-only fields (crewRole, certs,
 * dayRate, …). Aligns with the sop-platform 'operator' concept and lets a future
 * Certifications module attach to one entity.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  /** Coverage region for sales/ops; for crew, their home region. */
  region?: Region;
  title?: string;
  // ----- field_crew specifics (populated only when role === 'field_crew') -----
  /** Shift role on a job: day_logger, night_logger, sample_catcher, supervisor. */
  crewRole?: CrewRole;
  certifications?: string[];
  yearsExperience?: number;
  dayRate?: number;
  /** Current job assignment (back-reference). */
  currentJobId?: string;
  /** Dispatch availability — true when not currently on a job. */
  available?: boolean;
}

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

/** Stratagraph yard / field office. Equipment stages here; mileage bills from here. */
export interface Yard {
  id: string;
  name: string;
  city: string;
  state: string;
  region: Region;
  isActive: boolean;
  /** Set when ops has flagged the yard for closure (Mickey's consolidation plan). */
  closingDate?: string;
  notes?: string;
}

/**
 * In-app notification for the operations user. Generated when state changes
 * the user should know about — bid accepted, ticket signed, etc.
 */
export type NotificationKind = 'bid_accepted' | 'ticket_signed' | 'ticket_paid' | 'generic';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  /** ISO datetime when the notification was generated. */
  createdAt: string;
  read: boolean;
  /** Source entity (bid id, ticket id, etc.) — used for grouping/dedupe. */
  sourceId?: string;
  /** Optional inline CTA on the notification row. */
  actionLabel?: string;
  actionHref?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  /** The project this invoice bills for. Same entity as "job" in Stratagraph UI. */
  projectId: string;
  status: InvoiceStatus;
  rangeStart: string;
  rangeEnd: string;
  generatedDate: string;
  /** Date this invoice was sent to the customer (status flipped to 'sent'). */
  sentDate?: string;
  /** Date the customer signed (informational only — not a separate state). */
  signedDate?: string;
  signedBy?: string;
  paidDate?: string;
  totalUsd: number;
  notes?: string;
  /** When generated from a forecast (Superior flow), references the locked version. */
  forecastVersionId?: string;
}
