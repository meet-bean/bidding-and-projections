import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  PageHeader,
  PageHeaderTitle,
  PageHeaderActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@repo/ui';
import {
  ArrowLeft,
  Mail,
  MapPin,
  FileText,
  Pencil,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '~/lib/store';
import { formatDateShort } from '~/lib/format';
import { selectServiceCatalog } from '~/data/service-seed';
import { InvoiceStatusBadge, JobStatusBadge } from '~/components/status-badges';
import { CustomerDialog } from '~/components/entity-dialogs/customer-dialog';
import { WellDialog } from '~/components/entity-dialogs/well-dialog';
import { WELL_STATUS_LABELS, type DailyCode, type Job, type Well } from '~/lib/types';

export const Route = createFileRoute('/_dashboard/customers/$customerId')({
  component: CustomerDetail,
});

const METHOD_LABEL = {
  email: 'Email',
  mail: 'Mail',
  portal: 'Portal',
  ariba: 'Ariba',
  open_invoice: 'Open Invoice',
} as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.max(0, Math.round((db - da) / 86_400_000));
}

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();

  const customer = useStore((s) => s.getCustomer(customerId));
  const allWells = useStore((s) => s.wells);
  const wells = useMemo(
    () => allWells.filter((w) => w.customerId === customerId),
    [allWells, customerId]
  );
  const allJobs = useStore((s) => s.jobs);
  const allBids = useStore((s) => s.bids);
  const allTickets = useStore((s) => s.invoices);
  const catalog = useStore((s) => selectServiceCatalog(s.services));
  const countCodeDays = useStore((s) => s.countCodeDays);

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [wellDialogOpen, setWellDialogOpen] = useState(false);
  const [editingWell, setEditingWell] = useState<Well | undefined>(undefined);
  const openCreateWell = () => {
    setEditingWell(undefined);
    setWellDialogOpen(true);
  };
  const openEditWell = (well: Well) => {
    setEditingWell(well);
    setWellDialogOpen(true);
  };

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/customers' })}>
          <ArrowLeft />
          Back to Customers
        </Button>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            Customer not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = todayIso();
  const customerJobs = allJobs.filter((j) => j.customerId === customerId);
  const activeJobs = customerJobs.filter(
    (j) => j.status === 'active' || j.status === 'scheduled'
  );
  const completedJobs = customerJobs.filter((j) => j.status === 'completed');
  const customerBids = allBids.filter((b) => b.customerId === customerId);
  const activeBid = customerBids.find((b) => b.isActive);
  const customerTickets = allTickets.filter((t) => {
    const j = allJobs.find((x) => x.id === t.projectId);
    return j?.customerId === customerId;
  });

  // Financial roll-ups
  const lifetimeRevenue = customerTickets.reduce((s, t) => s + t.totalUsd, 0);
  // "Open balance" = tickets that have been sent but not yet paid.
  const openBalanceTickets = customerTickets.filter((t) => t.status === 'sent');
  const openBalance = openBalanceTickets.reduce((s, t) => s + t.totalUsd, 0);
  const oldestOpen =
    openBalanceTickets.length > 0
      ? openBalanceTickets.reduce((min, t) =>
          (t.signedDate ?? t.generatedDate) < (min.signedDate ?? min.generatedDate) ? t : min
        )
      : null;
  const oldestOpenAge = oldestOpen
    ? daysBetween(oldestOpen.signedDate ?? oldestOpen.generatedDate, today)
    : 0;

  // Live projection across active jobs (daily-service portion only)
  const accruedAcrossActiveJobs = activeJobs.reduce((sum, j) => {
    if (!j.startDate || j.serviceRuns.length === 0) return sum;
    const bid = allBids.find((b) => b.id === j.bidId);
    if (!bid) return sum;
    const codes = new Set<DailyCode>([...j.activeCodes, ...j.serviceRuns.map((r) => r.code)]);
    let jobSum = 0;
    for (const code of codes) {
      const days = countCodeDays(j.id, code, j.startDate, j.endDate ?? today);
      const li = bid.services.find((l) => {
        const c = catalog.find((x) => x.id === l.catalogItemId);
        return c?.dailyCode === code;
      });
      if (li) jobSum += days * li.rate;
    }
    return sum + jobSum;
  }, 0);

  const docsReady = customer.msaOnFile && customer.w9OnFile;

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="space-y-1">
          <PageHeaderTitle>{customer.name}</PageHeaderTitle>
          <p className="text-muted-foreground text-sm">
            {customer.contactName} · {customer.city}, {customer.state}
          </p>
        </div>
        <PageHeaderActions>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setCustomerDialogOpen(true)}>
            <Pencil />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link to="/bids/new" search={{ customerId: customer.id }}>
              <FileText />
              New Bid
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/jobs/new" search={{ customerId: customer.id }}>
              <Plus />
              New Job
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* Snapshot KPIs — plain header stats line (house style, no tiles) */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        <SnapshotCard
          label="Open Balance"
          value={`$${openBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          hint={
            openBalanceTickets.length === 0
              ? 'Nothing outstanding'
              : `${openBalanceTickets.length} ticket${openBalanceTickets.length === 1 ? '' : 's'} · oldest ${oldestOpenAge}d`
          }
          tone={openBalance > 0 ? 'text-strat-coral' : 'text-muted-foreground'}
        />
        <SnapshotCard
          label="Active Jobs"
          value={String(activeJobs.length)}
          hint={
            activeJobs.length === 0
              ? 'No work in progress'
              : `$${accruedAcrossActiveJobs.toLocaleString('en-US', { maximumFractionDigits: 0 })} accrued to date`
          }
        />
        <SnapshotCard
          label="Lifetime Revenue"
          value={`$${lifetimeRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          hint={`${customerTickets.length} ticket${customerTickets.length === 1 ? '' : 's'} all-time`}
        />
        <SnapshotCard
          label="Docs"
          value={docsReady ? 'Ready' : 'Gaps'}
          hint={
            <span className="flex items-center gap-1">
              {docsReady ? (
                <CheckCircle2 className="text-success size-3" />
              ) : (
                <AlertCircle className="text-strat-coral size-3" />
              )}
              {docsReady
                ? 'MSA + W-9 on file'
                : `${!customer.msaOnFile ? 'MSA missing' : ''}${!customer.msaOnFile && !customer.w9OnFile ? ' · ' : ''}${!customer.w9OnFile ? 'W-9 missing' : ''}`}
            </span>
          }
          tone={docsReady ? 'text-success' : 'text-strat-coral'}
        />
      </div>

      {/* Wells / Active Jobs / Bids / Completed / Tickets / Billing — all plain
       * sections separated by hairline dividers. No card-in-card stacking. */}
      <div className="divide-y divide-border/60">
        {/* Wells */}
        <section className="space-y-3 pb-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              Projects
              <span className="text-muted-foreground text-xs font-normal">({wells.length})</span>
            </h2>
            <Button size="sm" variant="outline" onClick={openCreateWell}>
              <Plus />
              Add Project
            </Button>
          </div>
          {wells.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
              No projects on file.{' '}
              <button
                type="button"
                onClick={openCreateWell}
                className="text-primary underline-offset-4 hover:underline"
              >
                Add the first one →
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>County / State</TableHead>
                    <TableHead>API #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wells.map((w) => (
                    <TableRow
                      key={w.id}
                      onClick={() => openEditWell(w)}
                      className="hover:bg-muted/30 cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        {w.name}
                        {w.pad ? (
                          <span className="text-muted-foreground ml-2 text-xs">· Pad {w.pad}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {w.county ? `${w.county}, ${w.state ?? ''}` : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{w.apiNumber ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {WELL_STATUS_LABELS[w.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <WellDialog
          open={wellDialogOpen}
          onOpenChange={setWellDialogOpen}
          customerId={customerId}
          well={editingWell}
        />
        <CustomerDialog
          open={customerDialogOpen}
          onOpenChange={setCustomerDialogOpen}
          customer={customer}
        />

        {/* Active Jobs */}
        <section className="space-y-3 py-8">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            Active Jobs
            <span className="text-muted-foreground text-xs font-normal">
              ({activeJobs.length})
            </span>
          </h2>
          {activeJobs.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
              No active or scheduled jobs.{' '}
              <Link
                to="/jobs/new"
                search={{ customerId: customer.id }}
                className="text-primary underline-offset-4 hover:underline"
              >
                Start one →
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {activeJobs.map((j) => (
                <ActiveJobCard
                  key={j.id}
                  job={j}
                  rateLookup={(code) => {
                    const bid = allBids.find((b) => b.id === j.bidId);
                    if (!bid) return 0;
                    const li = bid.services.find((l) => {
                      const c = catalog.find((x) => x.id === l.catalogItemId);
                      return c?.dailyCode === code;
                    });
                    return li?.rate ?? 0;
                  }}
                  countCodeDays={countCodeDays}
                  today={today}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bids */}
        <section className="space-y-3 py-8">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            Bids
            <span className="text-muted-foreground text-xs font-normal">
              ({customerBids.length})
            </span>
          </h2>
          {customerBids.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
              No bids on file.{' '}
              <Link
                to="/bids/new"
                search={{ customerId: customer.id } as never}
                className="text-primary underline-offset-4 hover:underline"
              >
                Create the first bid →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeBid ? (
                <Link
                  to="/bids/$bidId"
                  params={{ bidId: activeBid.id }}
                  className="hover:bg-muted/30 flex items-center justify-between rounded-md border p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      v{activeBid.version}
                    </Badge>
                    <Badge className="bg-strat-green text-white">Active</Badge>
                    <span className="text-muted-foreground text-sm">
                      Created {activeBid.createdDate} · {activeBid.services.length} services
                    </span>
                  </div>
                </Link>
              ) : null}
              {customerBids
                .filter((b) => !b.isActive)
                .map((b) => (
                  <Link
                    key={b.id}
                    to="/bids/$bidId"
                    params={{ bidId: b.id }}
                    className="hover:bg-muted/30 text-muted-foreground flex items-center justify-between rounded-md border p-2 text-sm transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        v{b.version}
                      </Badge>
                      <span>Archived · {b.createdDate}</span>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </section>

        {/* Completed Jobs */}
        {completedJobs.length > 0 ? (
          <section className="space-y-3 py-8">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              Completed Jobs
              <span className="text-muted-foreground text-xs font-normal">
                ({completedJobs.length})
              </span>
            </h2>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedJobs.map((j) => (
                    <TableRow
                      key={j.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate({ to: '/jobs/$jobId', params: { jobId: j.id } })}
                    >
                      <TableCell className="font-mono text-sm">{j.jobNumber}</TableCell>
                      <TableCell>{j.wellName}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {j.startDate ? formatDateShort(j.startDate) : '—'}
                        {j.endDate ? ` → ${formatDateShort(j.endDate)}` : null}
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={j.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ) : null}

        {/* Field Tickets */}
        {customerTickets.length > 0 ? (
          <section className="space-y-3 py-8">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              Field Tickets
              <span className="text-muted-foreground text-xs font-normal">
                ({customerTickets.length})
              </span>
            </h2>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerTickets.map((t) => (
                    <TableRow
                      key={t.id}
                      onClick={() => navigate({ to: '/invoices/$invoiceId', params: { invoiceId: t.id } })}
                      className="hover:bg-muted/30 cursor-pointer"
                    >
                      <TableCell className="font-mono text-sm">{t.invoiceNumber}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {t.rangeStart} → {t.rangeEnd}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        $
                        {t.totalUsd.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ) : null}

        {/* Billing meta — compact 2-up grid, no card boundaries */}
        <section className="grid gap-6 pt-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Billing Address
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <div>{customer.billingAddress}</div>
                  <div className="text-muted-foreground">
                    {customer.city}, {customer.state} {customer.zip}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <div>{customer.contactName}</div>
                  {customer.contactTitle ? (
                    <div className="text-muted-foreground text-xs">{customer.contactTitle}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Billing Setup
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <RowItem
                label="Invoice"
                value={<Badge variant="outline">{METHOD_LABEL[customer.invoiceMethod]}</Badge>}
              />
              <RowItem
                label="MSA"
                value={
                  customer.msaOnFile ? (
                    <Badge className="bg-strat-green text-white">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )
                }
              />
              <RowItem
                label="W-9"
                value={
                  customer.w9OnFile ? (
                    <Badge className="bg-strat-green text-white">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )
                }
              />
              <RowItem
                label="ACH"
                value={
                  customer.achEnabled ? (
                    <Badge className="bg-strat-green text-white">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SnapshotCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: string;
}) {
  // Inline header stat (house style): muted label, weighted value, quiet hint.
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium tabular-nums text-foreground', tone)}>{value}</span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </span>
  );
}

function ActiveJobCard({
  job,
  rateLookup,
  countCodeDays,
  today,
}: {
  job: Job;
  rateLookup: (code: DailyCode) => number;
  countCodeDays: (jobId: string, code: DailyCode, start: string, end: string) => number;
  today: string;
}) {
  const navigate = useNavigate();
  const rig = useStore((s) => (job.rigId ? s.getRig(job.rigId) : undefined));
  const rigName = rig?.name ?? null;
  const codes = new Set<DailyCode>([...job.activeCodes, ...job.serviceRuns.map((r) => r.code)]);
  let accrued = 0;
  let totalDays = 0;
  if (job.startDate) {
    for (const code of codes) {
      const days = countCodeDays(job.id, code, job.startDate, job.endDate ?? today);
      accrued += days * rateLookup(code);
      totalDays += days;
    }
  }
  const hasStarted = !!job.startDate && job.startDate <= today;
  const daysSinceStart = job.startDate ? daysBetween(job.startDate, today) : 0;

  return (
    <Card
      onClick={() => navigate({ to: '/jobs/$jobId', params: { jobId: job.id } })}
      className="hover:bg-muted/30 hover:border-primary/40 cursor-pointer transition-colors"
    >
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{job.wellName}</div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              <span className="font-mono">{job.jobNumber}</span>
              {rigName ? <> · {rigName}</> : null}
              {job.county ? <> · {job.county}, {job.state}</> : null}
            </div>
          </div>
          <JobStatusBadge status={job.status} />
        </div>

        <div className="grid grid-cols-3 gap-3 border-t pt-3">
          <div>
            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              {hasStarted ? 'Days In' : 'Starts'}
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums">
              {hasStarted
                ? `${daysSinceStart}d`
                : job.startDate
                  ? formatDateShort(job.startDate)
                  : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Service-Days
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums">
              {totalDays > 0 ? totalDays : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Accrued
            </div>
            <div className="text-success mt-0.5 text-sm font-semibold tabular-nums">
              {accrued > 0
                ? `$${accrued.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : '—'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RowItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      <span>{value}</span>
    </div>
  );
}
