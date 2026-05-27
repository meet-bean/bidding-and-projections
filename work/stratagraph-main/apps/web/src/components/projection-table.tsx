'use client';

import { useState, useRef, useMemo } from 'react';
import {
  createColumnHelper,
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridColumnHeader,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
  type SortingState,
  type ExpandedState,
  cn,
} from '@repo/ui';
import { TrendingUp, MessageSquare, AlertTriangle, ChevronRight, ChevronDown, ShieldAlert } from 'lucide-react';
import { CompletionRing } from './completion-ring';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  lensVsPrev,
  lensVsOrig,
  lensLeftToSpend,
  computeAlerts,
  computeSummaryRows,
  riskScore,
  VARIANCE_THRESHOLD_PCT,
  qtyComplete,
  dollarComplete,
} from '@repo/projections';
import type { ProjectionItem, ProjectionProject, TimeSlice } from '@repo/projections';
import { ProjectionToolbar, filterItems, searchItems, type FilterId } from './projection-toolbar';
import { useColumnVisibility } from './projection-column-picker';
import { ProjectionSummaryRows } from './projection-summary-rows';
import { ProjectionRowDetail } from './projection-row-detail';

interface ProjectionTableProps {
  project: ProjectionProject;
  onUpdateForecast: (
    lineKey: string,
    patch: { qty?: number; hours?: number; cost?: number },
  ) => void;
  onOpenTrend: (lineKey: string) => void;
  onOpenComments: (lineKey: string) => void;
  onExport: () => void;
}

const helper = createColumnHelper<ProjectionItem>();

const SLICES = ['CTP', 'CTD', 'CTC', 'F', 'Est'] as const;
const STD_FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;
const F_FIELDS = ['qty', 'hours', 'calcHrs', 'upm', 'mpu', 'uc'] as const;
const FIELD_LABELS: Record<string, string> = {
  qty: 'Qty', hours: 'Hours', calcHrs: 'Calc Hrs', upm: 'U/MH', mpu: 'MH/U', uc: 'UC', cost: 'Cost',
};

// Inline editable cell for forecast fields
function EditableCell({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (newValue: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setRaw(value === 0 ? '' : String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleCommit = () => {
    setEditing(false);
    let parsed: number;
    try {
      // Allow math expressions like 38*5
      // eslint-disable-next-line no-new-func
      parsed = Number(new Function('"use strict"; return (' + raw + ')')());
    } catch {
      parsed = NaN;
    }
    if (Number.isFinite(parsed) && parsed !== value) {
      onCommit(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-right text-sm focus:outline-none"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      className="cursor-text rounded px-1.5 py-0.5 text-right text-sm transition-colors hover:bg-accent/50"
      onClick={handleFocus}
      role="button"
      tabIndex={0}
      onFocus={handleFocus}
    >
      {value === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        formatCurrency(value)
      )}
    </div>
  );
}

export function ProjectionTable({
  project,
  onUpdateForecast,
  onOpenTrend,
  onOpenComments,
  onExport,
}: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [activeCostType, setActiveCostType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const colVis = useColumnVisibility();

  // Get the current items (draft or latest version)
  const currentVersion =
    project.draft ?? project.versions[project.versions.length - 1] ?? null;
  const items = currentVersion?.items ?? [];

  // Compute alerts to get alert counts per line
  const alertsResult = computeAlerts(project);
  const alertsByKey = new Map<string, number>();
  for (const a of alertsResult.open) {
    alertsByKey.set(a.key, (alertsByKey.get(a.key) ?? 0) + 1);
  }

  // Comment counts for filter
  const commentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const [key, comments] of Object.entries(project.comments)) {
      m.set(key, comments.length);
    }
    return m;
  }, [project.comments]);

  // Chain filtering
  const visibleItems = useMemo(() => {
    let result = items;
    result = searchItems(result, searchQuery);
    result = filterItems(result, activeFilter, alertsResult, commentCounts);
    if (activeCostType) {
      result = result.filter((it) => (it.keyParts[1] ?? '') === activeCostType);
    }
    return result;
  }, [items, searchQuery, activeFilter, alertsResult, commentCounts, activeCostType]);

  // Summary rows (cost type grouping + grand totals)
  const summary = useMemo(() => computeSummaryRows(items), [items]);

  // Dynamic slice columns based on visibility
  const sliceColumns = useMemo(() => {
    const cols = [];
    for (const slice of SLICES) {
      const fields = slice === 'F' ? F_FIELDS : STD_FIELDS;
      for (const field of fields) {
        if (!colVis.isVisible(slice, field)) continue;

        if (slice === 'F' && field === 'calcHrs') {
          cols.push(
            helper.accessor('calcHrs', {
              id: 'F-calcHrs',
              header: ({ column }) => (
                <DataGridColumnHeader column={column} title="F Calc Hrs" />
              ),
              cell: ({ getValue }) => (
                <div className="text-right text-sm tabular-nums">
                  {(getValue() as number) === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatNumber(getValue() as number)
                  )}
                </div>
              ),
              size: 90,
            }),
          );
          continue;
        }

        const sliceName = slice as keyof Pick<ProjectionItem, 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'>;
        const fieldName = field as keyof TimeSlice;
        const isEditable = slice === 'F' && (field === 'qty' || field === 'hours');

        cols.push(
          helper.accessor((row) => row[sliceName][fieldName], {
            id: `${slice}-${field}`,
            header: ({ column }) => (
              <DataGridColumnHeader column={column} title={`${slice} ${FIELD_LABELS[field]}`} />
            ),
            cell: isEditable
              ? ({ row, getValue }) => (
                  <EditableCell
                    value={getValue() as number}
                    onCommit={(v) => {
                      const patch: Record<string, number> = {};
                      patch[field] = v;
                      onUpdateForecast(row.original.lineKey, patch);
                    }}
                  />
                )
              : ({ getValue }) => (
                  <div className="text-right text-sm tabular-nums">
                    {(getValue() as number) === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatNumber(getValue() as number)
                    )}
                  </div>
                ),
            size: field === 'cost' ? 110 : 80,
          }),
        );
      }

      // After F slice: insert prevForecast column
      if (slice === 'F' && colVis.isVisible('meta', 'prevForecast')) {
        cols.push(
          helper.accessor('prevForecast', {
            id: 'meta-prevForecast',
            header: ({ column }) => (
              <DataGridColumnHeader column={column} title="Last Month FC" />
            ),
            cell: ({ getValue }) => (
              <div className="text-right text-sm tabular-nums">
                {(getValue() as number) === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  formatCurrency(getValue() as number)
                )}
              </div>
            ),
            size: 110,
          }),
        );
      }
    }
    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colVis.vis, onUpdateForecast]);

  const columns = useMemo(() => [
    // ── Static: Phase → Description → Cost Type/UM ──
    helper.accessor((row) => row.keyParts[0] ?? '', {
      id: 'phase',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Phase" />,
      cell: ({ row, getValue }) => (
        <button
          className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
        >
          {row.getIsExpanded() ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          {getValue()}
        </button>
      ),
      size: 100,
      meta: {
        expandedContent: (original: ProjectionItem) => (
          <ProjectionRowDetail
            item={original}
            project={project}
            onUpdateForecast={onUpdateForecast}
          />
        ),
      },
    }),
    helper.accessor('label', {
      id: 'description',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
      cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
      size: 200,
    }),
    helper.accessor((row) => `${row.keyParts[1] ?? ''} ${row.unitOfMeasure}`.trim(), {
      id: 'costTypeUM',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Type/UM" />,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.keyParts[1] ?? ''}
          {row.original.unitOfMeasure ? (
            <span className="text-muted-foreground"> {row.original.unitOfMeasure}</span>
          ) : null}
        </span>
      ),
      size: 120,
    }),
    // ── Dynamic: CTP → CTD → CTC → F (with calcHrs) → prevForecast → Est/OE ──
    ...sliceColumns,
    // ── Projection summary ──
    helper.accessor((row) => row.F.cost, {
      id: 'proj-forecast',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Forecast" />,
      cell: ({ getValue }) => (
        <div className="text-right text-sm font-medium tabular-nums">
          {(getValue() as number) === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatCurrency(getValue() as number)
          )}
        </div>
      ),
      size: 120,
    }),
    helper.accessor(
      (row) => {
        const v = lensVsPrev(project, row.lineKey);
        return v?.delta ?? 0;
      },
      {
        id: 'proj-chgPrev',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Chg From Prev" />,
        sortingFn: (a, b) => Math.abs(a.getValue('proj-chgPrev') as number) - Math.abs(b.getValue('proj-chgPrev') as number),
        cell: ({ getValue }) => {
          const delta = getValue() as number;
          if (Math.abs(delta) < 0.5)
            return <div className="text-right text-xs text-muted-foreground">—</div>;
          return (
            <div
              className={cn(
                'rounded px-1.5 py-0.5 text-right text-xs tabular-nums',
                delta > 0 && 'text-destructive',
                delta < 0 && 'text-success',
              )}
            >
              {formatCurrency(delta)}
            </div>
          );
        },
        size: 110,
      },
    ),
    helper.accessor(
      (row) => {
        const v = lensLeftToSpend(project, row.lineKey);
        return v?.delta ?? 0;
      },
      {
        id: 'proj-lts',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Left To Spend" />,
        cell: ({ getValue }) => {
          const val = getValue() as number;
          if (Math.abs(val) < 0.5)
            return <div className="text-right text-xs text-muted-foreground">—</div>;
          return (
            <div className="text-right text-sm tabular-nums">
              {formatCurrency(val)}
            </div>
          );
        },
        size: 110,
      },
    ),
    helper.accessor(
      (row) => {
        const v = lensVsOrig(project, row.lineKey);
        return v?.delta ?? 0;
      },
      {
        id: 'proj-chgOrig',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Chg From Orig" />,
        sortingFn: (a, b) => Math.abs(a.getValue('proj-chgOrig') as number) - Math.abs(b.getValue('proj-chgOrig') as number),
        cell: ({ getValue }) => {
          const delta = getValue() as number;
          if (Math.abs(delta) < 0.5)
            return <div className="text-right text-xs text-muted-foreground">—</div>;
          return (
            <div
              className={cn(
                'rounded px-1.5 py-0.5 text-right text-xs tabular-nums',
                delta > 0 && 'text-destructive',
                delta < 0 && 'text-success',
              )}
            >
              {formatCurrency(delta)}
            </div>
          );
        },
        size: 110,
      },
    ),
    // ── Qty % Complete ──
    helper.accessor(
      (row) => qtyComplete(row) ?? -1,
      {
        id: 'qtyPct',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Qty %" />,
        cell: ({ row }) => {
          const pct = qtyComplete(row.original);
          if (pct == null) return <span className="text-xs text-muted-foreground">—</span>;
          return <CompletionRing pct={pct} size={28} label={`${pct.toFixed(0)}%`} />;
        },
        size: 80,
      },
    ),
    // ── $ % Complete ──
    helper.accessor(
      (row) => dollarComplete(row) ?? -1,
      {
        id: 'dollarPct',
        header: ({ column }) => <DataGridColumnHeader column={column} title="$ %" />,
        cell: ({ row }) => {
          const pct = dollarComplete(row.original);
          if (pct == null) return <span className="text-xs text-muted-foreground">—</span>;
          return <CompletionRing pct={pct} size={28} label={`${pct.toFixed(0)}%`} />;
        },
        size: 80,
      },
    ),
    // ── Risk ──
    helper.accessor(
      (row) => riskScore(project, row.lineKey)?.exposure ?? 0,
      {
        id: 'risk',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Risk" />,
        cell: ({ row }) => {
          const rs = riskScore(project, row.original.lineKey);
          if (!rs || rs.score === 0) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              rs.level === 'high' && 'text-destructive',
              rs.level === 'medium' && 'text-warning',
              rs.level === 'low' && 'text-muted-foreground',
            )}>
              <ShieldAlert className="size-3" />
              {formatCurrency(rs.exposure)}
            </div>
          );
        },
        sortingFn: (a, b) => Math.abs(a.getValue('risk') as number) - Math.abs(b.getValue('risk') as number),
        size: 100,
      },
    ),
    // ── Actions: trend chart + comments ──
    helper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const key = row.original.lineKey;
        const commentCount = (project.comments[key] ?? []).length;
        const alertCount = alertsByKey.get(key) ?? 0;
        return (
          <div className="flex items-center justify-end gap-1">
            {alertCount > 0 && (
              <button
                className="flex size-7 items-center justify-center rounded text-destructive transition-colors hover:bg-destructive/10"
                title={`${alertCount} alert${alertCount !== 1 ? 's' : ''}`}
              >
                <AlertTriangle className="size-3.5" />
              </button>
            )}
            <button
              className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => onOpenTrend(key)}
              title="Trend chart"
            >
              <TrendingUp className="size-3.5" />
            </button>
            <button
              className="relative flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => onOpenComments(key)}
              title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}
            >
              <MessageSquare className="size-3.5" />
              {commentCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {commentCount}
                </span>
              )}
            </button>
          </div>
        );
      },
      size: 80,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sliceColumns, project, alertsByKey, onOpenTrend, onOpenComments, onUpdateForecast]);

  const table = useReactTable({
    data: visibleItems,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.lineKey,
  });

  if (!currentVersion) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No projection data yet. Upload a Vista cost report to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ProjectionToolbar
        items={items}
        alerts={alertsResult}
        commentCounts={commentCounts}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        activeCostType={activeCostType}
        onCostTypeChange={setActiveCostType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        columnVis={colVis.vis}
        onToggleColumn={colVis.toggle}
        onToggleSlice={colVis.toggleSlice}
        onResetColumns={colVis.reset}
        activeColumnCount={colVis.activeCount}
        onExport={onExport}
      />
      {/* Grand totals bar */}
      <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2 text-sm tabular-nums">
        <span className="font-medium">{summary.grand.count} items</span>
        <span>CTD: <strong>{formatCurrency(summary.grand.CTD.cost)}</strong></span>
        <span>Forecast: <strong>{formatCurrency(summary.grand.F.cost)}</strong></span>
        <span>Estimate: <strong>{formatCurrency(summary.grand.Est.cost)}</strong></span>
        <span className={summary.grand.F.cost > summary.grand.Est.cost ? 'text-destructive' : 'text-success'}>
          Var: {formatCurrency(summary.grand.F.cost - summary.grand.Est.cost)}
        </span>
      </div>
      <DataGrid
        table={table}
        recordCount={visibleItems.length}
        tableLayout={{ headerSticky: true, dense: true, rowBorder: true, headerBorder: true, headerBackground: true }}
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
      <ProjectionSummaryRows summary={summary} />
    </div>
  );
}
