import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  Button,
  SearchInput,
  Filters,
  type Filter,
  type FilterFieldConfig,
  type CustomRendererProps,
  createColumnHelper,
  MinimalDataGrid,
  MINIMAL_GRID_HEADER_LABEL,
  DataGridColumnHeader as BaseDataGridColumnHeader,
  type DataGridColumnHeaderProps,
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  type SortingState,
  type ExpandedState,
  cn,
} from '@repo/ui';
import { X } from 'lucide-react';

/**
 * Platform column header: every list page imports DataGridColumnHeader from
 * this file, so wrapping it here applies the minimal micro-label treatment
 * (tiny, semibold, tracked-out, muted) across the whole platform at once.
 */
function DataGridColumnHeader<TData, TValue>({ className, ...props }: DataGridColumnHeaderProps<TData, TValue>) {
  return <BaseDataGridColumnHeader {...props} className={cn(MINIMAL_GRID_HEADER_LABEL, className)} />;
}

export interface FilterDef {
  /** Key matches a top-level field on the row data. */
  id: string;
  label: string;
  options: { value: string; label: string }[];
  customRenderer?: (props: CustomRendererProps<string>) => React.ReactNode;
}

export interface DataListShellProps<TRow extends { id: string }> {
  data: TRow[];
  // Columns come from createColumnHelper<TRow>() in each page, where accessors
  // infer concrete value types (Region, string, enums). ColumnDef is invariant
  // in its value generic, so `unknown` rejects them; `any` is the idiomatic
  // TanStack type for a heterogeneous column array.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TRow, any>[];
  searchPlaceholder?: string;
  searchableKeys?: (keyof TRow)[];
  filters?: FilterDef[];
  onRowClick?: (row: TRow) => void;
  onRowDoubleClick?: (row: TRow) => void;
  emptyMessage?: string;
  /** Optional action rendered under the empty message (e.g. a "New X" button). */
  emptyAction?: React.ReactNode;
  /**
   * Noun for the quiet count line above the toolbar ("352 services"). The count
   * reflects the FILTERED set so it doubles as search/filter feedback.
   */
  countLabel?: string;
  actions?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  defaultPageSize?: number;
  /**
   * Opt-in inline row expansion. When true, a row click toggles its expanded
   * state instead of firing onRowClick, and the grid renders that column's
   * `meta.expandedContent` underneath. Off by default — other tables unaffected.
   */
  expandable?: boolean;
}

export function DataListShell<TRow extends { id: string }>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  searchableKeys,
  filters: filterDefs = [],
  onRowClick,
  onRowDoubleClick,
  emptyMessage = 'No results found',
  emptyAction,
  countLabel,
  actions,
  toolbarExtra,
  defaultPageSize = 25,
  expandable = false,
}: DataListShellProps<TRow>) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  // Active filters using the @repo/ui Filter shape ({ id, field, operator, values }).
  const [activeFilters, setActiveFilters] = useState<Filter<string>[]>([]);

  // Build the field config that drives the Filters menu/chip UI.
  // For multiselect, the @repo/ui Filters component requires `operators` —
  // providing a single 'is' operator triggers the "implicit operator" path,
  // skipping the operator picker and going straight to the value menu.
  const filterFields: FilterFieldConfig<string>[] = useMemo(
    () =>
      filterDefs.map((f) => ({
        key: f.id,
        label: f.label,
        type: f.customRenderer ? 'custom' as const : 'multiselect' as const,
        options: f.options.map((o) => ({ value: o.value, label: o.label })),
        operators: [{ value: 'is_any_of', label: 'is' }],
        defaultOperator: 'is_any_of',
        customRenderer: f.customRenderer,
      })),
    [filterDefs]
  );

  // Client-side filtering: search + active filters.
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((row) => {
      if (q && searchableKeys) {
        const hit = searchableKeys.some((k) => {
          const v = row[k];
          return v != null && String(v).toLowerCase().includes(q);
        });
        if (!hit) return false;
      }
      for (const f of activeFilters) {
        if (!f.values || f.values.length === 0) continue;
        const cellValue = (row as Record<string, unknown>)[f.field];
        if (!f.values.includes(String(cellValue))) return false;
      }
      return true;
    });
  }, [data, search, searchableKeys, activeFilters]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(expandable
      ? { getExpandedRowModel: getExpandedRowModel(), getRowCanExpand: () => true }
      : {}),
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    state: {
      sorting,
      pagination: { pageIndex, pageSize: defaultPageSize },
      expanded,
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize: defaultPageSize })
          : updater;
      setPageIndex(next.pageIndex);
    },
    getRowId: (row) => row.id,
  });

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="space-y-4">
      {/* Quiet count line — plain header metadata, mirrors the filtered set. */}
      {countLabel ? (
        <div className="text-sm">
          <span className="font-medium tabular-nums">{filteredData.length}</span>{' '}
          <span className="text-muted-foreground">{countLabel}</span>
        </div>
      ) : null}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          onClear={() => setSearch('')}
          className="w-64"
          size="sm"
        />
        {filterDefs.length > 0 ? (
          <Filters<string>
            filters={activeFilters}
            fields={filterFields}
            onChange={(next) => {
              setActiveFilters(next);
              setPageIndex(0);
            }}
            size="sm"
            radius="md"
          />
        ) : null}
        {toolbarExtra}
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setActiveFilters([])}
            className="text-muted-foreground"
          >
            <X />
            Clear
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>

      {/* Shared minimal shell — same table language as the projections page:
          borderless, horizontal row lines only, micro headers. */}
      <MinimalDataGrid
        table={table}
        recordCount={filteredData.length}
        emptyMessage={
          emptyAction ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <span>{emptyMessage}</span>
              {emptyAction}
            </div>
          ) : (
            emptyMessage
          )
        }
        onRowClick={
          expandable
            ? (row) => table.getRow(row.id).toggleExpanded()
            : onRowClick
              ? (row) => onRowClick(row)
              : undefined
        }
        onRowDoubleClick={onRowDoubleClick ? (row) => onRowDoubleClick(row) : undefined}
      />

      {filteredData.length > defaultPageSize ? (
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <div>
            Showing {pageIndex * defaultPageSize + 1}–
            {Math.min((pageIndex + 1) * defaultPageSize, filteredData.length)} of{' '}
            {filteredData.length}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { createColumnHelper, DataGridColumnHeader };
