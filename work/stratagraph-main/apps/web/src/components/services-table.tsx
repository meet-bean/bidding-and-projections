import { useMemo } from 'react';
import { Badge } from '@repo/ui';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { COST_TYPE_COLOR, type CostType } from '~/lib/cost-types';
import type { ServiceRow } from '~/lib/service-rows';

interface ServicesTableProps {
  rows: ServiceRow[];
  onRowClick: (row: ServiceRow) => void;
  actions?: React.ReactNode;
}

const columnHelper = createColumnHelper<ServiceRow>();

function moneyCell(value: number | null, fallback?: string | null) {
  if (value == null) {
    return fallback ? (
      <div className="text-muted-foreground text-right text-xs italic">{fallback}</div>
    ) : (
      <div className="text-muted-foreground text-right">—</div>
    );
  }
  return (
    <div className="text-right text-sm tabular-nums">
      ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
    </div>
  );
}

/** Shared Services table — one column set for both tenants. */
export function ServicesTable({ rows, onRowClick, actions }: ServicesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: (info) => {
          const r = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {r.code && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {r.code}
                </Badge>
              )}
              <span className="text-sm font-medium">{info.getValue()}</span>
              {r.codeVaries && (
                <span className="text-[10px] italic text-muted-foreground">+ varies</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('type', {
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: (info) => {
          const t = info.getValue();
          const color = COST_TYPE_COLOR[t as CostType];
          if (color) {
            return (
              <span
                className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: color }}
              >
                {t}
              </span>
            );
          }
          return (
            <Badge variant="secondary" className="text-[11px] font-normal capitalize">
              {t.replace(/_/g, ' ')}
            </Badge>
          );
        },
        size: 130,
      }),
      columnHelper.accessor('unit', {
        id: 'unit',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Unit" />,
        cell: (info) => (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {info.getValue()}
          </Badge>
        ),
        size: 90,
      }),
      columnHelper.accessor('usedIn', {
        id: 'usedIn',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Used in" />,
        cell: (info) => {
          const n = info.getValue();
          if (!n) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm">
              {n} project{n === 1 ? '' : 's'}
            </span>
          );
        },
        size: 110,
      }),
      columnHelper.accessor((r) => r.recommendedRate ?? 0, {
        id: 'recommendedRate',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Recommended Rate" className="justify-end" />
        ),
        cell: (info) => {
          const r = info.row.original;
          return moneyCell(r.recommendedRate, r.rateNote);
        },
        size: 160,
      }),
      columnHelper.accessor((r) => r.originalUC ?? 0, {
        id: 'originalUC',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Original UC" className="justify-end" />
        ),
        cell: (info) => moneyCell(info.row.original.originalUC),
        size: 120,
      }),
      columnHelper.accessor((r) => r.actualUC ?? 0, {
        id: 'actualUC',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Actual UC" className="justify-end" />
        ),
        cell: (info) => moneyCell(info.row.original.actualUC),
        size: 120,
      }),
      columnHelper.accessor((r) => r.forecastUC ?? 0, {
        id: 'forecastUC',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Forecast UC" className="justify-end" />
        ),
        cell: (info) => moneyCell(info.row.original.forecastUC),
        size: 120,
      }),
    ],
    []
  );

  const typeOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.type))).sort().map((t) => ({
        value: t,
        label: t.replace(/_/g, ' '),
      })),
    [rows]
  );
  const unitOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.unit))).sort().map((u) => ({ value: u, label: u })),
    [rows]
  );

  return (
    <DataListShell
      data={rows}
      columns={columns}
      searchPlaceholder="Search services..."
      searchableKeys={['name']}
      filters={[
        { id: 'type', label: 'Type', options: typeOptions },
        { id: 'unit', label: 'Unit', options: unitOptions },
      ]}
      actions={actions}
      onRowClick={onRowClick}
      emptyMessage="No services yet."
      defaultPageSize={50}
    />
  );
}
