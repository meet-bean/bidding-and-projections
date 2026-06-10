import { Badge, cn } from '@repo/ui';
import { JOB_STATUS_LABELS, UNIT_STATUS_LABELS } from '~/lib/store';
import { BID_STATUS_LABELS } from '~/lib/types';
import type { BidStatus, InvoiceStatus, JobStatus, Unit, UnitStatus } from '~/lib/types';

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
};

/**
 * Centralized palette → status mapping. All badges share these classes so
 * the visual story stays consistent.
 *
 * Palette: green / indigo / gold / slate / coral / cyan / orange / mauve / steel.
 */
export const JOB_STATUS_CLASSES: Record<JobStatus, string> = {
  active: 'bg-strat-green/15 text-strat-green border-strat-green/30',
  scheduled: 'bg-strat-indigo/15 text-strat-indigo border-strat-indigo/30',
  speculative: 'bg-strat-gold/20 text-strat-gold border-strat-gold/40',
  completed: 'bg-strat-slate/15 text-strat-slate border-strat-slate/30',
  cancelled: 'bg-strat-coral/15 text-strat-coral border-strat-coral/30',
};

const INVOICE_STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-strat-slate/15 text-strat-slate border-strat-slate/30',
  sent: 'bg-strat-gold/20 text-strat-gold border-strat-gold/40',
  paid: 'bg-strat-green/15 text-strat-green border-strat-green/30',
};

const BID_STATUS_CLASSES: Record<BidStatus, string> = {
  draft: 'bg-strat-slate/15 text-strat-slate border-strat-slate/30',
  sent: 'bg-strat-gold/20 text-strat-gold border-strat-gold/40',
  accepted: 'bg-strat-green/15 text-strat-green border-strat-green/30',
  completed: 'bg-strat-slate/15 text-strat-slate border-strat-slate/30',
  lost: 'bg-strat-coral/15 text-strat-coral border-strat-coral/30',
};

const UNIT_STATUS_CLASSES: Record<UnitStatus, string> = {
  idle: 'bg-strat-slate/15 text-strat-slate border-strat-slate/30',
  logging: 'bg-strat-green/15 text-strat-green border-strat-green/30',
  ready: 'bg-strat-indigo/15 text-strat-indigo border-strat-indigo/30',
  turn: 'bg-strat-gold/20 text-strat-gold border-strat-gold/40',
  build: 'bg-strat-orange/15 text-strat-orange border-strat-orange/30',
  on_barge: 'bg-strat-cyan/15 text-strat-cyan border-strat-cyan/30',
};

export function JobStatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(JOB_STATUS_CLASSES[status], className)}>{JOB_STATUS_LABELS[status]}</Badge>
  );
}

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(INVOICE_STATUS_CLASSES[status], className)}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function BidStatusBadge({
  status,
  className,
}: {
  status: BidStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(BID_STATUS_CLASSES[status], className)}>
      {BID_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UnitStatusBadge({
  status,
  className,
}: {
  status: UnitStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(UNIT_STATUS_CLASSES[status], className)}>
      {UNIT_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Generic resource states shared across admin pages (users, crew, yards).
 * One source so "Available"/"Active"/"Open" is the same green everywhere.
 */
const STATE_CLASSES = {
  positive: 'bg-strat-green/15 text-strat-green border-strat-green/30',
  neutral: 'bg-strat-slate/15 text-strat-slate border-strat-slate/30',
  caution: 'bg-strat-orange/15 text-strat-orange border-strat-orange/30',
} as const;

export function StateBadge({
  tone,
  className,
  children,
}: {
  tone: keyof typeof STATE_CLASSES;
  className?: string;
  children: React.ReactNode;
}) {
  return <Badge className={cn(STATE_CLASSES[tone], className)}>{children}</Badge>;
}

/**
 * Equipment availability — the demo-friendly shape Mickey + his boss think in.
 * Derived from whether the unit is currently on a job. Detailed UnitStatus
 * stays internal; this badge surfaces the two states that matter at a glance.
 */
export function UnitAvailabilityBadge({
  unit,
  className,
}: {
  unit: Pick<Unit, 'currentJobId' | 'status'>;
  className?: string;
}) {
  // Consistent semantics with the crew badges: green = available/ready,
  // muted slate = currently deployed (not a free resource).
  const isDeployed = !!unit.currentJobId || unit.status === 'logging' || unit.status === 'ready';
  return isDeployed ? (
    <Badge className={cn('bg-strat-slate/15 text-strat-slate border-strat-slate/30', className)}>
      Deployed
    </Badge>
  ) : (
    <Badge className={cn('bg-strat-green/15 text-strat-green border-strat-green/30', className)}>
      Available
    </Badge>
  );
}
