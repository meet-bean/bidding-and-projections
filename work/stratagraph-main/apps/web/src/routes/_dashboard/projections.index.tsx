import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge, Button } from '@repo/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '~/lib/store';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';

export const Route = createFileRoute('/_dashboard/projections/')({
  component: ProjectionsIndexPage,
});

interface ProjectionRow {
  id: string;
  jobNumber: string;
  name: string;
  customer: string;
  pm: string;
  versions: number;
  currentVersion: string;
  forecast: number;
  costToDate: number;
  pctSpent: number;
  vsBid: number | null;
  hasDraft: boolean;
}

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function ProjectionsIndexPage() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projectionProjects);
  const removeProject = useStore((s) => s.removeProjectionProject);

  const rows: ProjectionRow[] = useMemo(() => {
    return projects.map((p) => {
      const latestVersion = p.versions[p.versions.length - 1];
      const items = latestVersion?.items ?? [];
      const forecast = items.reduce((sum, i) => sum + i.F.cost, 0);
      const costToDate = items.reduce((sum, i) => sum + i.CTD.cost, 0);
      const pctSpent = forecast > 0 ? (costToDate / forecast) * 100 : 0;
      const origBidCost = p.financials?.originalBid?.cost ?? null;
      const vsBid = origBidCost && origBidCost > 0 ? ((forecast - origBidCost) / origBidCost) * 100 : null;

      return {
        id: p.id,
        jobNumber: p.jobNumber,
        name: p.name,
        customer: p.customer,
        pm: p.pm,
        versions: p.versions.length,
        currentVersion: latestVersion?.label ?? '—',
        forecast,
        costToDate,
        pctSpent,
        vsBid,
        hasDraft: p.draft !== null,
      };
    });
  }, [projects]);

  const columnHelper = createColumnHelper<ProjectionRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('jobNumber', {
        id: 'jobNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Job #" />,
        cell: (info) => (
          <span className="text-primary font-mono text-sm font-medium">{info.getValue()}</span>
        ),
        size: 120,
      }),
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{info.getValue()}</span>
              {row.hasDraft && (
                <Badge variant="warning" appearance="light" size="sm">Draft</Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('customer', {
        id: 'customer',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Customer" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('pm', {
        id: 'pm',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project Manager" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('versions', {
        id: 'versions',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Versions" />,
        cell: (info) => (
          <Badge variant="outline" size="sm" className="font-mono">
            V{String(info.getValue()).padStart(2, '0')}
          </Badge>
        ),
        size: 100,
      }),
      columnHelper.accessor('forecast', {
        id: 'forecast',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Forecast" />,
        cell: (info) => (
          <span className="text-sm font-medium tabular-nums">{fmt$(info.getValue())}</span>
        ),
        size: 150,
      }),
      columnHelper.accessor('costToDate', {
        id: 'costToDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Cost to Date" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm tabular-nums">{fmt$(info.getValue())}</span>
        ),
        size: 150,
      }),
      columnHelper.accessor('pctSpent', {
        id: 'pctSpent',
        header: ({ column }) => <DataGridColumnHeader column={column} title="% Spent" />,
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className={`text-sm font-medium tabular-nums ${v > 95 ? 'text-destructive' : ''}`}>
              {v.toFixed(1)}%
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor('vsBid', {
        id: 'vsBid',
        header: ({ column }) => <DataGridColumnHeader column={column} title="vs Bid" />,
        cell: (info) => {
          const v = info.getValue();
          if (v === null) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <span className={`text-sm font-medium tabular-nums ${v > 0 ? 'text-destructive' : 'text-strat-green'}`}>
              {fmtPct(v)}
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => null,
        cell: (info) => {
          const row = info.row.original;
          return (
            <button
              className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeProject(row.id);
              }}
              title="Delete project"
            >
              <Trash2 className="size-4" />
            </button>
          );
        },
        size: 50,
      }),
    ],
    [columnHelper, removeProject]
  );

  return (
    <DataListShell
      data={rows}
      columns={columns}
      searchPlaceholder="Search by job #, project, customer..."
      searchableKeys={['jobNumber', 'name', 'customer', 'pm']}
      filters={[
        {
          id: 'customer',
          label: 'Customer',
          options: Array.from(new Set(rows.map((r) => r.customer)))
            .sort()
            .map((name) => ({ value: name, label: name })),
        },
        {
          id: 'pm',
          label: 'Project Manager',
          options: Array.from(new Set(rows.map((r) => r.pm)))
            .sort()
            .map((name) => ({ value: name, label: name })),
        },
      ]}
      onRowClick={(row) => navigate({ to: '/projections/$projectId', params: { projectId: row.id } })}
      emptyMessage="No projection projects yet. Upload a Vista cost report to get started."
      actions={
        <Button>
          <Plus />
          New Project
        </Button>
      }
    />
  );
}
