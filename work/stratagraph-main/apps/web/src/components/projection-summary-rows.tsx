'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@repo/projections';
import type { SummaryRow, SummaryResult } from '@repo/projections';

interface ProjectionSummaryRowsProps {
  summary: SummaryResult;
}

export function ProjectionSummaryRows({ summary }: ProjectionSummaryRowsProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mt-2 rounded-lg border bg-card">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Summary by Cost Type
      </button>
      {expanded && (
        <div className="border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-3 py-1.5 text-left font-medium">Cost Type</th>
                <th className="px-3 py-1.5 text-right font-medium">Items</th>
                <th className="px-3 py-1.5 text-right font-medium">CTP Cost</th>
                <th className="px-3 py-1.5 text-right font-medium">CTD Cost</th>
                <th className="px-3 py-1.5 text-right font-medium">CTC Cost</th>
                <th className="px-3 py-1.5 text-right font-medium">Forecast</th>
                <th className="px-3 py-1.5 text-right font-medium">Estimate</th>
              </tr>
            </thead>
            <tbody>
              {summary.summaryRows.map((row) => (
                <SummaryRowLine key={row.costType} row={row} />
              ))}
              <tr className="border-t-2 font-semibold">
                <td className="px-3 py-2">{summary.grand.costType}</td>
                <td className="px-3 py-2 text-right tabular-nums">{summary.grand.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary.grand.CTP.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary.grand.CTD.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary.grand.CTC.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary.grand.F.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary.grand.Est.cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryRowLine({ row }: { row: SummaryRow }) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50">
      <td className="px-3 py-1.5">
        <span
          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
          style={{ color: `var(--ct-${row.costType.replace(/\d/g, '').toLowerCase()})` }}
        >
          {row.costType}
        </span>
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{row.count}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.CTP.cost)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.CTD.cost)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.CTC.cost)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.F.cost)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.Est.cost)}</td>
    </tr>
  );
}
