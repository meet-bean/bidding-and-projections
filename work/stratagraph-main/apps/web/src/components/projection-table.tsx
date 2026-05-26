'use client';

import { useState, useRef } from 'react';
import {
  createColumnHelper,
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridColumnHeader,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  cn,
} from '@repo/ui';
import { TrendingUp, MessageSquare, AlertTriangle } from 'lucide-react';
import { CompletionRing } from './completion-ring';
import {
  formatCurrency,
  formatPercent,
  lensVsPrev,
  computeAlerts,
  VARIANCE_THRESHOLD_PCT,
  qtyComplete,
  dollarComplete,
} from '@repo/projections';
import type { ProjectionItem, ProjectionProject } from '@repo/projections';

interface ProjectionTableProps {
  project: ProjectionProject;
  onUpdateForecast: (
    lineKey: string,
    patch: { qty?: number; hours?: number; cost?: number },
  ) => void;
  onOpenTrend: (lineKey: string) => void;
  onOpenComments: (lineKey: string) => void;
}

const helper = createColumnHelper<ProjectionItem>();

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
}: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Get the current items (draft or latest version)
  const currentVersion =
    project.draft ?? project.versions[project.versions.length - 1] ?? null;
  const items = currentVersion?.items ?? [];

  // Compute alerts to get alert counts per line
  const alerts = computeAlerts(project);
  const alertsByKey = new Map<string, number>();
  for (const a of alerts.open) {
    alertsByKey.set(a.key, (alertsByKey.get(a.key) ?? 0) + 1);
  }

  const columns = [
    helper.accessor((row) => row.keyParts[0] ?? '', {
      id: 'phase',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Phase" />,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{getValue()}</span>
      ),
      size: 100,
    }),
    helper.accessor((row) => row.keyParts[1] ?? '', {
      id: 'costType',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Type" />,
      cell: ({ getValue }) => <span className="text-xs">{getValue()}</span>,
      size: 100,
    }),
    helper.accessor('label', {
      header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
      cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
      size: 200,
    }),
    helper.accessor('unitOfMeasure', {
      header: 'UM',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue()}</span>
      ),
      size: 60,
    }),
    helper.accessor((row) => row.CTD.cost, {
      id: 'ctdCost',
      header: ({ column }) => <DataGridColumnHeader column={column} title="CTD Cost" />,
      cell: ({ getValue }) => (
        <div className="text-right text-sm tabular-nums">
          {getValue() === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatCurrency(getValue())
          )}
        </div>
      ),
      size: 110,
    }),
    helper.accessor((row) => row.F.cost, {
      id: 'fCost',
      header: ({ column }) => <DataGridColumnHeader column={column} title="F Cost" />,
      cell: ({ row, getValue }) => (
        <EditableCell
          value={getValue()}
          onCommit={(v) => onUpdateForecast(row.original.lineKey, { cost: v })}
        />
      ),
      size: 120,
    }),
    helper.accessor((row) => row.F.qty, {
      id: 'fQty',
      header: ({ column }) => <DataGridColumnHeader column={column} title="F Qty" />,
      cell: ({ row, getValue }) => (
        <EditableCell
          value={getValue()}
          onCommit={(v) => onUpdateForecast(row.original.lineKey, { qty: v })}
        />
      ),
      size: 90,
    }),
    helper.accessor((row) => row.Est.cost, {
      id: 'estCost',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Estimate" />,
      cell: ({ getValue }) => (
        <div className="text-right text-sm tabular-nums text-muted-foreground">
          {getValue() === 0 ? '—' : formatCurrency(getValue())}
        </div>
      ),
      size: 110,
    }),
    // Variance vs prev month — color coded
    helper.accessor(
      (row) => {
        const v = lensVsPrev(project, row.lineKey);
        return v?.pct ?? 0;
      },
      {
        id: 'vsPrev',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Var MoM" />,
        cell: ({ getValue, row }) => {
          const pct = getValue();
          const v = lensVsPrev(project, row.original.lineKey);
          if (!v || Math.abs(pct) < 0.1)
            return (
              <div className="text-right text-xs text-muted-foreground">—</div>
            );
          const significant = Math.abs(pct) >= VARIANCE_THRESHOLD_PCT;
          return (
            <div
              className={cn(
                'rounded px-1.5 py-0.5 text-right text-xs tabular-nums transition-colors',
                significant && pct > 0 && 'bg-destructive/10 text-destructive',
                significant && pct < 0 && 'bg-success/10 text-success',
                !significant && 'text-muted-foreground',
              )}
            >
              {formatPercent(pct)}
            </div>
          );
        },
        size: 90,
      },
    ),
    // % complete
    helper.accessor('comp', {
      header: ({ column }) => <DataGridColumnHeader column={column} title="% Done" />,
      cell: ({ row }) => {
        const item = row.original;
        const qPct = qtyComplete(item);
        const dPct = dollarComplete(item);
        return (
          <div className="flex items-center gap-2">
            {qPct != null && (
              <CompletionRing pct={qPct} size={28} label={`${qPct.toFixed(0)}%`} />
            )}
            {dPct != null && (
              <CompletionRing
                pct={dPct}
                size={28}
                label={`$${dPct.toFixed(0)}%`}
                className="text-muted-foreground"
              />
            )}
            {qPct == null && dPct == null && (
              <span className="text-xs text-muted-foreground">--</span>
            )}
          </div>
        );
      },
      size: 140,
    }),
    // Actions: trend chart + comments
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
  ];

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
    <DataGrid
      table={table}
      recordCount={items.length}
      tableLayout={{ headerSticky: true, dense: true, rowBorder: true }}
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
