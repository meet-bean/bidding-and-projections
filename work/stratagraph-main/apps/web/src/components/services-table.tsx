import { useMemo } from 'react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { ChevronRight, Info, MoreHorizontal } from 'lucide-react';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { COST_TYPE_COLOR, type CostType } from '~/lib/cost-types';
import type { ServiceRow } from '~/lib/service-rows';
import { ServiceBreakdown } from '~/components/service-breakdown';

interface ServicesTableProps {
  rows: ServiceRow[];
  /** Stratagraph row click opens the detail drawer. Superior rows expand instead. */
  onRowClick: (row: ServiceRow) => void;
  /** Superior ⋯ menu → open the management drawer for this service. */
  onManage: (row: ServiceRow) => void;
  /** Superior shows the OE/CTD/F unit-cost columns; Stratagraph shows the rate card. */
  isSuperior: boolean;
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

/** Forecast-vs-Original unit-cost variance: over-bid runs warm (red), under runs cool (green). */
function varianceCell(pct: number | null) {
  if (pct == null) return <div className="text-muted-foreground text-right">—</div>;
  const rounded = Math.round(pct);
  if (rounded === 0) return <div className="text-muted-foreground text-right text-sm tabular-nums">0%</div>;
  const over = rounded > 0;
  return (
    <div
      className={`text-right text-sm font-medium tabular-nums ${over ? 'text-destructive' : 'text-success'}`}
    >
      {over ? '+' : ''}
      {rounded}%
    </div>
  );
}

/** Info affordance explaining how a derived column is computed (hover to read). */
function InfoTip({ label, info }: { label: string; info: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`How ${label} is calculated`}
          className="text-muted-foreground/60 hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-xs leading-relaxed">{info}</TooltipContent>
    </Tooltip>
  );
}

const UC_INFO = {
  original:
    'The bid. Estimate cost ÷ estimate quantity, pooled across all projects — quantity-weighted (total cost ÷ total quantity), not an average.',
  actual:
    'Cost-to-date ÷ quantity completed so far, pooled across all projects. Runs high early in a job (mobilisation, few units done) and converges toward Forecast.',
  forecast:
    'Projected final cost ÷ projected quantity, pooled across all projects — quantity-weighted, not an average.',
  variance: 'Forecast UC vs Original UC. Positive = projected to cost more than the bid per unit.',
} as const;

/** Shared Services table — tenant-aware column set. */
export function ServicesTable({ rows, onRowClick, onManage, isSuperior, actions }: ServicesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        // Superior rows expand inline to their per-project breakdown.
        meta: isSuperior
          ? { expandedContent: (r: ServiceRow) => <ServiceBreakdown service={r.service} /> }
          : undefined,
        cell: (info) => {
          const r = info.row.original;
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              {isSuperior && (
                <ChevronRight
                  className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                    info.row.getIsExpanded() ? 'rotate-90' : ''
                  }`}
                />
              )}
              {r.code && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{r.code}</span>
              )}
              <span className="truncate text-sm font-medium" title={info.getValue()}>
                {info.getValue()}
              </span>
              {r.codeVaries && (
                <span className="shrink-0 text-[10px] italic text-muted-foreground">+ varies</span>
              )}
            </div>
          );
        },
        size: 320,
      }),
      columnHelper.accessor('type', {
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: (info) => {
          const t = info.getValue();
          const color = COST_TYPE_COLOR[t as CostType];
          // House language: colored dot + plain text, never a filled chip.
          return (
            <span className="inline-flex items-center gap-1.5 text-sm capitalize">
              {color && (
                <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
              )}
              {t.replace(/_/g, ' ')}
            </span>
          );
        },
        size: 130,
      }),
      columnHelper.accessor('unit', {
        id: 'unit',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Unit" />,
        cell: (info) =>
          info.row.original.uomVaries ? (
            <span
              className="text-xs italic text-warning"
              title="Sources use different units — blended unit cost is not shown"
            >
              mixed
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">{info.getValue()}</span>
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
      // Tenant-specific tail: Superior tracks unit-cost (OE/CTD/F + variance);
      // Stratagraph carries the rate card. Showing both for either tenant left
      // half the columns permanently empty, so each tenant gets only its own.
      ...(isSuperior
        ? [
            columnHelper.accessor((r) => r.originalUC ?? 0, {
              id: 'originalUC',
              header: ({ column }) => (
                <div className="flex items-center justify-end gap-1">
                  <DataGridColumnHeader column={column} title="Original UC" className="justify-end" />
                  <InfoTip label="Original UC" info={UC_INFO.original} />
                </div>
              ),
              cell: (info) => moneyCell(info.row.original.originalUC),
              size: 124,
            }),
            columnHelper.accessor((r) => r.actualUC ?? 0, {
              id: 'actualUC',
              header: ({ column }) => (
                <div className="flex items-center justify-end gap-1">
                  <DataGridColumnHeader column={column} title="Actual UC" className="justify-end" />
                  <InfoTip label="Actual UC" info={UC_INFO.actual} />
                </div>
              ),
              cell: (info) => moneyCell(info.row.original.actualUC),
              size: 124,
            }),
            columnHelper.accessor((r) => r.forecastUC ?? 0, {
              id: 'forecastUC',
              header: ({ column }) => (
                <div className="flex items-center justify-end gap-1">
                  <DataGridColumnHeader column={column} title="Forecast UC" className="justify-end" />
                  <InfoTip label="Forecast UC" info={UC_INFO.forecast} />
                </div>
              ),
              cell: (info) => moneyCell(info.row.original.forecastUC),
              size: 124,
            }),
            columnHelper.accessor((r) => r.variancePct ?? 0, {
              id: 'variancePct',
              header: ({ column }) => (
                <div className="flex items-center justify-end gap-1">
                  <DataGridColumnHeader column={column} title="Δ vs Bid" className="justify-end" />
                  <InfoTip label="Δ vs Bid" info={UC_INFO.variance} />
                </div>
              ),
              cell: (info) => varianceCell(info.row.original.variancePct),
              size: 96,
            }),
          ]
        : [
            columnHelper.accessor((r) => r.recommendedRate ?? 0, {
              id: 'recommendedRate',
              header: ({ column }) => (
                <DataGridColumnHeader column={column} title="Recommended Rate" className="justify-end" />
              ),
              cell: (info) => moneyCell(info.row.original.recommendedRate, info.row.original.rateNote),
              size: 160,
            }),
          ]),
      // Row actions (Superior) — management lives off the frequent expand peek.
      ...(isSuperior
        ? [
            columnHelper.display({
              id: 'actions',
              header: () => null,
              cell: (info) => (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground"
                    aria-label="Manage service"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManage(info.row.original);
                    }}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              ),
              size: 48,
            }),
          ]
        : []),
    ],
    [isSuperior, onManage]
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
      expandable={isSuperior}
      emptyMessage="No services yet."
      defaultPageSize={50}
    />
  );
}
