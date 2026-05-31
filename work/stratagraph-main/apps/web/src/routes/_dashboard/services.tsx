import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge, Button } from '@repo/ui';
import { Pencil, GitBranch, Trash2, FunctionSquare } from 'lucide-react';
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

function ServicesPage() {
  const catalog = useStore((s) => s.serviceCatalog);
  const tenantId = useStore((s) => s.tenantId);
  const registry = useStore((s) => s.serviceRegistry);
  const metricsCatalog = useStore((s) => s.metricsCatalog);
  const jobs = useStore((s) => s.jobs);
  const editName = useStore((s) => s.editRegistryItemName);
  const separate = useStore((s) => s.separateRegistryAlias);
  const tenant = useStore((s) => s.getTenantConfig());
  const clearProjectionData = useStore((s) => s.clearProjectionData);
  const projectLabel = tenant.features.operations ? 'Jobs' : 'Projects';
  const isSuperior = tenantId === 'superior';

  const metrics = metricsCatalog.metrics;

  const rows: ServiceRow[] = useMemo(() => {
    if (!isSuperior) {
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
    }

    return registry.items.map((item) => ({
      id: item.id,
      name: item.canonicalName,
      categoryLabel: item.costType || '—',
      code: '',
      unitLabel: item.unitOfMeasure || '—',
      rate: null,
      rateNote: null,
      aliasCount: item.aliases.length,
      aliases: item.aliases,
      projectCount: item.projectIds.length,
      category: 'logging' as ServiceCategory,
      billingUnit: 'per_other' as BillingUnit,
      registryItemId: item.id,
    }));
  }, [isSuperior, catalog, registry.items, jobs]);

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
  }, [columnHelper, projectLabel, editName, separate, isSuperior]);

  const headerActions = isSuperior ? (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
      onClick={() => {
        if (confirm('Delete all projection data, services, and metrics? This cannot be undone.')) {
          clearProjectionData();
        }
      }}
    >
      <Trash2 className="size-4 mr-1.5" />
      Clear All Data
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics / Columns & Formulas — Superior only */}
      {isSuperior && metrics.length > 0 && (
        <div className="rounded-lg border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FunctionSquare className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Columns &amp; Formulas</h3>
            <span className="text-xs text-muted-foreground">({metrics.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium">Column</th>
                  <th className="text-left px-4 py-2 font-medium">Group</th>
                  <th className="text-left px-4 py-2 font-medium">Field</th>
                  <th className="text-left px-4 py-2 font-medium">Kind</th>
                  <th className="text-left px-4 py-2 font-medium">Formula</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2 font-medium">{m.name}</td>
                    <td className="px-4 py-2">
                      {m.group ? (
                        <Badge variant="secondary" className="text-[10px]">{m.group}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{m.field}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {m.type === 'formula' ? (
                        <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning border-warning/30">formula</Badge>
                      ) : m.type === 'carry-over' ? (
                        <Badge variant="secondary" className="text-[10px]">carry-over</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">vista upload</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {m.formula ? (
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{m.formula}</code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DataListShell
        data={rows}
        columns={columns}
        searchPlaceholder="Search services..."
        searchableKeys={['name', 'categoryLabel', 'code']}
        filters={!isSuperior ? [
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
        ] : []}
        actions={headerActions}
        emptyMessage="No services yet."
        defaultPageSize={50}
      />
    </div>
  );
}
