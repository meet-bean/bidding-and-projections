import type { ProjectionProject, ProjectionItem, FinancialSummaryMonth } from '@repo/projections';
import type { Invoice, Job, Bid, ServiceCatalogItem, Customer } from './types';
import { COST_TYPES, costTypeLabel, type CostType } from './cost-types';
export { COST_TYPES, type CostType } from './cost-types';

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
          const li = bid.services.find((l) => {
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
      if (months[i]!.gpPct < months[i - 1]!.gpPct) {
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

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/** One month of cost split by type. `month` is a short label; keys are cost types. */
export interface CostCompositionPoint {
  month: string;
  Labor: number;
  Material: number;
  Equipment: number;
  Subcontract: number;
  Other: number;
}

function emptyComposition(month: string): CostCompositionPoint {
  return { month, Labor: 0, Material: 0, Equipment: 0, Subcontract: 0, Other: 0 };
}

/**
 * Cumulative cost-to-date by cost type at each saved version (snapshot).
 * Each version is a monthly projection; CTD.cost is cost incurred to that point.
 * Returns one point per version, in chronological order.
 */
export function buildCostCompositionSeries(project: ProjectionProject): CostCompositionPoint[] {
  const versions = [...project.versions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (versions.length === 0) return [];

  return versions.map((v) => {
    const point = emptyComposition(monthLabel(v.createdAt));
    for (const item of v.items) {
      const type = costTypeLabel(item.keyParts[1] ?? '') as CostType;
      point[type] += item.CTD.cost;
    }
    return point;
  });
}

/** Portfolio-wide cost composition: sum each project's CTD-by-type, keyed by month. */
export function buildPortfolioCostComposition(projects: ProjectionProject[]): CostCompositionPoint[] {
  const byMonth = new Map<string, CostCompositionPoint>();
  // Map each short label back to a sortable YYYY-MM key (first one wins).
  const sortKey = new Map<string, string>();

  for (const project of projects) {
    for (const v of project.versions) {
      const label = monthLabel(v.createdAt);
      if (!sortKey.has(label)) sortKey.set(label, v.createdAt.slice(0, 7));
      const point = byMonth.get(label) ?? emptyComposition(label);
      for (const item of v.items) {
        const type = costTypeLabel(item.keyParts[1] ?? '') as CostType;
        point[type] += item.CTD.cost;
      }
      byMonth.set(label, point);
    }
  }

  return Array.from(byMonth.values()).sort(
    (a, b) => (sortKey.get(a.month) ?? '').localeCompare(sortKey.get(b.month) ?? '')
  );
}

/** Bid (Est) vs current forecast (F) cost, grouped by cost type. */
export interface BidVsActualByType {
  type: CostType;
  bid: number;
  actual: number;
}

export function buildBidVsActualByType(items: ProjectionItem[]): BidVsActualByType[] {
  if (items.length === 0) return [];
  const bid = new Map<string, number>();
  const actual = new Map<string, number>();
  for (const item of items) {
    const type = costTypeLabel(item.keyParts[1] ?? '');
    bid.set(type, (bid.get(type) ?? 0) + item.Est.cost);
    actual.set(type, (actual.get(type) ?? 0) + item.F.cost);
  }
  return COST_TYPES.filter((t) => (bid.get(t) ?? 0) > 0 || (actual.get(t) ?? 0) > 0).map((type) => ({
    type,
    bid: bid.get(type) ?? 0,
    actual: actual.get(type) ?? 0,
  }));
}

/**
 * Waterfall steps from revenue down through each cost type to profit.
 * `base` is the invisible offset for a floating bar; `span` is its height.
 */
export interface WaterfallStep {
  name: string;
  /** Signed contribution: revenue positive, costs negative, profit is the result. */
  amount: number;
  base: number;
  span: number;
  kind: 'total' | 'cost';
}

/**
 * Revenue → costs → profit, reconciled to the P&L.
 *
 * `revenue` and `totalCost` are the financial-summary headline figures (the
 * same numbers in the KPI cards), so the waterfall always ends on the real
 * profit. `breakdown` only supplies the *proportions* used to split totalCost
 * by type — its raw line-item amounts live on a different scale and would not
 * reconcile to the summary. If no breakdown is available, cost shows as one bar.
 */
export function buildWaterfall(
  revenue: number,
  totalCost: number,
  breakdown: CostBreakdown[]
): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  steps.push({ name: 'Revenue', amount: revenue, base: 0, span: revenue, kind: 'total' });

  const breakdownTotal = breakdown.reduce((s, c) => s + c.amount, 0);
  const slices =
    breakdownTotal > 0
      ? breakdown.map((c) => ({ type: c.type, amount: (c.amount / breakdownTotal) * totalCost }))
      : [{ type: 'Cost', amount: totalCost }];

  let running = revenue;
  for (const slice of slices) {
    const start = running - slice.amount;
    steps.push({
      name: slice.type,
      amount: -slice.amount,
      base: Math.min(start, running),
      span: Math.abs(slice.amount),
      kind: 'cost',
    });
    running = start;
  }

  steps.push({
    name: 'Profit',
    amount: running,
    base: Math.min(0, running),
    span: Math.abs(running),
    kind: 'total',
  });
  return steps;
}
