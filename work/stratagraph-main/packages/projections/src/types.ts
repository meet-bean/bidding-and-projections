export interface TimeSlice {
  qty: number;
  hours: number;
  /** Units per manhour (qty / hours). Derived. */
  upm: number;
  /** Manhours per unit (hours / qty). Derived. */
  mpu: number;
  /** Unit cost (cost / qty). Derived. */
  uc: number;
  cost: number;
}

export interface ProjectionItem {
  /** Composite key — e.g. "B-100-|2Labor" for Vista. */
  lineKey: string;
  /** Decomposed key parts — e.g. ["B-100-", "2Labor"]. */
  keyParts: string[];
  /** Human-readable label for the first key part (phase description, well name, etc). */
  label: string;
  /** Unit of measure string from source data. */
  unitOfMeasure: string;

  CTP: TimeSlice;
  CTD: TimeSlice;
  CTC: TimeSlice;
  F: TimeSlice;
  Est: TimeSlice;

  /** Estimate variance (Est.cost - F.cost). From source or derived. */
  estVar: number;
  /** Dollar % complete (CTD.cost / F.cost * 100). Derived. */
  comp: number;
  /** Previous version's forecast cost — for vs-prev variance. */
  prevForecast: number;
  /** Sanity-check hours: (CTD.hours / CTD.cost) * F.cost. Derived. */
  calcHrs: number;
  /** Worksheet risk formula: F.cost - (CTD.cost * F.qty / CTD.qty). Derived. */
  wsRisk: number;
  /** True when this line item first appeared in the current cycle. */
  isNew: boolean;
  /** True when this line item was in a prior version but missing from the current dump. */
  stale: boolean;
}

export interface ProjectionVersion {
  id: string;
  label: string;
  createdAt: string;
  items: ProjectionItem[];
  saved: boolean;
}

export interface ProjectionComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  /** Label of the version this comment was written on. */
  versionLabel?: string;
  /** If this comment resolved an alert, the alert's id. */
  resolvesAlertId?: string;
}

export interface AlertResolution {
  status: 'resolved';
  resolvedBy: string;
  resolvedAt: string;
  commentId: string;
  snapshot: {
    key: string;
    type: string;
    severity: AlertSeverity;
    title: string;
    detail: string;
    lens?: VarianceLens;
  };
}

export interface FinancialSummaryMonth {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  gpPct: number;
}

export interface FinancialSummary {
  months: FinancialSummaryMonth[];
  originalBid: {
    revenue: number;
    cost: number;
    profit: number;
    gpPct: number;
  } | null;
}

export interface ProjectionProject {
  id: string;
  name: string;
  jobNumber: string;
  customer: string;
  pm: string;
  createdAt: string;
  versions: ProjectionVersion[];
  draft: ProjectionVersion | null;
  /** Comments keyed by lineKey — persist across all versions. */
  comments: Record<string, ProjectionComment[]>;
  /** Alert resolution status keyed by alert id. */
  alertStatus: Record<string, AlertResolution>;
  financials: FinancialSummary | null;
}

export type VarianceLens = 'vsPrev' | 'vsOrig' | 'leftToSpend';

export interface VarianceResult {
  delta: number;
  pct: number;
  base: number;
  current: number;
  /** For leftToSpend lens: prior version's left-to-spend. */
  prevLts?: number | null;
  /** For leftToSpend lens: change in LTS vs prior version. */
  ltsChange?: number | null;
}

export type AlertSeverity = 'high' | 'medium' | 'info';

export type AlertType =
  | 'new'
  | 'stale'
  | 'var-prev'
  | 'var-orig'
  | 'overspend'
  | 'orphan'
  | 'uc-deviation'
  | 'mpu-deviation'
  | 'ctc-unrealistic';

export interface ProjectionAlert {
  id: string;
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  lens?: VarianceLens;
  resolution?: AlertResolution;
}

export interface AlertsResult {
  open: ProjectionAlert[];
  resolved: ProjectionAlert[];
  all: ProjectionAlert[];
}

export interface PhaseHistoryPoint {
  versionLabel: string;
  date: string;
  forecast: number;
  actualToDate: number;
  estimate: number;
  fUC: number;
  ctdUC: number;
  estUC: number;
  fMPU: number;
  ctdMPU: number;
  estMPU: number;
  fUPM: number | null;
  ctdUPM: number | null;
  estUPM: number | null;
}

export interface SummaryRow {
  costType: string;
  count: number;
  CTP: TimeSlice;
  CTD: TimeSlice;
  CTC: TimeSlice;
  F: TimeSlice;
  Est: TimeSlice;
}

export interface SummaryResult {
  summaryRows: SummaryRow[];
  grand: SummaryRow;
}

/** Known cost types from Vista exports. */
export const COST_TYPES = [
  '2Labor',
  '3Material',
  '4Rental',
  '5SubCont',
  '6OtherJC',
  '8Parts',
  '9Owned',
  '10Health',
  '11Fuel',
] as const;

export type CostType = (typeof COST_TYPES)[number];
