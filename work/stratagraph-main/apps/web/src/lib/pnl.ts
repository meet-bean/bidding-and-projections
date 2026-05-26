import type { ProjectionProject, ProjectionItem, FinancialSummaryMonth } from '@repo/projections';
import type { Invoice, Job, Bid, ServiceCatalogItem, Customer } from './types';

export interface PnlProject {
  id: string;
  name: string;
  customer: string;
  months: FinancialSummaryMonth[];
  originalBid: { revenue: number; cost: number; profit: number; gpPct: number } | null;
  totals: { revenue: number; cost: number; profit: number; gpPct: number };
}

export interface PnlPortfolio {
  projects: PnlProject[];
  totals: { revenue: number; cost: number; profit: number; gpPct: number };
  months: FinancialSummaryMonth[];
  originalBid: { revenue: number; cost: number; profit: number; gpPct: number } | null;
}

export interface CostBreakdown {
  type: string;
  amount: number;
  percentage: number;
}

function computeGpPct(revenue: number, cost: number): number {
  return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
}

export function buildPnlProject(project: ProjectionProject): PnlProject | null {
  if (!project.financials || project.financials.months.length === 0) return null;

  const { months, originalBid } = project.financials;
  const revenue = months.reduce((sum, m) => sum + m.revenue, 0);
  const cost = months.reduce((sum, m) => sum + m.cost, 0);
  const profit = revenue - cost;

  return {
    id: project.id,
    name: project.name,
    customer: project.customer,
    months,
    originalBid,
    totals: { revenue, cost, profit, gpPct: computeGpPct(revenue, cost) },
  };
}

export function buildPnlPortfolio(projects: ProjectionProject[]): PnlPortfolio {
  const pnlProjects: PnlProject[] = [];
  for (const p of projects) {
    const pnl = buildPnlProject(p);
    if (pnl) pnlProjects.push(pnl);
  }

  pnlProjects.sort((a, b) => b.totals.revenue - a.totals.revenue);

  const revenue = pnlProjects.reduce((s, p) => s + p.totals.revenue, 0);
  const cost = pnlProjects.reduce((s, p) => s + p.totals.cost, 0);
  const profit = revenue - cost;

  const monthMap = new Map<string, FinancialSummaryMonth>();
  for (const p of pnlProjects) {
    for (const m of p.months) {
      const existing = monthMap.get(m.date);
      if (existing) {
        existing.revenue += m.revenue;
        existing.cost += m.cost;
        existing.profit = existing.revenue - existing.cost;
        existing.gpPct = computeGpPct(existing.revenue, existing.cost);
      } else {
        monthMap.set(m.date, { ...m });
      }
    }
  }
  const months = Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  let originalBid: PnlPortfolio['originalBid'] = null;
  const bids = pnlProjects.filter((p) => p.originalBid);
  if (bids.length > 0) {
    const bidRev = bids.reduce((s, p) => s + p.originalBid!.revenue, 0);
    const bidCost = bids.reduce((s, p) => s + p.originalBid!.cost, 0);
    const bidProfit = bidRev - bidCost;
    originalBid = { revenue: bidRev, cost: bidCost, profit: bidProfit, gpPct: computeGpPct(bidRev, bidCost) };
  }

  return {
    projects: pnlProjects,
    totals: { revenue, cost, profit, gpPct: computeGpPct(revenue, cost) },
    months,
    originalBid,
  };
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function buildStratagraphPnl(
  invoices: Invoice[],
  jobs: Job[],
  bids: Bid[],
  catalog: ServiceCatalogItem[],
  customers?: Customer[]
): PnlProject[] {
  const sent = invoices.filter((inv) => inv.status !== 'draft');
  if (sent.length === 0) return [];

  const byProject = new Map<string, Invoice[]>();
  for (const inv of sent) {
    const list = byProject.get(inv.projectId) ?? [];
    list.push(inv);
    byProject.set(inv.projectId, list);
  }

  const result: PnlProject[] = [];

  for (const [projectId, projInvoices] of byProject) {
    const job = jobs.find((j) => j.id === projectId);

    const revenueByMonth = new Map<string, number>();
    for (const inv of projInvoices) {
      const mk = monthKey(inv.rangeStart);
      revenueByMonth.set(mk, (revenueByMonth.get(mk) ?? 0) + inv.totalUsd);
    }

    const costByMonth = new Map<string, number>();
    if (job) {
      const bid = bids.find((b) => b.id === job.bidId);
      if (bid) {
        for (const run of job.serviceRuns) {
          const li = bid.lineItems.find((l) => {
            const cat = catalog.find((c) => c.id === l.catalogItemId);
            return cat?.dailyCode === run.code;
          });
          if (!li) continue;
          const start = new Date(run.startDate + 'T00:00:00');
          const end = run.endDate ? new Date(run.endDate + 'T00:00:00') : new Date();
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
            costByMonth.set(mk, (costByMonth.get(mk) ?? 0) + li.rate);
          }
        }
      }
    }

    const allMonths = new Set([...revenueByMonth.keys(), ...costByMonth.keys()]);
    const months: FinancialSummaryMonth[] = Array.from(allMonths)
      .sort()
      .map((mk) => {
        const rev = revenueByMonth.get(mk) ?? 0;
        const c = costByMonth.get(mk) ?? 0;
        return { date: mk, revenue: rev, cost: c, profit: rev - c, gpPct: computeGpPct(rev, c) };
      });

    const totalRev = months.reduce((s, m) => s + m.revenue, 0);
    const totalCost = months.reduce((s, m) => s + m.cost, 0);
    const customerName =
      job && customers ? (customers.find((c) => c.id === job.customerId)?.name ?? '') : '';

    result.push({
      id: projectId,
      name: job?.wellName ?? projectId,
      customer: customerName,
      months,
      originalBid: null,
      totals: {
        revenue: totalRev,
        cost: totalCost,
        profit: totalRev - totalCost,
        gpPct: computeGpPct(totalRev, totalCost),
      },
    });
  }

  return result.sort((a, b) => b.totals.revenue - a.totals.revenue);
}

export interface PnlAlert {
  type: 'low-gp' | 'declining-gp' | 'over-bid';
  message: string;
  severity: 'high' | 'medium';
}

export function getPnlAlerts(project: PnlProject): PnlAlert[] {
  const alerts: PnlAlert[] = [];

  if (project.totals.gpPct < 8 && project.totals.revenue > 0) {
    alerts.push({
      type: 'low-gp',
      message: `GP% at ${project.totals.gpPct.toFixed(1)}% (below 8% threshold)`,
      severity: 'high',
    });
  }

  const months = project.months;
  if (months.length >= 3) {
    let consecutiveDeclines = 0;
    for (let i = 1; i < months.length; i++) {
      if (months[i].gpPct < months[i - 1].gpPct) {
        consecutiveDeclines++;
        if (consecutiveDeclines >= 2) {
          alerts.push({
            type: 'declining-gp',
            message: `GP% declining for ${consecutiveDeclines + 1} consecutive months`,
            severity: 'medium',
          });
          break;
        }
      } else {
        consecutiveDeclines = 0;
      }
    }
  }

  if (project.originalBid && project.originalBid.cost > 0) {
    const overrun =
      (project.totals.cost - project.originalBid.cost) / project.originalBid.cost;
    if (overrun > 0.1) {
      alerts.push({
        type: 'over-bid',
        message: `Cost ${(overrun * 100).toFixed(0)}% over bid estimate`,
        severity: 'high',
      });
    }
  }

  return alerts;
}

const COST_TYPE_LABELS: Record<string, string> = {
  '2Labor': 'Labor',
  '3Material': 'Material',
  '4Rental': 'Equipment',
  '5SubCont': 'Subcontract',
  '6OtherJC': 'Other',
  '8Parts': 'Material',
  '9Owned': 'Equipment',
  '10Health': 'Labor',
  '11Fuel': 'Equipment',
};

function costTypeLabel(raw: string): string {
  return COST_TYPE_LABELS[raw] ?? 'Other';
}

export function buildCostBreakdown(items: ProjectionItem[]): CostBreakdown[] {
  if (items.length === 0) return [];

  const groups = new Map<string, number>();
  for (const item of items) {
    const label = costTypeLabel(item.keyParts[1] ?? '');
    groups.set(label, (groups.get(label) ?? 0) + item.F.cost);
  }

  const total = Array.from(groups.values()).reduce((s, v) => s + v, 0);
  return Array.from(groups.entries())
    .map(([type, amount]) => ({
      type,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
