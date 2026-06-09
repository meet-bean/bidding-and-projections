'use client';

import { Button, SearchInput } from '@repo/ui';
import { Download } from 'lucide-react';
import { ColumnPicker, type ColumnVisibility } from './projection-column-picker';
import type { ProjectionItem, AlertsResult, MetricsCatalog } from '@repo/projections';
import { COST_TYPES, VARIANCE_THRESHOLD_PCT } from '@repo/projections';

export type FilterId = 'all' | 'variance' | 'high-risk' | 'new' | 'stale' | 'with-notes';

interface ProjectionToolbarProps {
  items: ProjectionItem[];
  alerts: AlertsResult;
  commentCounts: Map<string, number>;
  activeFilter: FilterId;
  onFilterChange: (filter: FilterId) => void;
  activeCostType: string | null;
  onCostTypeChange: (ct: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  catalog: MetricsCatalog;
  columnVis: ColumnVisibility;
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  activeColumnCount: number;
  onExport: () => void;
}

const FILTER_DEFS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'variance', label: 'Variances >=5%' },
  { id: 'high-risk', label: 'High Risk' },
  { id: 'new', label: 'New' },
  { id: 'stale', label: 'Stale' },
  { id: 'with-notes', label: 'With Notes' },
];

export function filterItems(
  items: ProjectionItem[],
  filter: FilterId,
  alerts: AlertsResult,
  commentCounts: Map<string, number>,
): ProjectionItem[] {
  switch (filter) {
    case 'variance':
      return items.filter((it) => {
        const pct = it.prevForecast
          ? Math.abs(((it.F.cost - it.prevForecast) / it.prevForecast) * 100)
          : 0;
        return pct >= VARIANCE_THRESHOLD_PCT;
      });
    case 'high-risk': {
      const highKeys = new Set(alerts.open.filter((a) => a.severity === 'high').map((a) => a.key));
      return items.filter((it) => highKeys.has(it.lineKey));
    }
    case 'new':
      return items.filter((it) => it.isNew);
    case 'stale':
      return items.filter((it) => it.stale);
    case 'with-notes':
      return items.filter((it) => (commentCounts.get(it.lineKey) ?? 0) > 0);
    default:
      return items;
  }
}

export function searchItems(items: ProjectionItem[], query: string): ProjectionItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (it) =>
      (it.keyParts[0] ?? '').toLowerCase().includes(q) ||
      (it.keyParts[1] ?? '').toLowerCase().includes(q) ||
      it.label.toLowerCase().includes(q),
  );
}

function costTypeCounts(items: ProjectionItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const it of items) {
    const ct = it.keyParts[1] ?? '';
    counts.set(ct, (counts.get(ct) ?? 0) + 1);
  }
  return counts;
}

function filterCounts(
  items: ProjectionItem[],
  alerts: AlertsResult,
  commentCounts: Map<string, number>,
): Record<FilterId, number> {
  return {
    all: items.length,
    variance: filterItems(items, 'variance', alerts, commentCounts).length,
    'high-risk': filterItems(items, 'high-risk', alerts, commentCounts).length,
    new: filterItems(items, 'new', alerts, commentCounts).length,
    stale: filterItems(items, 'stale', alerts, commentCounts).length,
    'with-notes': filterItems(items, 'with-notes', alerts, commentCounts).length,
  };
}

export function ProjectionToolbar({
  items,
  alerts,
  commentCounts,
  activeFilter,
  onFilterChange,
  activeCostType,
  onCostTypeChange,
  searchQuery,
  onSearchChange,
  catalog,
  columnVis,
  onToggleColumn,
  onResetColumns,
  activeColumnCount,
  onExport,
}: ProjectionToolbarProps) {
  const counts = filterCounts(items, alerts, commentCounts);
  const ctCounts = costTypeCounts(items);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search phase, description..."
          onClear={() => onSearchChange('')}
          className="w-64"
          size="sm"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_DEFS.map((f) => (
            <button
              key={f.id}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                activeFilter === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
              {counts[f.id] > 0 && f.id !== 'all' && (
                <span className="ml-1 opacity-70">{counts[f.id]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ColumnPicker
            catalog={catalog}
            vis={columnVis}
            onToggle={onToggleColumn}
            onReset={onResetColumns}
            activeCount={activeColumnCount}
          />
          <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5">
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
            activeCostType === null
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onCostTypeChange(null)}
        >
          All <span className="ml-0.5 opacity-70">{items.length}</span>
        </button>
        {COST_TYPES.filter((ct) => ctCounts.has(ct)).map((ct) => (
          <button
            key={ct}
            className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
              activeCostType === ct
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
            style={activeCostType === ct ? { borderColor: `var(--ct-${ct.replace(/\d/g, '').toLowerCase()})` } : undefined}
            onClick={() => onCostTypeChange(activeCostType === ct ? null : ct)}
          >
            {ct} <span className="ml-0.5 opacity-70">{ctCounts.get(ct) ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
