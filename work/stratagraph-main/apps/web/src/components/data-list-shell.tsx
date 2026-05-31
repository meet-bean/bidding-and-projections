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
  DataGrid,
  DataGridColumnHeader,
  DataGridContainer,
  DataGridTable,
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@repo/ui';
import { X } from 'lucide-react';

export interface FilterDef {
  /** Key matches a top-level field on the row data. */
  id: string;
  label: string;
  options: { value: string; label: string }[];
  customRenderer?: (props: CustomRendererProps<string>) => React.ReactNode;
}

export interface DataListShellProps<TRow extends { id: string }> {
  data: TRow[];
  columns: ColumnDef<TRow, unknown>[];
  searchPlaceholder?: string;
  searchableKeys?: (keyof TRow)[];
  filters?: FilterDef[];
  onRowClick?: (row: TRow) => void;
  onRowDoubleClick?: (row: TRow) => void;
  emptyMessage?: string;
  actions?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  defaultPageSize?: number;
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
  actions,
  toolbarExtra,
  defaultPageSize = 25,
}: DataListShellProps<TRow>) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageIndex, setPageIndex] = useState(0);
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
    onSortingChange: setSorting,
    state: {
      sorting,
      pagination: { pageIndex, pageSize: defaultPageSize },
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          onClear={() => setSearch('')}
          className="w-64"
          // @ts-expect-error size variant
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
            size="sm"
            onClick={() => setActiveFilters([])}
            className="text-muted-foreground"
          >
            <X />
            Clear
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>

      <DataGrid
        table={table}
        recordCount={filteredData.length}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
        onRowDoubleClick={onRowDoubleClick ? (row) => onRowDoubleClick(row) : undefined}
        tableLayout={{ rowBorder: true, headerBorder: true, headerBackground: true }}
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      {filteredData.length > defaultPageSize ? (
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <div>
            Showing {pageIndex * defaultPageSize + 1}–
            {Math.min((pageIndex + 1) * defaultPageSize, filteredData.length)} of{' '}
            {filteredData.length}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
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
