import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  PageHeaderTitle,
  PageHeaderActions,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
} from '@repo/ui';
import {
  ArrowLeft,
  Receipt,
  AlertCircle,
  Plus,
  Square,
  Wrench,
  Truck,
  CircleDot,
  Zap,
} from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { ServiceToggles } from '~/components/service-toggles';
import { InvoiceStatusBadge, JobStatusBadge } from '~/components/status-badges';
import { JobActivityTab } from '~/components/job-activity-tab';
import { TicketLifecycleStrip } from '~/components/ticket-lifecycle';
import { CrewUnitAssignments } from '~/components/crew-unit-assignments';
import { GenerateInvoiceDialog } from '~/components/generate-invoice-dialog';
import { BILLING_UNIT_LABELS, DAILY_CODE_META } from '~/data/service-catalog';
import { ORDER_TYPE_LABELS } from '~/lib/types';
import type { DailyCode, Job, JobStatus } from '~/lib/types';

export const Route = createFileRoute('/_dashboard/jobs/$jobId')({
  component: JobDetail,
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function JobDetail() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const job = useStore((s) => s.getJob(jobId));
  const customer = useStore((s) => (job ? s.getCustomer(job.customerId) : undefined));
  const bid = useStore((s) => (job ? s.getBid(job.bidId) : undefined));
  const unit = useStore((s) => (job?.unitId ? s.getUnit(job.unitId) : undefined));
  const pm = useStore((s) => (job?.projectManagerId ? s.getUser(job.projectManagerId) : undefined));
  const catalog = useStore((s) => s.serviceCatalog);
  // Filter in a memo (returning a fresh array from the selector causes render loops).
  const allTickets = useStore((s) => s.invoices);
  const updateJob = useStore((s) => s.updateJob);
  const tickets = useMemo(() => allTickets.filter((t) => t.projectId === jobId), [allTickets, jobId]);

  if (!job) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/jobs' })}>
          <ArrowLeft />
          Back to Jobs
        </Button>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            Job not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [generateOpen, setGenerateOpen] = useState(false);

  const lastTicket = tickets.length > 0
    ? tickets.reduce((latest, t) => (t.generatedDate > latest.generatedDate ? t : latest))
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PageHeaderTitle>{job.wellName}</PageHeaderTitle>
            <JobStatusBadge status={job.status} />
            {job.isCallOut ? (
              <Badge variant="warning" className="gap-1">
                <Zap className="size-3" />
                Call-Out
              </Badge>
            ) : null}
            {job.runNumber && job.runNumber > 1 ? (
              <Badge variant="outline" className="text-xs">Run #{job.runNumber}</Badge>
            ) : null}
            {job.wellPad ? (
              <Badge variant="outline" className="text-xs">Pad: {job.wellPad}</Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            {customer ? (
              <Link
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                {customer.name}
              </Link>
            ) : null}
            {job.county ? (
              <span className="text-muted-foreground text-sm">
                · {job.county}, {job.state}
              </span>
            ) : null}
            <span className="text-muted-foreground text-sm">
              ·{' '}
              <InlineDateField
                value={job.startDate}
                placeholder="Set start"
                onSave={(v) => updateJob(job.id, { startDate: v })}
              />
              {job.startDate ? (
                <>
                  {' → '}
                  <InlineDateField
                    value={job.endDate}
                    placeholder="present"
                    onSave={(v) => updateJob(job.id, { endDate: v })}
                  />
                </>
              ) : null}
            </span>
            {unit ? (
              <span className="text-muted-foreground text-sm">
                {' · '}
                <span
                  className="bg-muted/60 text-foreground inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs"
                  title={`Unit ${unit.code} · ${unit.type.replace('_', ' ')}`}
                >
                  <Truck className="size-3" />
                  {unit.code}
                </span>
              </span>
            ) : null}
            {pm ? (
              <span className="text-muted-foreground text-sm">
                {' · PM: '}
                <span className="text-foreground font-medium">{pm.name}</span>
              </span>
            ) : null}
          </div>
        </div>
        <PageHeaderActions>
          <Button onClick={() => setGenerateOpen(true)}>
            <Receipt />
            Generate Ticket
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <GenerateInvoiceDialog open={generateOpen} onOpenChange={setGenerateOpen} job={job} />

      <JobStatsStrip job={job} bid={bid} catalog={catalog} tickets={tickets} onTicketsClick={() => document.getElementById('field-tickets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />

      <div className="divide-y divide-border/60">
        <div className="pb-8">
          <ServiceToggles job={job} />
        </div>

        {/* Assignments — single row, compact */}
        <section className="space-y-4 py-8">
          <h2 className="text-base font-semibold">Assignments</h2>
          <CrewUnitAssignments job={job} />
        </section>

        <section className="space-y-3 py-8">
          <h2 className="text-base font-semibold">Daily Activity</h2>
          <JobActivityTab job={job} />
        </section>

        <section id="field-tickets" className="space-y-3 pt-8 scroll-mt-4">
          <div className="flex flex-row items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Field Tickets</h2>
              {lastTicket ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Last billed through{' '}
                  <span className="text-foreground font-medium">{lastTicket.rangeEnd}</span>
                  {' · '}
                  <InvoiceStatusBadge status={lastTicket.status} className="ml-1 align-middle" />
                </p>
              ) : null}
            </div>
            <Button onClick={() => setGenerateOpen(true)} size="sm">
              <Receipt />
              Generate
            </Button>
          </div>
          {tickets.length === 0 ? null : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: t.id }}
                  className="hover:bg-muted/40 flex flex-col gap-2 rounded-md border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-mono text-sm">{t.invoiceNumber}</div>
                      <div className="text-muted-foreground text-xs">
                        {t.rangeStart} → {t.rangeEnd}
                      </div>
                    </div>
                    <TicketLifecycleStrip status={t.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <InvoiceStatusBadge status={t.status} />
                    <span className="font-semibold tabular-nums">
                      $
                      {t.totalUsd.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI bits
// ---------------------------------------------------------------------------

/**
 * Top-of-page stat strip so the job page answers "where is this at?" in one
 * scan: how long it's been running, what it earns per day, when it was last
 * confirmed, and whether tickets are outstanding. Each tile is a soft card —
 * neutral chrome, the number does the talking.
 */
function JobStatsStrip({
  job,
  bid,
  catalog,
  tickets,
  onTicketsClick,
}: {
  job: Job;
  bid: ReturnType<typeof useStore.getState>['bids'][number] | undefined;
  catalog: ReturnType<typeof useStore.getState>['serviceCatalog'];
  tickets: ReturnType<typeof useStore.getState>['invoices'];
  onTicketsClick?: () => void;
}) {
  const today = todayIso();

  // Days the job has been running, inclusive of today.
  const daysRunning = useMemo(() => {
    if (!job.startDate || job.startDate > today) return null;
    const ms = new Date(today + 'T00:00:00').getTime() - new Date(job.startDate + 'T00:00:00').getTime();
    return Math.floor(ms / 86_400_000) + 1;
  }, [job.startDate, today]);

  // Daily total = sum of rates on per-day catalog items whose dailyCode is
  // currently running on the job. Matches the bid editor's "estimated daily"
  // accounting so the two pages tell the same story.
  const dailyTotal = useMemo(() => {
    if (!bid) return null;
    const runningCodes = new Set<DailyCode>();
    for (const r of job.serviceRuns) {
      if (r.endDate && r.endDate < today) continue;
      runningCodes.add(r.code);
    }
    if (runningCodes.size === 0) return 0;
    let sum = 0;
    for (const li of bid.services) {
      const cat = catalog.find((c) => c.id === li.catalogItemId);
      if (!cat?.dailyCode || cat.billingUnit !== 'per_day') continue;
      if (!runningCodes.has(cat.dailyCode)) continue;
      sum += li.rate;
    }
    return sum;
  }, [bid, catalog, job.serviceRuns, today]);

  // Last confirmed date relative to today.
  const confirmedAgo = useMemo(() => {
    if (!job.confirmedThrough) return null;
    const ms = new Date(today + 'T00:00:00').getTime() - new Date(job.confirmedThrough + 'T00:00:00').getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }, [job.confirmedThrough, today]);

  const openTickets = tickets.filter((t) => t.status !== 'paid').length;
  const paidTickets = tickets.filter((t) => t.status === 'paid').length;

  // "Stale" — running but not confirmed in 3+ days. Mickey's signal to act.
  const isStale = (() => {
    if (job.status !== 'active') return false;
    if (!job.confirmedThrough) return daysRunning != null && daysRunning >= 3;
    const ms = new Date(today + 'T00:00:00').getTime() - new Date(job.confirmedThrough + 'T00:00:00').getTime();
    return Math.floor(ms / 86_400_000) >= 3;
  })();

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
      <StatTile label="Days running" value={daysRunning != null ? `${daysRunning}` : '—'} hint={daysRunning != null ? 'since start' : 'not started'} />
      <StatTile
        label="Daily total"
        value={dailyTotal != null ? `$${dailyTotal.toLocaleString('en-US')}` : '—'}
        hint={dailyTotal === 0 ? 'nothing running' : 'while services run'}
        tone={dailyTotal != null && dailyTotal > 0 ? 'positive' : undefined}
      />
      <StatTile
        label="Last confirmed"
        value={job.confirmedThrough ? formatShortDate(job.confirmedThrough) : 'Not yet'}
        hint={confirmedAgo ?? 'no activity confirmed'}
        tone={isStale ? 'warning' : undefined}
      />
      <StatTile
        label="Tickets"
        value={tickets.length === 0 ? '0' : `${openTickets} open`}
        hint={tickets.length === 0 ? 'none generated' : `${paidTickets} paid`}
        onClick={tickets.length > 0 ? onTicketsClick : undefined}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'positive' | 'warning';
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums tracking-tight',
          tone === 'positive' && 'text-strat-green',
          tone === 'warning' && 'text-strat-orange'
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div> : null}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-card hover:bg-muted/30 group/tile cursor-pointer px-4 py-3 text-left transition-colors"
      >
        {content}
      </button>
    );
  }
  return <div className="bg-card px-4 py-3">{content}</div>;
}

function CompactItem({
  label,
  value,
  hint,
  mono,
  muted,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 text-sm font-medium',
          mono && 'font-mono',
          muted && 'text-muted-foreground'
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div> : null}
    </div>
  );
}

function InlineDateField({
  value,
  placeholder,
  onSave,
}: {
  value: string | undefined;
  placeholder: string;
  onSave: (value: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const display = value ? formatShortDate(value) : placeholder;

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={value ?? ''}
        onBlur={(e) => {
          const v = e.target.value;
          if (v !== (value ?? '')) onSave(v || undefined);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value;
            if (v !== (value ?? '')) onSave(v || undefined);
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="rounded border border-primary bg-transparent px-1 py-0 text-sm outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'hover:bg-muted/40 rounded px-1 underline-offset-4 hover:underline',
        !value && 'text-muted-foreground italic'
      )}
    >
      {display}
    </button>
  );
}

function InlineEditField({
  label,
  value,
  placeholder,
  mono,
  onSave,
}: {
  label: string;
  value: string | undefined;
  placeholder?: string;
  mono?: boolean;
  onSave: (value: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function startEdit() {
    setDraft(value ?? '');
    setEditing(true);
  }
  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '')) {
      onSave(trimmed === '' ? undefined : trimmed);
    }
    setEditing(false);
  }
  function cancel() {
    setDraft(value ?? '');
    setEditing(false);
  }

  return (
    <div>
      <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          placeholder={placeholder}
          className={cn(
            'mt-0.5 w-full border-b border-primary bg-transparent text-sm font-medium outline-none',
            mono && 'font-mono'
          )}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className={cn(
            'hover:bg-muted/40 -mx-1 mt-0.5 block w-[calc(100%+0.5rem)] rounded px-1 text-left text-sm font-medium',
            mono && 'font-mono',
            !value && 'text-muted-foreground/60 italic'
          )}
        >
          {value || (placeholder ? `+ ${placeholder}` : '—')}
        </button>
      )}
    </div>
  );
}

// (ServiceToggles is now imported from ~/components/service-toggles)

// ---------------------------------------------------------------------------
// Services configuration card
// ---------------------------------------------------------------------------

const ORDER_TYPE_HINTS: Record<string, string> = {
  mudlogging: 'On-site, billed daily',
  geosteering: 'Remote · separate subsidiary / tax ID',
  wellbore_placement: 'Bundle: mudlogging + remote support',
};

function ServicesCard({ job }: { job: Job }) {
  const bid = useStore((s) => s.getBid(job.bidId));
  const catalog = useStore((s) => s.serviceCatalog);
  const startService = useStore((s) => s.startService);
  const endService = useStore((s) => s.endService);
  const countCodeDays = useStore((s) => s.countCodeDays);

  const today = todayIso();
  const isCompleted = job.status === 'completed';
  const isReadOnly = isCompleted || job.status === 'cancelled';

  // Codes from the bid (the menu of "what's available")
  const codesInBid = useMemo(() => {
    if (!bid) return new Set<DailyCode>();
    const out = new Set<DailyCode>();
    bid.services.forEach((li) => {
      const c = catalog.find((x) => x.id === li.catalogItemId);
      if (c?.dailyCode) out.add(c.dailyCode);
    });
    return out;
  }, [bid, catalog]);

  // Currently running on this job (open serviceRuns, not in pause today)
  const currentlyRunning = useMemo(() => {
    const out = new Set<DailyCode>();
    for (const r of job.serviceRuns) {
      if (r.endDate && r.endDate < today) continue;
      out.add(r.code);
    }
    return out;
  }, [job.serviceRuns, today]);

  // Bid services that aren't billed daily — per-event, per-mile, per-well,
  // per-sample. These are the "Logistics & one-time" charges shown beneath
  // the daily services/surcharges blocks.
  const logisticsItems = useMemo(() => {
    if (!bid) return [];
    return bid.services
      .map((li) => ({
        li,
        catalog: catalog.find((c) => c.id === li.catalogItemId),
      }))
      .filter(
        (x) =>
          x.catalog &&
          x.catalog.billingUnit !== 'per_day' &&
          x.catalog.billingUnit !== 'per_other'
      );
  }, [bid, catalog]);

  const services = DAILY_CODE_META.filter((m) => m.kind === 'service');
  const modifiers = DAILY_CODE_META.filter((m) => m.kind === 'modifier');

  const handleAddService = (code: DailyCode) => {
    if (isReadOnly) return;
    startService(job.id, code, today);
  };

  const handleEndService = (code: DailyCode) => {
    if (isReadOnly) return;
    endService(job.id, code, today);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Services</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {isCompleted
                ? 'Service configuration at the time the job ran.'
                : 'What this job is running. Services start a daily billable run; modifiers add a daily surcharge.'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="gap-1.5">
              <CircleDot className="size-3" />
              {ORDER_TYPE_LABELS[job.orderType]}
            </Badge>
            <span className="text-muted-foreground text-[10px]">
              {ORDER_TYPE_HINTS[job.orderType]}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Daily services + modifiers, side-by-side */}
        <div className="grid gap-4 md:grid-cols-2">
          <ServiceGroup
            title="Daily Services"
            icon={<Wrench className="size-3.5" />}
            description="Each service starts a billable daily run."
            codes={services.map((s) => s.code)}
            codesInBid={codesInBid}
            currentlyRunning={currentlyRunning}
            job={job}
            countCodeDays={countCodeDays}
            isReadOnly={isReadOnly}
            isModifier={false}
            onAdd={handleAddService}
            onEnd={handleEndService}
          />
          <ServiceGroup
            title="Surcharges"
            icon={<AlertCircle className="size-3.5" />}
            description="Day-by-day billing modifiers — OBM (per logger), overtime, hold, standby."
            codes={modifiers.map((s) => s.code)}
            codesInBid={codesInBid}
            currentlyRunning={currentlyRunning}
            job={job}
            countCodeDays={countCodeDays}
            isReadOnly={isReadOnly}
            isModifier
            onAdd={handleAddService}
            onEnd={handleEndService}
          />
        </div>

        {/* Logistics & one-time charges */}
        {logisticsItems.length > 0 ? (
          <div>
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <Truck className="size-3.5" />
              Logistics & One-Time Charges
              <span className="text-muted-foreground/60 font-normal normal-case">
                · from bid v{bid?.version}
              </span>
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {logisticsItems.map(({ li, catalog: cat }) => (
                    <tr key={li.id} className="border-b last:border-0">
                      <td className="px-3 py-1.5">
                        <div className="truncate text-foreground">{cat?.name}</div>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {cat ? BILLING_UNIT_LABELS[cat.billingUnit] : '—'}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-3 py-1.5 text-right text-xs tabular-nums">
                        $
                        {li.rate.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              One-time and per-event charges are added when the field ticket is generated.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ServiceGroup({
  title,
  icon,
  description,
  codes,
  codesInBid,
  currentlyRunning,
  job,
  countCodeDays,
  isReadOnly,
  isModifier,
  onAdd,
  onEnd,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  codes: DailyCode[];
  codesInBid: Set<DailyCode>;
  currentlyRunning: Set<DailyCode>;
  job: Job;
  countCodeDays: (jobId: string, code: DailyCode, start: string, end: string) => number;
  isReadOnly: boolean;
  isModifier: boolean;
  onAdd: (code: DailyCode) => void;
  onEnd: (code: DailyCode) => void;
}) {
  const today = todayIso();
  const rangeStart = job.startDate ?? today;
  const rangeEnd = job.endDate ?? today;

  // Group: running, ran-and-ended, configured (planned but not yet started),
  // and available-to-add (in the bid but not picked up by this job yet).
  const ranButNotRunning = job.serviceRuns
    .filter((r) => codes.includes(r.code) && !currentlyRunning.has(r.code))
    .map((r) => r.code);
  const running = codes.filter((c) => currentlyRunning.has(c));
  const ended = Array.from(new Set(ranButNotRunning));
  const activeCodeSet = new Set(job.activeCodes);
  const configured = codes.filter(
    (c) => activeCodeSet.has(c) && !currentlyRunning.has(c) && !ended.includes(c)
  );
  const inBidNotConfigured = codes.filter(
    (c) =>
      codesInBid.has(c) &&
      !activeCodeSet.has(c) &&
      !currentlyRunning.has(c) &&
      !ended.includes(c)
  );

  return (
    <div className="rounded-md border">
      <div className="bg-muted/20 border-b px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          {icon}
          {title}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px]">{description}</p>
      </div>
      <div className="divide-y">
        {running.map((code) => {
          const days = countCodeDays(job.id, code, rangeStart, rangeEnd);
          const meta = DAILY_CODE_META.find((m) => m.code === code);
          return (
            <ServiceRow
              key={code}
              code={code}
              label={meta?.label ?? code}
              days={days}
              status="running"
              isModifier={isModifier}
              isReadOnly={isReadOnly}
              onEnd={() => onEnd(code)}
            />
          );
        })}
        {ended.map((code) => {
          const days = countCodeDays(job.id, code, rangeStart, rangeEnd);
          const meta = DAILY_CODE_META.find((m) => m.code === code);
          return (
            <ServiceRow
              key={code}
              code={code}
              label={meta?.label ?? code}
              days={days}
              status="ended"
              isModifier={isModifier}
              isReadOnly={true}
            />
          );
        })}
        {configured.map((code) => {
          const meta = DAILY_CODE_META.find((m) => m.code === code);
          return (
            <ServiceRow
              key={code}
              code={code}
              label={meta?.label ?? code}
              days={0}
              status="configured"
              isModifier={isModifier}
              isReadOnly={isReadOnly}
              onStart={() => onAdd(code)}
            />
          );
        })}
        {running.length === 0 && ended.length === 0 && configured.length === 0 ? (
          <div className="text-muted-foreground px-3 py-3 text-center text-xs">
            None configured.
          </div>
        ) : null}
      </div>
      {!isReadOnly && inBidNotConfigured.length > 0 ? (
        <div className="border-t p-2">
          <AddServicePopover
            available={inBidNotConfigured}
            onAdd={onAdd}
            isModifier={isModifier}
          />
        </div>
      ) : null}
    </div>
  );
}

function ServiceRow({
  code,
  label,
  days,
  status,
  isModifier,
  isReadOnly,
  onEnd,
  onStart,
}: {
  code: DailyCode;
  label: string;
  days: number;
  status: 'running' | 'ended' | 'configured';
  isModifier: boolean;
  isReadOnly: boolean;
  onEnd?: () => void;
  onStart?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span
        className={cn(
          'inline-flex h-5 min-w-[44px] items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
          isModifier
            ? 'bg-warning/15 text-warning-foreground/80'
            : 'bg-primary/10 text-primary'
        )}
      >
        {code === 'GAS_M' ? 'GAS M' : code}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{label}</div>
        <div className="text-muted-foreground text-[11px]">
          {status === 'running' ? (
            <span className="text-success">● {days} day{days === 1 ? '' : 's'} running</span>
          ) : status === 'ended' ? (
            <span>● {days} day{days === 1 ? '' : 's'} (ended)</span>
          ) : (
            <span className="italic">Configured · not started yet</span>
          )}
        </div>
      </div>
      {!isReadOnly && status === 'running' && onEnd ? (
        <Button variant="ghost" size="xs" onClick={onEnd} className="shrink-0">
          <Square />
          End
        </Button>
      ) : null}
      {!isReadOnly && status === 'configured' && onStart ? (
        <Button variant="ghost" size="xs" onClick={onStart} className="shrink-0">
          Start
        </Button>
      ) : null}
    </div>
  );
}

function AddServicePopover({
  available,
  onAdd,
  isModifier,
}: {
  available: DailyCode[];
  onAdd: (code: DailyCode) => void;
  isModifier: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Plus />
            {isModifier ? 'Add surcharge' : 'Add service'}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={isModifier ? 'Search surcharges...' : 'Search services...'} className="h-9" />
          <CommandList>
            <CommandEmpty>{isModifier ? 'No surcharges in this bid.' : 'No services in this bid.'}</CommandEmpty>
            <CommandGroup
              heading={
                <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                  {isModifier ? 'Daily surcharges' : 'Daily billable services'}
                </span>
              }
            >
              {available.map((code) => {
                const meta = DAILY_CODE_META.find((m) => m.code === code);
                return (
                  <CommandItem
                    key={code}
                    onSelect={() => {
                      onAdd(code);
                      setOpen(false);
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-[44px] items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
                        isModifier
                          ? 'bg-warning/15 text-warning-foreground/80'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      {code === 'GAS_M' ? 'GAS M' : code}
                    </span>
                    <span className="flex-1 truncate text-sm">{meta?.label ?? code}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
