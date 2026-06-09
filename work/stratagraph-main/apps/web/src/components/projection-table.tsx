'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
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
  type CellContext,
  cn,
} from '@repo/ui';
import { TrendingUp, MessageSquare, AlertTriangle, ChevronRight, ChevronDown, ShieldAlert, Pencil } from 'lucide-react';
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
  onExport: () => void;
}

const helper = createColumnHelper<ProjectionItem>();

// Editable-metric visual cue (Option A — brand sage/teal, NOT blue). The whole
// table sits on a calm neutral field; editable cells are the one element that
// "pops", so the cell you can actually type into is unambiguous.
const EDITABLE_CELL_CLASS = 'bg-[#eef6f2] text-[#2c6450]';
const EDITABLE_HEADER_CLASS = 'bg-[#e3f0ea]';

// One numeric style for every data cell — uniform size + tabular figures so
// columns line up vertically. (Previously cells mixed text-sm/text-xs.)
const NUM_CELL = 'text-right text-[13px] tabular-nums';

// Vertical hairline marking the start of a metric group (CTP │ CTD │ CTC │ …).
const GROUP_DIVIDER = 'border-l border-border';

// Per-group color wash. Each metric group (CTP/CTD/CTC/F/…) gets ONE continuous,
// very faint band filling every cell + header edge-to-edge — so the eye groups
// the 3 columns (MH / U/MH / Cost) under a single soft vertical band, not a grid
// of tinted boxes. The color is the group's own `color` from the catalog (the
// same value the column picker swatches use), rendered at very low opacity so
// the whole area reads as ambient shading, not chips.
const GROUP_BAND_CELL_ALPHA = 0.07;
const GROUP_BAND_HEADER_ALPHA = 0.14;

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
              'flex items-center justify-end gap-1 text-[13px] tabular-nums',
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
        // The one element that pops off the calm field. The sage wash bleeds to
        // the full cell (negative margins cancel the dense td padding) so it
        // reads as an input affordance, not a chip.
        return ({ row, getValue }) => (
          <div className={cn('-mx-2.5 -my-2 px-1 py-0.5', EDITABLE_CELL_CLASS)}>
            <EditableCell
              value={getValue() as number}
              format={col.format === 'currency' ? 'currency' : 'number'}
              onCommit={(v) => onUpdateMetricValue(row.original.lineKey, col.metric, v)}
            />
          </div>
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
        className="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-right text-[13px] tabular-nums focus:outline-none"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      className="cursor-text rounded px-1.5 py-0.5 text-right text-[13px] tabular-nums transition-colors hover:bg-black/5"
      onClick={handleFocus}
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
  onExport,
}: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [filters, setFilters] = useState<ProjectionFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const catalog = useStore((s) => s.metricsCatalog);
  const colVis = useColumnVisibility(catalog);

  // Publish the grid's visible width as a CSS var (--grid-vw) that inherits
  // down to the expanded-row panel, so that panel can pin itself to the
  // viewport width instead of stretching across the full (very wide) table.
  const gridWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const sync = () => el.style.setProperty('--grid-vw', `${el.clientWidth}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    return visible.map((col, idx) => {
      // A divider opens each new metric group. idx === 0 also separates the
      // first value column from the static Phase/Description/Cost-Type block.
      const isGroupStart = idx === 0 || visible[idx - 1]!.group !== col.group;
      const dividerClass = isGroupStart ? GROUP_DIVIDER : undefined;
      // One continuous faint band per group — same catalog color as the picker
      // swatch, on the full <td>/<th> so adjacent cells/rows bleed into a single
      // soft vertical band rather than per-cell boxes.
      const cellStyle = col.color
        ? { backgroundColor: hexToRgba(col.color, GROUP_BAND_CELL_ALPHA) }
        : undefined;
      const headerStyle = col.color
        ? { backgroundColor: hexToRgba(col.color, GROUP_BAND_HEADER_ALPHA) }
        : undefined;
      return helper.accessor((row) => resolveMetricValue(row, col.metric, resolveCtx), {
        id: col.id,
        header: ({ column }) => (
          <div className={cn('flex items-center gap-1', col.editable && EDITABLE_HEADER_CLASS)}>
            {col.editable && <Pencil className="size-3 shrink-0 text-[#2c6450]" />}
            <DataGridColumnHeader column={column} title={col.name} />
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
        meta: { headerClassName: dividerClass, cellClassName: dividerClass, cellStyle, headerStyle },
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, colVis.vis, resolveCtx, onUpdateMetricValue, project]);

  const columns = useMemo(() => [
    // ── Static: Phase → Description → Cost Type → UoM ──
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
      cell: ({ getValue }) => <span className="text-[13px]">{getValue()}</span>,
      size: 200,
    }),
    helper.accessor((row) => row.keyParts[1] ?? '', {
      id: 'costType',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Type" />,
      cell: ({ getValue }) => <span className="text-xs">{getValue()}</span>,
      size: 90,
    }),
    helper.accessor((row) => row.unitOfMeasure ?? '', {
      id: 'uom',
      header: ({ column }) => <DataGridColumnHeader column={column} title="UoM" />,
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue()}</span>,
      size: 70,
    }),
    // ── Catalog-driven value columns (CTP/CTD/CTC/F/Est + analytics) ──
    ...metricColumns,
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
  ], [metricColumns, project, alertsByKey, onOpenTrend, onOpenComments, onUpdateForecast]);

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
      <div ref={gridWrapRef}>
        <DataGrid
          table={table}
          recordCount={visibleItems.length}
          tableLayout={{ width: 'auto', headerSticky: true, dense: true, rowBorder: true, headerBorder: true, headerBackground: true }}
        >
          {/* Calm neutral field: every read-only cell sits on this wash so the
              sage editable cells are the only thing that pops. Rows never wrap —
              cells stay single-line and the grid scrolls horizontally instead. */}
          <DataGridContainer className="overflow-x-auto bg-muted/30 [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      </div>
      <ProjectionSummaryRows summary={summary} />
    </div>
  );
}
