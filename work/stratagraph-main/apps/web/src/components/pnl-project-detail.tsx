import { useMemo } from 'react';
import { Card, CardContent, cn } from '@repo/ui';
import { formatCurrency } from '@repo/projections';
import type { ProjectionProject } from '@repo/projections';
import { buildPnlProject, buildCostBreakdown } from '~/lib/pnl';
import type { PnlProject, CostBreakdown } from '~/lib/pnl';
import { PnlTrendChart } from './pnl-trend-chart';

interface PnlProjectDetailProps {
  project: ProjectionProject;
  pnlOverride?: PnlProject;
  onBack: () => void;
}

export function PnlProjectDetail({ project, pnlOverride, onBack }: PnlProjectDetailProps) {
  const pnl = pnlOverride ?? buildPnlProject(project);

  const costBreakdown: CostBreakdown[] = useMemo(() => {
    const activeVersion = project.draft ?? project.versions[project.versions.length - 1];
    if (!activeVersion) return [];
    return buildCostBreakdown(activeVersion.items);
  }, [project]);

  if (!pnl) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline">
          ← Back to Portfolio
        </button>
        <p className="text-muted-foreground text-sm">No financial data for this project.</p>
      </div>
    );
  }

  const { totals, originalBid } = pnl;
  const gpDelta = originalBid ? totals.gpPct - originalBid.gpPct : null;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline">
        ← Back to Portfolio
      </button>

      {/* 5 KPI cards */}
      <div className="grid gap-3 sm:grid-cols-5">
        <DetailKpi label="Revenue" value={formatCurrency(totals.revenue)} />
        <DetailKpi label="Cost" value={formatCurrency(totals.cost)} />
        <DetailKpi
          label="Profit"
          value={formatCurrency(totals.profit)}
          tone={totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <DetailKpi
          label="GP%"
          value={`${totals.gpPct.toFixed(1)}%`}
          hint={
            gpDelta !== null ? (
              <span className={gpDelta >= 0 ? 'text-green-600' : 'text-red-600'}>
                {gpDelta >= 0 ? '▲' : '▼'} {Math.abs(gpDelta).toFixed(1)}% vs bid
              </span>
            ) : undefined
          }
        />
        {originalBid ? (
          <DetailKpi
            label="Bid GP%"
            value={`${originalBid.gpPct.toFixed(1)}%`}
            hint="Original target"
            className="border-amber-200 bg-amber-50/50"
          />
        ) : (
          <DetailKpi label="Bid GP%" value="—" hint="No bid data" />
        )}
      </div>

      {/* Trend chart */}
      <PnlTrendChart months={pnl.months} />

      {/* Two-panel layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly P&L table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly P&L
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium">Month</th>
                  <th className="px-4 py-2 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                  <th className="px-4 py-2 text-right font-medium">Profit</th>
                  <th className="px-4 py-2 text-right font-medium">GP%</th>
                </tr>
              </thead>
              <tbody>
                {pnl.months.map((m) => (
                  <tr key={m.date} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(m.cost)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-2 text-right tabular-nums',
                        m.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(m.profit)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.gpPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Cost-type breakdown */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cost by Type {costBreakdown.length > 0 ? '(Latest Forecast)' : ''}
            </div>
            {costBreakdown.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No cost-type data available.
              </div>
            ) : (
              <div className="divide-y">
                {costBreakdown.map((cb) => (
                  <div key={cb.type} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm">{cb.type}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(cb.amount)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        ({cb.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailKpi({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="py-3">
        <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          {label}
        </div>
        <div className={cn('mt-0.5 text-xl font-bold tracking-tight tabular-nums', tone)}>
          {value}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
