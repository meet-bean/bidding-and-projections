import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';
import { Receipt, Search } from 'lucide-react';
import { useStore } from '~/lib/store';
import { formatDateRange } from '~/lib/format';
import type { Invoice, Job, InvoiceStatus } from '~/lib/types';
import { resolveInvoiceContext } from '~/lib/display-names';
import { InvoiceStatusBadge } from '~/components/status-badges';
import { GenerateInvoiceDialog } from '~/components/generate-invoice-dialog';

type StatusFilter = 'all' | InvoiceStatus;

export const Route = createFileRoute('/_dashboard/invoices/')({
  component: InvoicesPage,
});

function InvoicesPage() {
  const navigate = useNavigate();
  const invoices = useStore((s) => s.invoices);
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const tenantId = useStore((s) => s.tenantId);
  const projectionProjects = useStore((s) => s.projectionProjects);
  const generateFromForecast = useStore((s) => s.generateInvoiceFromForecast);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [generateJob, setGenerateJob] = useState<Job | null>(null);
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  const selectedProject = projectionProjects.find((p) => p.id === selectedProjectId);
  const submittedVersions = selectedProject?.versions.filter((v) => v.saved) ?? [];

  // Filter invoices by status pill + free-text search. Name resolution goes
  // through resolveInvoiceContext — invoices can bill a Stratagraph job OR a
  // Superior projection project.
  const filteredInvoices = useMemo(() => {
    let pool = invoices;
    if (statusFilter !== 'all') pool = pool.filter((t) => t.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      pool = pool.filter((t) => {
        const ctx = resolveInvoiceContext(t, jobs, customers, projectionProjects);
        return (
          t.invoiceNumber.toLowerCase().includes(q) ||
          (ctx?.title.toLowerCase().includes(q) ?? false) ||
          (ctx?.customerName.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return pool;
  }, [invoices, statusFilter, search, jobs, customers, projectionProjects]);

  const groups = useMemo(() => {
    const byJob = new Map<string, Invoice[]>();
    for (const t of filteredInvoices) {
      const list = byJob.get(t.projectId) ?? [];
      list.push(t);
      byJob.set(t.projectId, list);
    }
    return Array.from(byJob.entries())
      .map(([jobId, jobInvoices]) => {
        const sorted = [...jobInvoices].sort((a, b) => b.rangeEnd.localeCompare(a.rangeEnd));
        const ctx = sorted[0]
          ? resolveInvoiceContext(sorted[0], jobs, customers, projectionProjects)
          : null;
        const total = sorted.reduce((s, t) => s + t.totalUsd, 0);
        return { jobId, ctx, invoices: sorted, total };
      })
      .sort((a, b) => {
        const latestA = a.invoices[0]?.rangeEnd ?? '';
        const latestB = b.invoices[0]?.rangeEnd ?? '';
        return latestB.localeCompare(latestA);
      });
  }, [filteredInvoices, jobs, customers, projectionProjects]);

  const counts = useMemo(() => {
    const c = { all: invoices.length, draft: 0, sent: 0, paid: 0 } as Record<StatusFilter, number>;
    for (const t of invoices) c[t.status] += 1;
    return c;
  }, [invoices]);

  // Active jobs available for invoice generation (anything with a start date that's not cancelled).
  const billableJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status === 'active' || j.status === 'completed')
        .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
    [jobs]
  );

  function handlePickJob(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setGenerateJob(job);
    setJobPickerOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — status filter pills (left), search + primary action (right).
       * Matches the inline-CTA pattern used by DataListShell on the other index
       * pages: nav already tells you where you are, no h1 needed. */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusPills value={statusFilter} onChange={setStatusFilter} counts={counts} />
        <div className="ml-auto flex items-center gap-2">
          <div className="relative min-w-[260px]">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, customer, project…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          {tenantId === 'superior' ? (
            <Button onClick={() => setForecastDialogOpen(true)}>
              <Receipt className="mr-1.5 size-3.5" />
              Generate Invoice
            </Button>
          ) : (
            <Button onClick={() => setJobPickerOpen(true)}>
              <Receipt />
              Generate Invoice
            </Button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center">
          <div className="text-foreground text-sm font-medium">No invoices in this view.</div>
          <div className="text-muted-foreground mt-1 text-xs">
            Generate an invoice from a job to bill the customer.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <JobGroup
              key={g.jobId}
              jobId={g.jobId}
              isJob={Boolean(g.ctx?.job)}
              title={g.ctx?.title ?? '—'}
              jobNumber={g.ctx?.jobNumber ?? '—'}
              customerName={g.ctx?.customerName ?? '—'}
              customerId={g.ctx?.customerId}
              invoices={g.invoices}
              total={g.total}
              onInvoiceClick={(id) =>
                navigate({ to: '/invoices/$invoiceId', params: { invoiceId: id } })
              }
            />
          ))}
        </div>
      )}

      {/* Pick a job for the generate flow */}
      <Dialog open={jobPickerOpen} onOpenChange={setJobPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate an invoice</DialogTitle>
            <DialogDescription>
              Pick the job to bill from. Active and completed jobs are listed.
            </DialogDescription>
          </DialogHeader>
          <Select onValueChange={handlePickJob}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a job…" />
            </SelectTrigger>
            <SelectContent>
              {billableJobs.map((j) => {
                const c = customers.find((x) => x.id === j.customerId);
                return (
                  <SelectItem key={j.id} value={j.id}>
                    {c?.name ?? '—'} · {j.jobNumber} · {j.wellName.slice(0, 30)}
                    {j.wellName.length > 30 ? '…' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJobPickerOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {generateJob ? (
        <GenerateInvoiceDialog
          open={!!generateJob}
          onOpenChange={(open) => {
            if (!open) setGenerateJob(null);
          }}
          job={generateJob}
        />
      ) : null}

      <Dialog open={forecastDialogOpen} onOpenChange={setForecastDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice from Forecast</DialogTitle>
            <DialogDescription>
              Select a project and a submitted forecast version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                value={selectedProjectId}
                onValueChange={(v) => {
                  setSelectedProjectId(v);
                  setSelectedVersionId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project...">
                    {selectedProject?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projectionProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Submitted Forecast</label>
                <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version...">
                      {submittedVersions.find((v) => v.id === selectedVersionId)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {submittedVersions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {submittedVersions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No submitted forecasts. Submit a forecast first.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForecastDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedVersionId}
              onClick={() => {
                generateFromForecast(selectedProjectId, selectedVersionId);
                setForecastDialogOpen(false);
                setSelectedProjectId('');
                setSelectedVersionId('');
              }}
            >
              Generate Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobGroup({
  jobId,
  isJob,
  title,
  jobNumber,
  customerName,
  customerId,
  invoices,
  total,
  onInvoiceClick,
}: {
  jobId: string;
  isJob: boolean;
  title: string;
  jobNumber: string;
  customerName: string;
  customerId?: string;
  invoices: Invoice[];
  total: number;
  onInvoiceClick: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      {/* Header — customer dominant, well + job# as quiet metadata below,
       * group total mirrors the customer's weight on the right. Row amounts
       * stay regular weight so this number reads as the summary. */}
      <div className="bg-muted/20 flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          {customerId ? (
            <Link
              to="/customers/$customerId"
              params={{ customerId }}
              className="text-foreground hover:text-primary block truncate text-base font-semibold tracking-tight underline-offset-4 hover:underline"
            >
              {customerName}
            </Link>
          ) : (
            <span className="text-foreground block truncate text-base font-semibold tracking-tight">
              {customerName}
            </span>
          )}
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-xs">
            {isJob ? (
              <Link
                to="/jobs/$jobId"
                params={{ jobId }}
                className="hover:text-foreground truncate underline-offset-4 hover:underline"
              >
                {title}
              </Link>
            ) : (
              <Link
                to="/projections/$projectId"
                params={{ projectId: jobId }}
                className="hover:text-foreground truncate underline-offset-4 hover:underline"
              >
                {title}
              </Link>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono">{jobNumber}</span>
          </div>
        </div>
        <div className="text-foreground shrink-0 text-base font-semibold tabular-nums tracking-tight">
          ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-background border-b">
          <tr className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            <th className="w-[140px] px-4 py-2 text-left">Invoice #</th>
            <th className="px-3 py-2 text-left">Date Range</th>
            <th className="w-[110px] px-3 py-2 text-left">Status</th>
            <th className="w-[120px] px-4 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((t) => (
            <tr
              key={t.id}
              onClick={() => onInvoiceClick(t.id)}
              className={cn(
                'hover:bg-muted/40 cursor-pointer border-b last:border-b-0 transition-colors'
              )}
            >
              <td className="px-4 py-2.5 font-mono text-xs">{t.invoiceNumber}</td>
              <td className="text-muted-foreground px-3 py-2.5 text-xs tabular-nums">
                {formatDateRange(t.rangeStart, t.rangeEnd)}
              </td>
              <td className="px-3 py-2.5">
                <InvoiceStatusBadge status={t.status} className="text-[10px]" />
              </td>
              <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                $
                {t.totalUsd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const PILLS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];

function StatusPills({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <div className="bg-muted/40 inline-flex rounded-md p-0.5">
      {PILLS.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-all',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] tabular-nums',
                active ? 'bg-muted text-muted-foreground' : 'bg-muted/60 text-muted-foreground/70'
              )}
            >
              {counts[p.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
