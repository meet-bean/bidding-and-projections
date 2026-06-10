'use client';

import { useState, useRef, useMemo } from 'react';
import {
  createColumnHelper,
  MinimalDataGrid,
  MINIMAL_GRID_HEADER_LABEL,
  DataGridColumnHeader,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  type SortingState,
  type CellContext,
  cn,
} from '@repo/ui';
import { TrendingUp, MessageSquare, AlertTriangle, ShieldAlert, Pencil } from 'lucide-react';
import { CompletionBar } from './completion-ring';
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
  qtyComplete,
  dollarComplete,
  buildMetricColumns,
  resolveMetricValue,
} from '@repo/projections';
import type { ProjectionItem, ProjectionProject, Metric, ResolveCtx, MetricColumn } from '@repo/projections';
import { useStore } from '~/lib/store';
import { ProjectionToolbar, applyProjectionFilters, searchItems, type ProjectionFilter } from './projection-toolbar';
import { useColumnVisibility } from './projection-column-picker';
import { ProjectionSummaryRows } from './projection-summary-rows';
import { ProjectionRowDetail } from './projection-row-detail';

interface ProjectionTableProps {
  project: ProjectionProject;
  onUpdateForecast: (
    lineKey: string,
    patch: { qty?: number; hours?: number; cost?: number },
  ) => void;
  onUpdateMetricValue: (lineKey: string, metric: Metric, value: number) => void;
  onOpenTrend: (lineKey: string) => void;
  onOpenComments: (lineKey: string) => void;
}

const helper = createColumnHelper<ProjectionItem>();

// Minimal aesthetic (matches the bid "Services" selector table): the table is
// near-monochrome. Read-only numbers are quiet gray; the only ambient color is
// the faint per-group band, and the only things that "pop" are signed deltas /
// risk / completion bars. Editable cells get a subtle dotted-underline
// affordance instead of a filled chip (see EditableCell).

// One numeric style for every data cell — same type as the bid services picker:
// text-sm, tabular figures, quiet muted-gray so only meaningful values draw the eye.
const NUM_CELL = 'text-right text-sm tabular-nums text-muted-foreground';

// Micro column-header label — shared with the reusable MinimalDataGrid so every
// minimal table uses the same quiet uppercase header treatment.
const HEADER_LABEL = MINIMAL_GRID_HEADER_LABEL;

// Per-group color wash — the ONE ambient color we keep. Each metric group
// (CTP/CTD/CTC/F/…) gets a single continuous, very faint band on the BODY cells
// only (headers stay plain — no shading, no vertical dividers), so the eye
// groups the columns under a soft band while the table reads as monochrome.
const GROUP_BAND_CELL_ALPHA = 0.05;

/** Convert a #rrggbb hex to an rgba() string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Default right-aligned formatting for a plain (non-special) metric value. */
function renderMetricCell(col: MetricColumn, value: number) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  if (col.format === 'currency') return formatCurrency(value);
  if (col.format === 'percent') return formatPercent(value);
  return formatNumber(value);
}

type CellRenderer = (ctx: CellContext<ProjectionItem, unknown>) => React.ReactNode;

// Signed red/green delta cell (Chg From Prev / Chg From Orig). Mirrors the
// previous bespoke renderer: red when over (>0), green when under (<0).
function signedDeltaCell(delta: number): React.ReactNode {
  if (Math.abs(delta) < 0.5) return <div className={cn(NUM_CELL, 'text-muted-foreground')}>—</div>;
  return (
    <div
      className={cn(
        NUM_CELL,
        'font-medium',
        delta > 0 && 'text-destructive',
        delta < 0 && 'text-success',
      )}
    >
      {formatCurrency(delta)}
    </div>
  );
}

/**
 * Renderer registry keyed by metric id. Special analytics metrics reuse the
 * EXISTING helper functions so behavior + appearance are identical to the prior
 * hardcoded columns; editable metrics get the green tint; everything else falls
 * back to a plain right-aligned formatted value with group-color shading.
 */
function metricCellRenderer(
  col: MetricColumn,
  project: ProjectionProject,
  onUpdateMetricValue: (lineKey: string, metric: Metric, value: number) => void,
): CellRenderer {
  switch (col.id) {
    case 'qty-pct':
      return ({ row }) => {
        const pct = qtyComplete(row.original);
        if (pct == null) return <div className="flex justify-center text-xs text-muted-foreground">—</div>;
        return (
          <div className="flex justify-center">
            <CompletionBar pct={pct} />
          </div>
        );
      };
    case 'cost-pct':
      return ({ row }) => {
        const pct = dollarComplete(row.original);
        if (pct == null) return <div className="flex justify-center text-xs text-muted-foreground">—</div>;
        return (
          <div className="flex justify-center">
            <CompletionBar pct={pct} />
          </div>
        );
      };
    case 'risk':
      return ({ row }) => {
        const rs = riskScore(project, row.original.lineKey);
        if (!rs || rs.score === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div
            className={cn(
              'flex items-center justify-end gap-1 text-sm tabular-nums',
              rs.level === 'high' && 'text-destructive',
              rs.level === 'medium' && 'text-warning',
              rs.level === 'low' && 'text-muted-foreground',
            )}
          >
            <ShieldAlert className="size-3 shrink-0" />
            {formatCurrency(rs.exposure)}
          </div>
        );
      };
    case 'chg-prev':
      return ({ row }) => signedDeltaCell(lensVsPrev(project, row.original.lineKey)?.delta ?? 0);
    case 'chg-orig':
      return ({ row }) => signedDeltaCell(lensVsOrig(project, row.original.lineKey)?.delta ?? 0);
    case 'left-spend':
      return ({ row }) => {
        const val = lensLeftToSpend(project, row.original.lineKey)?.delta ?? 0;
        if (Math.abs(val) < 0.5) return <div className={cn(NUM_CELL, 'text-muted-foreground')}>—</div>;
        return <div className={NUM_CELL}>{formatCurrency(val)}</div>;
      };
    default:
      if (col.editable) {
        // Editable cells stay discoverable but quiet — no filled chip. The
        // EditableCell itself carries a subtle dotted underline + hover bg so it
        // reads as typeable without breaking the monochrome field.
        return ({ row, getValue }) => (
          <EditableCell
            value={getValue() as number}
            format={col.format === 'currency' ? 'currency' : 'number'}
            onCommit={(v) => onUpdateMetricValue(row.original.lineKey, col.metric, v)}
          />
        );
      }
      // Non-editable: plain right-aligned value on the calm field — no per-cell
      // color. Group identity is carried by the header + the vertical divider.
      return ({ getValue }) => (
        <div className={NUM_CELL}>{renderMetricCell(col, getValue() as number)}</div>
      );
  }
}

// Inline editable cell for any metric marked editable
function EditableCell({
  value,
  onCommit,
  format = 'number',
}: {
  value: number;
  onCommit: (newValue: number) => void;
  format?: 'currency' | 'number';
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

  const display = value === 0
    ? <span className="text-muted-foreground">—</span>
    : format === 'currency' ? formatCurrency(value) : formatNumber(value);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full rounded border border-primary/50 bg-background px-1.5 text-right text-sm tabular-nums focus:outline-none"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      className="text-foreground cursor-text rounded px-1.5 text-right text-sm tabular-nums underline decoration-dotted decoration-muted-foreground/40 underline-offset-4 transition-colors hover:bg-foreground/[0.04]"
      onClick={(e) => {
        // Don't bubble into the row click (which opens the detail sheet).
        e.stopPropagation();
        handleFocus();
      }}
      role="button"
      tabIndex={0}
      onFocus={handleFocus}
    >
      {display}
    </div>
  );
}

export function ProjectionTable({
  project,
  onUpdateForecast,
  onUpdateMetricValue,
  onOpenTrend,
  onOpenComments,
}: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ProjectionFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Row whose detail sheet is open (replaces the old in-table expand row).
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const catalog = useStore((s) => s.metricsCatalog);
  const colVis = useColumnVisibility(catalog);

  // Get the current items (draft or latest version)
  const currentVersion =
    project.draft ?? project.versions[project.versions.length - 1] ?? null;
  const items = currentVersion?.items ?? [];

  // Compute alerts to get alert counts per line.
  // Memoized on `project` so the reference stays stable across re-renders.
  // Without this, `visibleItems`/`columns` (which depend on it) get rebuilt
  // every render; combined with TanStack's default autoResetExpanded that
  // becomes an infinite re-render loop whenever a non-'all' filter is active
  // (filtered arrays are fresh references each render, unlike the 'all' case
  // which returns the original `items` ref). That loop froze the page.
  const alertsResult = useMemo(() => computeAlerts(project), [project]);
  const alertsByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of alertsResult.open) {
      m.set(a.key, (m.get(a.key) ?? 0) + 1);
    }
    return m;
  }, [alertsResult]);

  // Comment counts for filter
  const commentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const [key, comments] of Object.entries(project.comments)) {
      m.set(key, comments.length);
    }
    return m;
  }, [project.comments]);

  // Chain filtering: free-text search, then the active filter chips.
  const visibleItems = useMemo(() => {
    let result = items;
    result = searchItems(result, searchQuery);
    result = applyProjectionFilters(result, filters, alertsResult, commentCounts);
    return result;
  }, [items, searchQuery, filters, alertsResult, commentCounts]);

  // Summary rows (cost type grouping + grand totals)
  const summary = useMemo(() => computeSummaryRows(items), [items]);

  // Previous version's items, for carry-over metric resolution.
  const prevItems = useMemo(() => {
    const versions = project.versions;
    const prev = project.draft ? versions[versions.length - 1] : versions[versions.length - 2];
    return prev?.items ?? [];
  }, [project]);

  // Stable resolver context — memoized so it isn't a fresh reference each
  // render (which would feed the metricColumns/columns memos and, combined with
  // TanStack's autoResetExpanded, re-trigger the known render-freeze loop).
  const resolveCtx = useMemo<ResolveCtx>(() => ({ catalog, prevItems }), [catalog, prevItems]);

  // Value columns generated entirely from the catalog. Bespoke "special"
  // metrics (rings, signed deltas, risk) get their renderers from the registry
  // below; everything else is a plain right-aligned formatted value (editable
  // metrics render an EditableCell with the green tint).
  const metricColumns = useMemo(() => {
    const visible = buildMetricColumns(catalog).filter((col) => colVis.isVisible(col.id));
    return visible.map((col) => {
      // One continuous faint band per group — same catalog color as the picker
      // swatch, on body <td>s only. Headers stay completely plain and there are
      // no vertical dividers: the band itself is the group boundary.
      const cellStyle = col.color
        ? { backgroundColor: hexToRgba(col.color, GROUP_BAND_CELL_ALPHA) }
        : undefined;
      return helper.accessor((row) => resolveMetricValue(row, col.metric, resolveCtx), {
        id: col.id,
        header: ({ column }) => (
          // Numeric headers sit flush-right over their values, like the picker.
          <div className="flex w-full items-center justify-end gap-1">
            {col.editable && <Pencil className="size-2.5 shrink-0 text-muted-foreground" />}
            <DataGridColumnHeader column={column} title={col.name} className={HEADER_LABEL} />
          </div>
        ),
        cell: metricCellRenderer(col, project, onUpdateMetricValue),
        ...(col.id === 'chg-prev' || col.id === 'chg-orig'
          ? {
              sortingFn: (a, b) =>
                Math.abs(a.getValue(col.id) as number) - Math.abs(b.getValue(col.id) as number),
            }
          : {}),
        size: col.format === 'currency' ? 110 : 80,
        meta: { cellStyle },
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, colVis.vis, resolveCtx, onUpdateMetricValue, project]);

  const columns = useMemo(() => [
    // ── Static: Phase → Description → Cost Type → UoM ──
    helper.accessor((row) => row.keyParts[0] ?? '', {
      id: 'phase',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Phase" className={HEADER_LABEL} />,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{getValue()}</span>
      ),
      size: 100,
    }),
    helper.accessor('label', {
      id: 'description',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Description" className={HEADER_LABEL} />,
      cell: ({ getValue }) => <span className="text-sm leading-snug">{getValue()}</span>,
      size: 200,
    }),
    helper.accessor((row) => row.keyParts[1] ?? '', {
      id: 'costType',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Type" className={HEADER_LABEL} />,
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue()}</span>,
      size: 90,
    }),
    helper.accessor((row) => row.unitOfMeasure ?? '', {
      id: 'uom',
      header: ({ column }) => <DataGridColumnHeader column={column} title="UoM" className={HEADER_LABEL} />,
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue()}</span>,
      size: 70,
    }),
    // ── Catalog-driven value columns (CTP/CTD/CTC/F/Est + analytics) ──
    ...metricColumns,
    // ── Trailing indicators + quick actions (Linear-style): the alert dot and
    // the comment count are passive, always-visible signals; the trend and
    // comment *buttons* reveal on row hover so the resting table is pure data.
    helper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const key = row.original.lineKey;
        const commentCount = (project.comments[key] ?? []).length;
        const alertCount = alertsByKey.get(key) ?? 0;
        return (
          // Fixed-width slots so the indicators align vertically across rows —
          // a comment count on one row must not shift its alert triangle.
          <div className="grid grid-cols-[20px_20px_40px] items-center">
            <span
              className={cn('flex size-5 items-center justify-center text-destructive', alertCount === 0 && 'invisible')}
              title={alertCount > 0 ? `${alertCount} alert${alertCount !== 1 ? 's' : ''}` : undefined}
            >
              <AlertTriangle className="size-3.5" />
            </span>
            <button
              className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTrend(key);
              }}
              title="Trend chart"
            >
              <TrendingUp className="size-3.5" />
            </button>
            <button
              className={cn(
                'flex h-5 items-center gap-1 rounded px-0.5 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground',
                // Rows WITH comments always show the count; bare rows reveal
                // the button on hover so a comment can still be added.
                commentCount === 0 && 'opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100',
              )}
              onClick={(e) => {
                e.stopPropagation();
                onOpenComments(key);
              }}
              title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}
            >
              <MessageSquare className="size-3.5" />
              {commentCount > 0 && (
                <span className="text-xs tabular-nums">{commentCount}</span>
              )}
            </button>
          </div>
        );
      },
      size: 80,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [metricColumns, project, alertsByKey, onOpenTrend, onOpenComments, onUpdateForecast]);

  const table = useReactTable({
    data: visibleItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.lineKey,
  });

  const detailItem = detailKey ? items.find((it) => it.lineKey === detailKey) ?? null : null;

  if (!currentVersion) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No projection data yet. Upload a Vista cost report to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page-level stats render in the route's header metadata stack. */}
      <ProjectionToolbar
        items={items}
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        catalog={catalog}
        columnVis={colVis.vis}
        onToggleColumn={colVis.toggle}
        onSetColumns={colVis.setVisible}
        onResetColumns={colVis.reset}
        activeColumnCount={colVis.activeCount}
      />
      {/* Minimal shared shell. Row click opens the detail sheet; rows carry
          group/row so the trend/comment quick actions reveal on hover. */}
      <MinimalDataGrid
        table={table}
        recordCount={visibleItems.length}
        onRowClick={(row) => setDetailKey(row.lineKey)}
        tableClassNames={{ bodyRow: 'group/row' }}
      />
      <ProjectionSummaryRows summary={summary} />

      {/* Row detail sheet — replaces the old in-table expand row. */}
      <Sheet open={detailItem !== null} onOpenChange={(open) => !open && setDetailKey(null)}>
        <SheetContent
          side="right"
          className="overflow-y-auto data-[side=right]:w-[640px] data-[side=right]:sm:max-w-[640px]"
        >
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{detailItem.label}</SheetTitle>
                <p className="text-muted-foreground text-sm">
                  <span className="font-mono text-xs">{detailItem.keyParts[0]}</span>
                  {' · '}
                  {detailItem.keyParts[1]}
                  {detailItem.unitOfMeasure ? ` · ${detailItem.unitOfMeasure}` : ''}
                </p>
              </SheetHeader>
              <div className="px-4 pb-4">
                <ProjectionRowDetail
                  item={detailItem}
                  project={project}
                  onUpdateForecast={onUpdateForecast}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
