import { useMemo } from 'react';
import { Card, CardContent, cn } from '@repo/ui';
import { formatCurrency } from '@repo/projections';
import type { ProjectionProject } from '@repo/projections';
import type { Invoice, Job, Bid, ServiceCatalogItem, Customer } from '~/lib/types';
import { buildPnlPortfolio, buildStratagraphPnl, getPnlAlerts, buildPortfolioCostComposition } from '~/lib/pnl';
import type { PnlPortfolio } from '~/lib/pnl';
import { RevenueCostChart, MarginTrendChart, BidVsActualGpChart, CostCompositionChart } from './pnl-charts';

interface PnlPortfolioViewProps {
  projectionProjects: ProjectionProject[];
  invoices: Invoice[];
  jobs: Job[];
  bids: Bid[];
  catalog: ServiceCatalogItem[];
  customers: Customer[];
  tenantId: 'superior' | 'stratagraph';
  onSelectProject: (projectId: string) => void;
}

export function PnlPortfolioView({
  projectionProjects,
  invoices,
  jobs,
  bids,
  catalog,
  customers,
  tenantId,
  onSelectProject,
}: PnlPortfolioViewProps) {
  const portfolio: PnlPortfolio = useMemo(() => {
    if (tenantId === 'superior') {
      return buildPnlPortfolio(projectionProjects);
    }
    const sgProjects = buildStratagraphPnl(invoices, jobs, bids, catalog, customers);
    const revenue = sgProjects.reduce((s, p) => s + p.totals.revenue, 0);
    const cost = sgProjects.reduce((s, p) => s + p.totals.cost, 0);
    const profit = revenue - cost;
    const gpPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

    const monthMap = new Map<string, { date: string; revenue: number; cost: number; profit: number; gpPct: number }>();
    for (const p of sgProjects) {
      for (const m of p.months) {
        const existing = monthMap.get(m.date);
        if (existing) {
          existing.revenue += m.revenue;
          existing.cost += m.cost;
          existing.profit = existing.revenue - existing.cost;
          existing.gpPct = existing.revenue > 0 ? ((existing.revenue - existing.cost) / existing.revenue) * 100 : 0;
        } else {
          monthMap.set(m.date, { ...m });
        }
      }
    }
    const months = Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      projects: sgProjects,
      totals: { revenue, cost, profit, gpPct },
      months,
      originalBid: null,
    };
  }, [projectionProjects, invoices, jobs, bids, catalog, customers, tenantId]);

  if (portfolio.projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">
          No P&L data available.{' '}
          {tenantId === 'superior'
            ? 'Upload projection financials to see P&L.'
            : 'Generate invoices to see P&L.'}
        </p>
      </div>
    );
  }

  const { totals, originalBid } = portfolio;
  const gpDelta = originalBid ? totals.gpPct - originalBid.gpPct : null;

  const costComposition = useMemo(
    () => (tenantId === 'superior' ? buildPortfolioCostComposition(projectionProjects) : []),
    [tenantId, projectionProjects]
  );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatCurrency(totals.revenue)} tone="text-green-600" />
        <KpiCard label="Total Cost" value={formatCurrency(totals.cost)} tone="text-red-600" />
        <KpiCard
          label="Gross Profit"
          value={formatCurrency(totals.profit)}
          tone={totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <KpiCard
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
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueCostChart months={portfolio.months} />
        <MarginTrendChart months={portfolio.months} bidGpPct={originalBid?.gpPct ?? null} />
      </div>

      {originalBid ? <BidVsActualGpChart projects={portfolio.projects} /> : null}

      {costComposition.length >= 2 ? <CostCompositionChart data={costComposition} /> : null}

      {/* Project table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">Profit</th>
              <th className="px-4 py-3 text-right font-medium">GP%</th>
              {tenantId === 'superior' && (
                <th className="px-4 py-3 text-right font-medium">vs Bid</th>
              )}
            </tr>
          </thead>
          <tbody>
            {portfolio.projects.map((p) => {
              const alerts = getPnlAlerts(p);
              const bidDelta = p.originalBid
                ? p.totals.gpPct - p.originalBid.gpPct
                : null;
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                  onClick={() => onSelectProject(p.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {alerts.length > 0 && (
                        <span
                          className={cn(
                            'inline-block size-2 rounded-full',
                            alerts.some((a) => a.severity === 'high')
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          )}
                          title={alerts.map((a) => a.message).join('; ')}
                        />
                      )}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-muted-foreground text-xs">{p.customer}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(p.totals.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(p.totals.cost)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right tabular-nums',
                      p.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(p.totals.profit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.totals.gpPct.toFixed(1)}%
                  </td>
                  {tenantId === 'superior' && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {bidDelta !== null ? (
                        <span
                          className={bidDelta >= 0 ? 'text-green-600' : 'text-red-600'}
                        >
                          {bidDelta >= 0 ? '▲' : '▼'} {Math.abs(bidDelta).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {label}
        </div>
        <div className={cn('mt-1 text-2xl font-bold tracking-tight tabular-nums', tone)}>
          {value}
        </div>
        {hint ? <div className="mt-1 text-xs">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
