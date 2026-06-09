'use client';

import { useMemo } from 'react';
import {
  Button,
  SearchInput,
  Filters,
  type Filter,
  type FilterFieldConfig,
} from '@repo/ui';
import { Download, X } from 'lucide-react';
import { ColumnPicker, type ColumnVisibility } from './projection-column-picker';
import type { ProjectionItem, AlertsResult, MetricsCatalog } from '@repo/projections';
import { COST_TYPES, VARIANCE_THRESHOLD_PCT } from '@repo/projections';

/** A single active filter, using the shared @repo/ui Filter shape. */
export type ProjectionFilter = Filter<string>;

interface ProjectionToolbarProps {
  items: ProjectionItem[];
  filters: ProjectionFilter[];
  onFiltersChange: (filters: ProjectionFilter[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  catalog: MetricsCatalog;
  columnVis: ColumnVisibility;
  onToggleColumn: (key: string) => void;
  onSetColumns: (ids: string[], value: boolean) => void;
  onResetColumns: () => void;
  activeColumnCount: number;
  onExport: () => void;
}

/** Status presets — computed predicates, surfaced as a multiselect filter field. */
const STATUS_DEFS: { id: string; label: string }[] = [
  { id: 'variance', label: 'Variance ≥5%' },
  { id: 'high-risk', label: 'High Risk' },
  { id: 'new', label: 'New' },
  { id: 'stale', label: 'Stale' },
  { id: 'with-notes', label: 'With Notes' },
];

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

/**
 * Apply the active filter chips to the item list. Filters of the same field are
 * OR'd within the field (`is any of`); different fields are AND'd together —
 * matching the platform `Filters` semantics used elsewhere (e.g. the metrics
 * page via DataListShell).
 */
export function applyProjectionFilters(
  items: ProjectionItem[],
  filters: ProjectionFilter[],
  alerts: AlertsResult,
  commentCounts: Map<string, number>,
): ProjectionItem[] {
  if (filters.length === 0) return items;

  // Precompute the high-risk key set once (avoids an O(items × alerts) scan).
  const highRiskKeys = new Set(
    alerts.open.filter((a) => a.severity === 'high').map((a) => a.key),
  );

  const matchesStatus = (it: ProjectionItem, status: string): boolean => {
    switch (status) {
      case 'variance': {
        const pct = it.prevForecast
          ? Math.abs(((it.F.cost - it.prevForecast) / it.prevForecast) * 100)
          : 0;
        return pct >= VARIANCE_THRESHOLD_PCT;
      }
      case 'high-risk':
        return highRiskKeys.has(it.lineKey);
      case 'new':
        return it.isNew;
      case 'stale':
        return it.stale;
      case 'with-notes':
        return (commentCounts.get(it.lineKey) ?? 0) > 0;
      default:
        return true;
    }
  };

  let result = items;
  for (const f of filters) {
    if (!f.values || f.values.length === 0) continue;
    if (f.field === 'status') {
      result = result.filter((it) => f.values!.some((v) => matchesStatus(it, v)));
    } else if (f.field === 'costType') {
      result = result.filter((it) => f.values!.includes(it.keyParts[1] ?? ''));
    }
  }
  return result;
}

export function ProjectionToolbar({
  items,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  catalog,
  columnVis,
  onToggleColumn,
  onSetColumns,
  onResetColumns,
  activeColumnCount,
  onExport,
}: ProjectionToolbarProps) {
  // Only offer cost types that actually appear in the data.
  const presentCostTypes = useMemo(() => {
    const present = new Set(items.map((it) => it.keyParts[1] ?? ''));
    return COST_TYPES.filter((ct) => present.has(ct));
  }, [items]);

  const fields: FilterFieldConfig<string>[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'multiselect',
        options: STATUS_DEFS.map((s) => ({ value: s.id, label: s.label })),
        operators: [{ value: 'is_any_of', label: 'is' }],
        defaultOperator: 'is_any_of',
      },
      {
        key: 'costType',
        label: 'Cost Type',
        type: 'multiselect',
        options: presentCostTypes.map((ct) => ({ value: ct, label: ct })),
        operators: [{ value: 'is_any_of', label: 'is' }],
        defaultOperator: 'is_any_of',
      },
    ],
    [presentCostTypes],
  );

  const hasFilters = filters.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search phase, description..."
        onClear={() => onSearchChange('')}
        className="w-64"
        size="sm"
      />
      <Filters<string>
        filters={filters}
        fields={fields}
        onChange={onFiltersChange}
        size="sm"
        radius="md"
      />
      <ColumnPicker
        catalog={catalog}
        vis={columnVis}
        onToggle={onToggleColumn}
        onSetGroup={onSetColumns}
        onReset={onResetColumns}
        activeCount={activeColumnCount}
      />
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange([])}
          className="text-muted-foreground"
        >
          <X />
          Clear
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5">
          <Download className="size-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
