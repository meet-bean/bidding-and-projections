'use client';

import { cn } from '@/lib/utils';
import { DataGrid, DataGridContainer, type DataGridProps } from './data-grid';
import { DataGridTable } from './data-grid-table';

/**
 * Quiet, "Linear-style" preset on top of {@link DataGrid}.
 *
 * Visual target = the bid "Services" selector table: borderless, **horizontal
 * row lines only** (no vertical cell rules), tiny uppercase muted headers, calm
 * monochrome field with a subtle row-hover. All of DataGrid's behaviour —
 * sorting, the column-picker, expandable row detail, sticky header, horizontal
 * scroll — is preserved, because the caller still builds and owns the TanStack
 * `table`. This wrapper only bakes in the look so it's reusable across screens
 * instead of being copy-pasted styling.
 *
 * Pass `tableLayout` / `containerClassName` to override any individual choice;
 * caller values win over the preset.
 */
export interface MinimalDataGridProps<TData extends object> extends DataGridProps<TData> {
  /** Extra classes for the scroll container (merged after the preset). */
  containerClassName?: string;
  /** Draw the rounded outer border. Off by default to match the reference table. */
  outerBorder?: boolean;
}

/** Micro column-header label — tiny, semibold, tracked-out, muted. */
export const MINIMAL_GRID_HEADER_LABEL =
  'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground';

export function MinimalDataGrid<TData extends object>({
  containerClassName,
  outerBorder = false,
  tableLayout,
  children,
  ...props
}: MinimalDataGridProps<TData>) {
  return (
    <DataGrid
      {...props}
      tableLayout={{
        dense: true,
        cellBorder: false, // no vertical lines — the whole point
        rowBorder: true, // horizontal row separators only
        headerBackground: false,
        headerBorder: true, // single hairline under the header row
        headerSticky: true,
        width: 'auto',
        ...tableLayout,
      }}
    >
      <DataGridContainer
        border={outerBorder}
        className={cn(
          // !h-8 brings the dense header (h-9) down to the reference table's
          // compact header height so both tables share the same vertical rhythm.
          'overflow-x-auto [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap [&_th]:!h-8 [&_tbody_tr:hover]:bg-foreground/[0.03]',
          containerClassName,
        )}
      >
        {/* Default body is a plain DataGridTable; callers needing extra chrome
            (footer, custom empty state) can pass their own children instead. */}
        {children ?? <DataGridTable />}
      </DataGridContainer>
    </DataGrid>
  );
}
