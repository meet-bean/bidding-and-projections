import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge } from '@repo/ui';
import { useStore } from '~/lib/store';
import {
  BILLING_UNIT_LABELS,
  CATEGORY_LABELS,
} from '~/data/service-catalog';
import type {
  BillingUnit,
  DailyCode,
  ServiceCategory,
} from '~/lib/types';
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
  category: ServiceCategory;
  categoryLabel: string;
  dailyCode: DailyCode | '';
  billingUnit: BillingUnit;
  billingUnitLabel: string;
  defaultRate: number | null;
  rateNote: string | null;
}

function ServicesPage() {
  const catalog = useStore((s) => s.serviceCatalog);
  const tenantId = useStore((s) => s.tenantId);
  const registry = useStore((s) => s.lineItemRegistry);

  const rows: ServiceRow[] = useMemo(() => {
    if (tenantId === 'stratagraph') {
      return catalog.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        categoryLabel: CATEGORY_LABELS[item.category],
        dailyCode: item.dailyCode ?? '',
        billingUnit: item.billingUnit,
        billingUnitLabel: BILLING_UNIT_LABELS[item.billingUnit],
        defaultRate: item.defaultRate,
        rateNote: item.rateNote,
      }));
    }
    // Superior: show registry items
    return registry.items.map((item) => ({
      id: item.id,
      name: item.canonicalName,
      category: 'logging' as ServiceCategory,  // placeholder — Superior doesn't use ServiceCategory
      categoryLabel: item.costType || '—',
      dailyCode: '' as DailyCode | '',
      billingUnit: 'per_other' as BillingUnit,  // placeholder
      billingUnitLabel: item.unitOfMeasure || '—',
      defaultRate: null,
      rateNote: null,
    }));
  }, [tenantId, catalog, registry.items]);

  const columnHelper = createColumnHelper<ServiceRow>();
  const columns = useMemo(
    () => [
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
      columnHelper.accessor('dailyCode', {
        id: 'dailyCode',
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
      columnHelper.accessor('billingUnitLabel', {
        id: 'billingUnit',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Unit" />,
        cell: (info) => (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {info.getValue()}
          </Badge>
        ),
        size: 110,
      }),
      columnHelper.accessor('defaultRate', {
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
                $
                {rate.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
    ],
    [columnHelper]
  );

  return (
    <DataListShell
      data={rows}
      columns={columns}
      searchPlaceholder="Search services..."
      searchableKeys={['name', 'dailyCode']}
      filters={tenantId === 'stratagraph' ? [
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
      emptyMessage="No services match your filters."
      defaultPageSize={50}
    />
  );
}
