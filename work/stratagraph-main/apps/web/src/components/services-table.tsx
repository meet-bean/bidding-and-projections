import { useMemo, useState } from 'react';
import { Button, Input, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { ChevronRight, Info, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { COST_TYPE_COLOR, type CostType } from '~/lib/cost-types';
import { formatCurrencyExact } from '~/lib/format';
import type { ServiceRow } from '~/lib/service-rows';
import { ServiceBreakdown } from '~/components/service-breakdown';

interface ServicesTableProps {
  rows: ServiceRow[];
  /** Stratagraph row click opens the detail drawer. Superior rows expand instead. */
  onRowClick: (row: ServiceRow) => void;
  /** Superior ⋯ menu → open the management drawer for this service. */
  onManage: (row: ServiceRow) => void;
  /** Commit a manual recommended-rate override (null = back to auto). */
  onSetRate: (row: ServiceRow, rate: number | null) => void;
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
      {formatCurrencyExact(value)}
    </div>
  );
}

/** Forecast-vs-Original unit-cost variance: over-bid runs warm (red), under runs cool (green). */
function varianceCell(pct: number | null) {
  if (pct == null) return <div className="text-muted-foreground text-right">—</div>;
  const rounded = Math.round(pct);
  // Small deltas stay quiet so only real outliers pop.
  if (Math.abs(rounded) < 5)
    return (
      <div className="text-muted-foreground text-right text-sm tabular-nums">
        {rounded > 0 ? '+' : ''}
        {rounded}%
      </div>
    );
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

/**
 * Inline-editable recommended rate (the approved Linear-style pattern):
 * derived rate renders muted with a tiny "auto" tag; row hover reveals a
 * dashed underline + pencil; clicking swaps to an input in place (enter
 * commits, esc cancels). A manual override renders full-weight with a
 * hover reset-to-auto icon. Typing the exact auto value clears the override.
 */
function RateCell({
  row,
  onCommit,
}: {
  row: ServiceRow;
  onCommit: (rate: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const auto = row.recommendedRateAuto;
  const override = row.recommendedRateOverride;
  const value = override ?? auto;

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value != null ? value.toFixed(2) : '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const n = Number.parseFloat(draft);
    if (!Number.isFinite(n) || n <= 0) return; // invalid → cancel
    const rounded = Math.round(n * 100) / 100;
    if (auto != null && Math.abs(rounded - auto) < 0.005) {
      // Typed the auto value back → follow auto again.
      if (override != null) onCommit(null);
      return;
    }
    if (override != null && Math.abs(rounded - override) < 0.005) return; // unchanged
    onCommit(rounded);
  };

  if (editing) {
    return (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          type="number"
          step="0.01"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label={`Recommended rate for ${row.name}`}
          className="h-7 w-28 text-right text-xs tabular-nums"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit recommended rate for ${row.name}`}
        className="border-b border-dashed border-transparent text-right text-sm tabular-nums [tr:hover_&]:border-border"
      >
        {override != null ? (
          <span className="font-medium">{formatCurrencyExact(override)}</span>
        ) : value != null ? (
          <span className="text-muted-foreground">{formatCurrencyExact(value)}</span>
        ) : (
          <span className="text-muted-foreground text-xs italic">{row.rateNote ?? '—'}</span>
        )}
      </button>
      {override == null && value != null && (
        <span className="text-muted-foreground/70 text-[9px] font-medium uppercase tracking-wider">
          auto
        </span>
      )}
      {override != null && auto != null ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Reset to auto rate"
              onClick={(e) => {
                e.stopPropagation();
                onCommit(null);
              }}
              className="text-muted-foreground hover:text-foreground opacity-0 [tr:hover_&]:opacity-100"
            >
              <RotateCcw className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            Reset to auto ({formatCurrencyExact(auto)})
          </TooltipContent>
        </Tooltip>
      ) : (
        <Pencil className="text-muted-foreground size-3 opacity-0 [tr:hover_&]:opacity-100" />
      )}
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
  recommended:
    'Suggested catalog rate: blended Original UC across only the projects where the estimate held up (forecast ≤ original). “—” when no project qualifies. Click a value to set your own; overridden rates show a reset.',
} as const;

/** Shared Services table — tenant-aware column set. */
export function ServicesTable({ rows, onRowClick, onManage, onSetRate, isSuperior, actions }: ServicesTableProps) {
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
            columnHelper.accessor((r) => r.recommendedRate ?? 0, {
              id: 'recommendedRate',
              header: ({ column }) => (
                <div className="flex items-center justify-end gap-1">
                  <DataGridColumnHeader column={column} title="Rec. Rate" className="justify-end" />
                  <InfoTip label="Recommended Rate" info={UC_INFO.recommended} />
                </div>
              ),
              cell: (info) => <RateCell row={info.row.original} onCommit={(rate) => onSetRate(info.row.original, rate)} />,
              size: 136,
            }),
          ]
        : [
            columnHelper.accessor((r) => r.recommendedRate ?? 0, {
              id: 'recommendedRate',
              header: ({ column }) => (
                <DataGridColumnHeader column={column} title="Recommended Rate" className="justify-end" />
              ),
              cell: (info) => <RateCell row={info.row.original} onCommit={(rate) => onSetRate(info.row.original, rate)} />,
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
    [isSuperior, onManage, onSetRate]
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
