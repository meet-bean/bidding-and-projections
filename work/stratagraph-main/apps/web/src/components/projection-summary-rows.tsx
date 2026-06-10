'use client';

import { useMemo } from 'react';
import {
  createColumnHelper,
  MinimalDataGrid,
  MINIMAL_GRID_HEADER_LABEL,
  DataGridColumnHeader,
  getCoreRowModel,
  useReactTable,
  cn,
} from '@repo/ui';
import { formatCurrency } from '@repo/projections';
import type { SummaryRow, SummaryResult } from '@repo/projections';

interface ProjectionSummaryRowsProps {
  summary: SummaryResult;
}

/** Summary row plus a flag for the appended grand-total line. */
type Line = SummaryRow & { isTotal?: boolean };

const helper = createColumnHelper<Line>();

function numCell(value: string, isTotal: boolean | undefined) {
  return (
    <div
      className={cn(
        'text-right text-sm tabular-nums',
        isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground',
      )}
    >
      {value}
    </div>
  );
}

/** $-cost column for one slice of the summary (CTP/CTD/CTC/F/Est). */
function costColumn(id: string, title: string, pick: (row: Line) => number) {
  return helper.accessor((row) => pick(row), {
    id,
    header: ({ column }) => (
      <div className="flex w-full justify-end">
        <DataGridColumnHeader column={column} title={title} className={MINIMAL_GRID_HEADER_LABEL} />
      </div>
    ),
    cell: ({ row }) => numCell(formatCurrency(pick(row.original)), row.original.isTotal),
    size: 130,
  });
}

/**
 * Per-cost-type rollup under the projection table, on the same MinimalDataGrid
 * shell as everything else: monochrome (no cost-type colors), horizontal lines
 * only, micro headers. The grand total renders as the final, semibold row.
 */
export function ProjectionSummaryRows({ summary }: ProjectionSummaryRowsProps) {
  const data = useMemo<Line[]>(
    () => [...summary.summaryRows, { ...summary.grand, isTotal: true }],
    [summary],
  );

  const columns = useMemo(
    () => [
      helper.accessor('costType', {
        id: 'costType',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Cost Type" className={MINIMAL_GRID_HEADER_LABEL} />
        ),
        cell: ({ row, getValue }) => (
          <span className={cn('text-sm', row.original.isTotal && 'font-semibold')}>{getValue()}</span>
        ),
        size: 140,
      }),
      helper.accessor('count', {
        id: 'items',
        header: ({ column }) => (
          <div className="flex w-full justify-end">
            <DataGridColumnHeader column={column} title="Items" className={MINIMAL_GRID_HEADER_LABEL} />
          </div>
        ),
        cell: ({ row, getValue }) => numCell(String(getValue()), row.original.isTotal),
        size: 70,
      }),
      costColumn('ctp', 'CTP Cost', (r) => r.CTP.cost),
      costColumn('ctd', 'CTD Cost', (r) => r.CTD.cost),
      costColumn('ctc', 'CTC Cost', (r) => r.CTC.cost),
      costColumn('f', 'Forecast', (r) => r.F.cost),
      costColumn('est', 'Estimate', (r) => r.Est.cost),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.costType,
    enableSorting: false,
  });

  return (
    <section className="space-y-2 pt-4">
      <h2 className="text-sm font-semibold">Summary by Cost Type</h2>
      <MinimalDataGrid
        table={table}
        recordCount={data.length}
        tableLayout={{ headerSticky: false }}
      />
    </section>
  );
}
