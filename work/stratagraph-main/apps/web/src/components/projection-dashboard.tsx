'use client';

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@repo/ui';
import { formatCurrency, computeAlerts } from '@repo/projections';
import type { ProjectionProject, ProjectionAlert } from '@repo/projections';
import { ProjectionFinancialChart } from './projection-financial-chart';
import { useStore } from '~/lib/store';

interface DashboardProps {
  projects: ProjectionProject[];
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  accent,
  warn,
  bad,
  good,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
  bad?: boolean;
  good?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? 'border-primary bg-primary/5' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          warn
            ? 'text-warning'
            : bad
              ? 'text-destructive'
              : good
                ? 'text-success'
                : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function ProjectionDashboard({ projects }: DashboardProps) {
  const navigate = useNavigate();
  const varianceThresholdPct = useStore((s) => s.varianceThresholdPct);

  const metrics = useMemo(() => {
    let totalForecast = 0;
    let totalCTD = 0;
    let totalEst = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let highAlerts = 0;
    let mediumAlerts = 0;
    let infoAlerts = 0;
    const allAlerts: { alert: ProjectionAlert; projectId: string }[] = [];

    for (const p of projects) {
      const latest = p.versions.at(-1);
      if (!latest) continue;
      totalForecast += latest.items.reduce((s, it) => s + it.F.cost, 0);
      totalCTD += latest.items.reduce((s, it) => s + it.CTD.cost, 0);
      totalEst += latest.items.reduce((s, it) => s + it.Est.cost, 0);
      if (p.financials) {
        const lastMonth = p.financials.months.at(-1);
        if (lastMonth) {
          totalRevenue += lastMonth.revenue;
          totalProfit += lastMonth.profit;
        }
      }
      const alerts = computeAlerts(p, varianceThresholdPct);
      for (const a of alerts.open) {
        if (a.severity === 'high') highAlerts++;
        else if (a.severity === 'medium') mediumAlerts++;
        else infoAlerts++;
        allAlerts.push({ alert: a, projectId: p.id });
      }
    }

    const pctSpent = totalForecast > 0 ? (totalCTD / totalForecast) * 100 : 0;
    const vsBid = totalEst > 0 ? ((totalForecast - totalEst) / totalEst) * 100 : null;
    const gpPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

    return {
      totalForecast,
      totalCTD,
      pctSpent,
      vsBid,
      totalRevenue,
      gpPct,
      highAlerts,
      mediumAlerts,
      infoAlerts,
      allAlerts,
    };
  }, [projects, varianceThresholdPct]);

  const totalAlerts = metrics.highAlerts + metrics.mediumAlerts + metrics.infoAlerts;

  return (
    <div className="space-y-6 p-4">
      {/* KPI cards */}
      <div className="grid grid-cols-6 gap-3">
        <KpiCard
          label="Total Forecast"
          value={formatCurrency(metrics.totalForecast)}
          accent
        />
        <KpiCard label="Cost to Date" value={formatCurrency(metrics.totalCTD)} />
        <KpiCard
          label="% Spent"
          value={`${metrics.pctSpent.toFixed(1)}%`}
          warn={metrics.pctSpent > 90}
        />
        <KpiCard
          label="vs Original Bid"
          value={
            metrics.vsBid != null
              ? `${metrics.vsBid >= 0 ? '+' : ''}${metrics.vsBid.toFixed(1)}%`
              : '--'
          }
          bad={metrics.vsBid != null && metrics.vsBid > 0}
          good={metrics.vsBid != null && metrics.vsBid <= 0}
        />
        <KpiCard
          label="Revenue"
          value={metrics.totalRevenue > 0 ? formatCurrency(metrics.totalRevenue) : '--'}
        />
        <KpiCard
          label="Gross Profit %"
          value={metrics.gpPct != null ? `${metrics.gpPct.toFixed(1)}%` : '--'}
        />
      </div>

      {/* Risk + Alerts + Health */}
      <div className="grid grid-cols-3 gap-4">
        {/* Risk distribution card */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Risk Distribution</h3>
          <div className="flex h-5 overflow-hidden rounded-full">
            {metrics.highAlerts > 0 && (
              <div className="bg-destructive" style={{ flex: metrics.highAlerts }} />
            )}
            {metrics.mediumAlerts > 0 && (
              <div className="bg-warning" style={{ flex: metrics.mediumAlerts }} />
            )}
            {metrics.infoAlerts > 0 && (
              <div className="bg-success" style={{ flex: metrics.infoAlerts }} />
            )}
            {totalAlerts === 0 && <div className="bg-muted flex-1" />}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-destructive">High: {metrics.highAlerts}</span>
            <span className="text-warning">Medium: {metrics.mediumAlerts}</span>
            <span className="text-success">Low: {metrics.infoAlerts}</span>
          </div>
        </div>

        {/* Open alerts card */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Open Alerts</h3>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {metrics.allAlerts.slice(0, 8).map((a, i) => (
              <button
                key={i}
                className="w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
                onClick={() =>
                  navigate({
                    to: '/projections/$projectId',
                    params: { projectId: a.projectId },
                  })
                }
              >
                <Badge
                  variant={
                    a.alert.severity === 'high'
                      ? 'destructive'
                      : a.alert.severity === 'medium'
                        ? 'warning'
                        : 'secondary'
                  }
                  size="sm"
                  className="mr-1.5"
                >
                  {a.alert.severity}
                </Badge>
                {a.alert.title}
              </button>
            ))}
            {metrics.allAlerts.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">No open alerts</p>
            )}
          </div>
        </div>

        {/* Project health card */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Project Health</h3>
          <div className="space-y-2">
            {projects.map((p) => {
              const latest = p.versions.at(-1);
              const forecast = latest?.items.reduce((s, it) => s + it.F.cost, 0) ?? 0;
              const ctd = latest?.items.reduce((s, it) => s + it.CTD.cost, 0) ?? 0;
              const pct = forecast > 0 ? (ctd / forecast) * 100 : 0;
              const alerts = computeAlerts(p, varianceThresholdPct);
              return (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/50"
                  onClick={() =>
                    navigate({
                      to: '/projections/$projectId',
                      params: { projectId: p.id },
                    })
                  }
                >
                  <span className="w-16 shrink-0 text-right font-mono text-muted-foreground">
                    {p.jobNumber}
                  </span>
                  <span className="flex-1 truncate text-left font-medium">{p.name}</span>
                  <span className="shrink-0 tabular-nums">{formatCurrency(forecast)}</span>
                  {alerts.open.length > 0 && (
                    <Badge variant="destructive" size="sm">
                      {alerts.open.length}
                    </Badge>
                  )}
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          pct > 95
                            ? 'bg-destructive'
                            : pct > 80
                              ? 'bg-warning'
                              : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
            {projects.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">No projects</p>
            )}
          </div>
        </div>
      </div>

      {/* Financial charts per project (2+ versions) */}
      {projects
        .filter((p) => p.versions.length >= 2)
        .map((p) => (
          <div key={p.id} className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">{p.name} — Rate Trends</h3>
            <ProjectionFinancialChart project={p} />
          </div>
        ))}
    </div>
  );
}
