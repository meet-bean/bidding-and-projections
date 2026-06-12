import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge, Button, cn } from '@repo/ui';
import { Plus, MapPin } from 'lucide-react';
import { useStore, REGION_LABELS, JOB_STATUS_LABELS } from '~/lib/store';
import type { JobStatus, Region } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { JobStatusBadge } from '~/components/status-badges';

export const Route = createFileRoute('/_dashboard/jobs/')({
  component: JobsPage,
});

interface JobRow {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  wellName: string;
  region: Region;
  regionLabel: string;
  unitCode: string;
  status: JobStatus;
  startDate: string;
  daysIn: number;
  serviceDays: number;
  runningCodes: string;
  runningCount: number;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.max(0, Math.round((db - da) / 86_400_000));
}

function JobsPage() {
  const navigate = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const units = useStore((s) => s.units);
  const codesRunningOn = useStore((s) => s.codesRunningOn);

  const today = new Date().toISOString().slice(0, 10);

  // Status priority for default sort: active first, scheduled next, speculative,
  // then completed at the bottom, cancelled last.
  const STATUS_ORDER: Record<JobStatus, number> = {
    active: 0,
    scheduled: 1,
    speculative: 2,
    completed: 3,
    cancelled: 4,
  };

  const rows: JobRow[] = useMemo(() => {
    return jobs
      .map((j) => {
        const running = codesRunningOn(j.id, today);
        const runningArr = Array.from(running).sort();
        // Days-in (active) or days-from-now (scheduled-future) or run length (completed)
        const daysIn = j.startDate
          ? j.status === 'completed' && j.endDate
            ? daysBetween(j.startDate, j.endDate) + 1
            : daysBetween(j.startDate, today) + 1
          : 0;
        // Total service-day count from runs (running days × codes that ran)
        const serviceDays = j.serviceRuns.reduce((sum, r) => {
          const endIso = r.endDate ?? today;
          return sum + daysBetween(r.startDate, endIso) + 1;
        }, 0);
        return {
          id: j.id,
          jobNumber: j.jobNumber,
          customerId: j.customerId,
          customerName: customers.find((c) => c.id === j.customerId)?.name ?? '—',
          wellName: j.wellName,
          region: j.region,
          regionLabel: REGION_LABELS[j.region],
          unitCode: units.find((u) => u.id === j.unitId)?.code ?? '',
          status: j.status,
          startDate: j.startDate ?? '',
          daysIn,
          serviceDays,
          runningCodes: runningArr.join(','),
          runningCount: runningArr.length,
        };
      })
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        // Within the same status: most recent start first (empty start sorts last).
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return b.startDate.localeCompare(a.startDate);
      });
  }, [jobs, customers, units, codesRunningOn, today]);

  const columnHelper = createColumnHelper<JobRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('jobNumber', {
        id: 'jobNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Job #" />,
        cell: (info) => (
          <span className="text-primary font-mono text-sm font-medium">{info.getValue()}</span>
        ),
        size: 110,
      }),
      columnHelper.accessor('customerName', {
        id: 'customerName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Customer" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to="/customers/$customerId"
              params={{ customerId: row.customerId }}
              className="hover:text-primary font-medium underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.customerName}
            </Link>
          );
        },
      }),
      columnHelper.accessor('wellName', {
        id: 'wellName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: (info) => (
          <span className="text-foreground text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('region', {
        id: 'region',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="size-3" />
              {row.regionLabel}
            </div>
          );
        },
        size: 140,
      }),
      columnHelper.accessor('unitCode', {
        id: 'unitCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Unit" />,
        cell: (info) =>
          info.getValue() ? (
            <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        size: 80,
      }),
      columnHelper.accessor('startDate', {
        id: 'startDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
        cell: (info) => {
          const row = info.row.original;
          if (!row.startDate) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <span className="text-foreground text-sm tabular-nums">{row.startDate}</span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor('serviceDays', {
        id: 'serviceDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Service Days" />,
        cell: (info) => {
          const row = info.row.original;
          if (row.status === 'speculative' || row.status === 'cancelled' || row.serviceDays === 0) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          // Visual diff: in-progress jobs get a green pulse dot (still counting),
          // completed jobs get a slate dot (final).
          const isFinal = row.status === 'completed';
          return (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-block size-1.5 shrink-0 rounded-full',
                  isFinal ? 'bg-strat-slate' : 'bg-strat-green animate-pulse'
                )}
                aria-hidden
              />
              <span className="text-sm font-medium tabular-nums">{row.serviceDays}</span>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider',
                  isFinal ? 'text-muted-foreground' : 'text-strat-green'
                )}
              >
                {isFinal ? 'final' : 'running'}
              </span>
            </div>
          );
        },
        size: 140,
      }),
      columnHelper.accessor('runningCodes', {
        id: 'runningCodes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Running Today" />,
        cell: (info) => {
          const row = info.row.original;
          if (row.runningCount === 0) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          const codes = row.runningCodes.split(',');
          return (
            <div className="flex flex-wrap gap-1">
              {codes.slice(0, 4).map((code) => (
                <span
                  key={code}
                  className="bg-primary/10 text-primary inline-flex h-5 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold"
                >
                  {code === 'GAS_M' ? 'GAS M' : code}
                </span>
              ))}
              {codes.length > 4 ? (
                <span className="text-muted-foreground inline-flex h-5 items-center justify-center rounded-sm px-1 text-[10px]">
                  +{codes.length - 4}
                </span>
              ) : null}
            </div>
          );
        },
        size: 180,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: (info) => <JobStatusBadge status={info.getValue() as JobStatus} />,
        size: 120,
      }),
    ],
    [columnHelper]
  );

  return (
    <div className="space-y-4">
      <DataListShell
        data={rows}
        columns={columns}
        searchPlaceholder="Search by job #, well, customer..."
        countLabel="jobs"
        countSegments={statusSegments(rows)}
        searchableKeys={['jobNumber', 'wellName', 'customerName']}
        filters={[
          {
            id: 'status',
            label: 'Status',
            options: Object.entries(JOB_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            id: 'customerName',
            label: 'Customer',
            options: Array.from(new Set(rows.map((r) => r.customerName)))
              .filter((n) => n !== '—')
              .sort()
              .map((name) => ({ value: name, label: name })),
          },
          {
            id: 'region',
            label: 'Region',
            options: Object.entries(REGION_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            id: 'unitCode',
            label: 'Unit',
            options: Array.from(new Set(rows.map((r) => r.unitCode)))
              .filter((c) => !!c)
              .sort()
              .map((code) => ({ value: code, label: code })),
          },
        ]}
        onRowClick={(row) => navigate({ to: '/jobs/$jobId', params: { jobId: row.id } })}
        emptyMessage="No jobs match your filters."
        actions={
          <Button asChild>
            <Link to="/jobs/new">
              <Plus />
              New Job
            </Link>
          </Button>
        }
      />
    </div>
  );
}

// D4-C: status counts live in the shell's info bar as muted segments — no
// colored pill row. Lifecycle order; zero buckets hidden by the shell.
function statusSegments(rows: JobRow[]) {
  const counts = rows.reduce<Record<JobStatus, number>>(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { active: 0, scheduled: 0, speculative: 0, completed: 0, cancelled: 0 }
  );
  const order: JobStatus[] = ['active', 'scheduled', 'speculative', 'completed', 'cancelled'];
  return order.map((status) => ({
    label: JOB_STATUS_LABELS[status].toLowerCase(),
    value: counts[status],
  }));
}

