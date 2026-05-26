import type { ProjectionProject, ProjectionItem, FinancialSummaryMonth } from '@repo/projections';

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
