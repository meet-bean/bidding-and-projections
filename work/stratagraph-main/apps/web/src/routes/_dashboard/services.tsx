import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { Pencil, GitBranch, Trash2 } from 'lucide-react';
import { useStore } from '~/lib/store';
import {
  BILLING_UNIT_LABELS,
  CATEGORY_LABELS,
} from '~/data/service-catalog';
import type {
  BillingUnit,
  ServiceCategory,
} from '~/lib/types';
import type { ServiceAlias } from '@repo/projections';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { toCatalogRows, type ServiceCatalogRow } from '~/lib/service-catalog-rows';
import { ctdMetrics, formatMetric } from '~/lib/service-catalog-aggregate';
import { COST_TYPES, COST_TYPE_COLOR } from '~/lib/cost-types';
import { ServiceDetailDialog } from '~/components/service-detail-dialog';
import { ServiceReconcileDialog } from '~/components/service-reconcile-dialog';

export const Route = createFileRoute('/_dashboard/services')({
  component: ServicesPage,
});

const CATEGORY_ORDER: ServiceCategory[] = [
  'logging',
  'xrf_ftir',
  'real_time',
  'cuttings',
  'unmanned_gas',
];

const BILLING_UNIT_ORDER: BillingUnit[] = [
  'per_day',
  'per_event',
  'per_mile',
  'per_well',
  'per_sample',
  'per_other',
];

interface ServiceRow {
  id: string;
  name: string;
  categoryLabel: string;
  code: string;
  unitLabel: string;
  rate: number | null;
  rateNote: string | null;
  aliasCount: number;
  aliases: ServiceAlias[];
  projectCount: number;
  category: ServiceCategory;
  billingUnit: BillingUnit;
  registryItemId: string | null;
}

// ── Superior Construction: line-item catalog ─────────────────────────────────

function SuperiorServices() {
  const items = useStore((s) => s.serviceRegistry.items);
  const catalog = useStore((s) => s.metricsCatalog);
  const clearProjectionData = useStore((s) => s.clearProjectionData);
  const projectionProjects = useStore((s) => s.projectionProjects);
  const [detailRow, setDetailRow] = useState<ServiceCatalogRow | null>(null);
  const [reconcileProjectId, setReconcileProjectId] = useState<string | null>(null);

  const rows = useMemo(() => toCatalogRows(items, catalog), [items, catalog]);

  const uomOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const r of rows) {
      if (!seen.has(r.uom)) {
        seen.add(r.uom);
        opts.push({ value: r.uom, label: r.uom });
      }
    }
    return opts;
  }, [rows]);

  const columnHelper = createColumnHelper<ServiceCatalogRow>();

  const ctdCols = useMemo(() => ctdMetrics(catalog), [catalog]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Phase & line item" />
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {row.phaseCode && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {row.phaseCode}
                </Badge>
              )}
              <span className="text-sm font-medium">{info.getValue()}</span>
              {row.phaseVaries && (
                <span className="text-[10px] italic text-muted-foreground">
                  + varies
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('costType', {
        id: 'costType',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Cost type" />
        ),
        cell: (info) => {
          const value = info.getValue();
          return (
            <span
              className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ background: COST_TYPE_COLOR[value] }}
            >
              {value}
            </span>
          );
        },
        size: 130,
      }),
      columnHelper.accessor('uom', {
        id: 'uom',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="UoM" />
        ),
        cell: (info) => (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {info.getValue()}
          </Badge>
        ),
        size: 90,
      }),
      columnHelper.accessor('projectCount', {
        id: 'projectCount',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Used in" />
        ),
        cell: (info) => {
          const value = info.getValue();
          return (
            <span className="text-sm">
              {value} project{value === 1 ? '' : 's'}
            </span>
          );
        },
        size: 110,
      }),
      ...ctdCols.map((m) =>
        columnHelper.accessor((r) => r.ctd[m.id] ?? 0, {
          id: m.id,
          header: ({ column }) => (
            <DataGridColumnHeader column={column} title={m.name} className="justify-end" />
          ),
          cell: (info) => (
            <div className="text-right tabular-nums text-sm">
              {formatMetric(m, info.getValue())}
            </div>
          ),
          size: 120,
        })
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnHelper, ctdCols]
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const first = projectionProjects[0];
          if (first) setReconcileProjectId(first.id);
        }}
        disabled={projectionProjects.length === 0}
      >
        Import &amp; reconcile
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
        onClick={() => {
          if (
            confirm(
              'Delete all projection data, services, and metrics? This cannot be undone.',
            )
          ) {
            clearProjectionData();
          }
        }}
      >
        <Trash2 className="size-4 mr-1.5" />
        Clear All Data
      </Button>
    </div>
  );

  return (
    <>
      <DataListShell
        data={rows}
        columns={columns}
        searchPlaceholder="Search line items..."
        searchableKeys={['name']}
        filters={[
          {
            id: 'costType',
            label: 'Cost type',
            options: COST_TYPES.map((c) => ({ value: c, label: c })),
          },
          {
            id: 'uom',
            label: 'UoM',
            options: uomOptions,
          },
        ]}
        actions={headerActions}
        emptyMessage="No line items yet. Upload a projection to populate the catalog."
        defaultPageSize={50}
        onRowClick={setDetailRow}
      />
      <ServiceDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
      <ServiceReconcileDialog
        projectId={reconcileProjectId}
        onClose={() => setReconcileProjectId(null)}
      />
    </>
  );
}

// ── Stratagraph: service rate-card ────────────────────────────────────────────

function ServicesPage() {
  const catalog = useStore((s) => s.serviceCatalog);
  const tenantId = useStore((s) => s.tenantId);
  const registry = useStore((s) => s.serviceRegistry);
  const jobs = useStore((s) => s.jobs);
  const editName = useStore((s) => s.editRegistryItemName);
  const separate = useStore((s) => s.separateRegistryAlias);
  const tenant = useStore((s) => s.getTenantConfig());
  const projectLabel = tenant.features.operations ? 'Jobs' : 'Projects';
  const isSuperior = tenantId === 'superior';

  const rows: ServiceRow[] = useMemo(() => {
    const jobCountByService = new Map<string, number>();
    for (const job of jobs) {
      const seen = new Set<string>();
      for (const run of job.serviceRuns) {
        const item = catalog.find((c) => c.dailyCode === run.code);
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          jobCountByService.set(item.id, (jobCountByService.get(item.id) ?? 0) + 1);
        }
      }
    }

    return catalog.map((item) => ({
      id: item.id,
      name: item.name,
      categoryLabel: CATEGORY_LABELS[item.category],
      code: item.dailyCode ?? '',
      unitLabel: BILLING_UNIT_LABELS[item.billingUnit],
      rate: item.defaultRate,
      rateNote: item.rateNote,
      aliasCount: 0,
      aliases: [],
      projectCount: jobCountByService.get(item.id) ?? 0,
      category: item.category,
      billingUnit: item.billingUnit,
      registryItemId: null,
    }));
  }, [catalog, jobs]);

  const columnHelper = createColumnHelper<ServiceRow>();
  const columns = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: any[] = [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Service" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('categoryLabel', {
        id: 'category',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.getValue()}</span>
        ),
        size: 200,
      }),
      columnHelper.accessor('code', {
        id: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        cell: (info) => {
          const code = info.getValue();
          if (!code) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant="outline" className="font-mono text-[10px]">
              {code === 'GAS_M' ? 'GAS M' : code}
            </Badge>
          );
        },
        size: 80,
      }),
      columnHelper.accessor('unitLabel', {
        id: 'unit',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Unit" />,
        cell: (info) => (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {info.getValue()}
          </Badge>
        ),
        size: 110,
      }),
      columnHelper.accessor('rate', {
        id: 'rate',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Rate" className="justify-end" />
        ),
        cell: (info) => {
          const rate = info.getValue();
          const note = info.row.original.rateNote;
          if (rate != null) {
            return (
              <div className="text-right text-sm tabular-nums">
                ${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            );
          }
          return (
            <div className="text-muted-foreground text-right text-xs italic">
              {note ?? '—'}
            </div>
          );
        },
        size: 120,
      }),
    ];

    cols.push(
      columnHelper.accessor('aliasCount', {
        id: 'aliases',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Aliases" />,
        cell: (info) => {
          const count = info.getValue();
          if (!count) return <span className="text-muted-foreground">—</span>;
          return <Badge variant="secondary">{count}</Badge>;
        },
        size: 80,
      }),
      columnHelper.accessor('projectCount', {
        id: 'projects',
        header: ({ column }) => <DataGridColumnHeader column={column} title={projectLabel} />,
        cell: (info) => {
          const count = info.getValue();
          if (!count) return <span className="text-muted-foreground">—</span>;
          return <span className="text-sm">{count}</span>;
        },
        size: 80,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const row = info.row.original;
          if (!row.registryItemId) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const name = prompt('New name:', row.name);
                  if (name) editName(row.registryItemId!, name);
                }}
                title="Rename service"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {row.aliases.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const alias = row.aliases[0];
                    if (alias) separate(row.registryItemId!, alias.raw);
                  }}
                  title="Separate first alias"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
        size: 80,
      }),
    );

    return cols;
  }, [columnHelper, projectLabel, editName, separate]);

  if (isSuperior) {
    return <SuperiorServices />;
  }

  return (
    <DataListShell
      data={rows}
      columns={columns}
      searchPlaceholder="Search services..."
      searchableKeys={['name', 'categoryLabel', 'code']}
      filters={[
        {
          id: 'category',
          label: 'Service type',
          options: CATEGORY_ORDER.map((c) => ({
            value: c,
            label: CATEGORY_LABELS[c],
          })),
        },
        {
          id: 'billingUnit',
          label: 'Billing unit',
          options: BILLING_UNIT_ORDER.map((u) => ({
            value: u,
            label: BILLING_UNIT_LABELS[u],
          })),
        },
      ]}
      emptyMessage="No services yet."
      defaultPageSize={50}
    />
  );
}
