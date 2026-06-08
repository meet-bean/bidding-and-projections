import { describe, it, expect } from 'vitest';
import { buildPnlProject, buildPnlPortfolio, buildCostBreakdown, buildStratagraphPnl, getPnlAlerts } from '../pnl';
import type { PnlProject } from '../pnl';
import type { ProjectionProject, ProjectionItem, FinancialSummaryMonth, TimeSlice } from '@repo/projections';
import type { Invoice, Job, Bid, ServiceCatalogItem } from '~/lib/types';

const month = (date: string, revenue: number, cost: number): FinancialSummaryMonth => ({
  date,
  revenue,
  cost,
  profit: revenue - cost,
  gpPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
});

const fakeProject = (
  overrides: Partial<ProjectionProject> & { id: string; name: string }
): ProjectionProject =>
  ({
    jobNumber: '',
    customer: 'Test Co',
    pm: '',
    createdAt: '',
    versions: [],
    draft: null,
    comments: {},
    alertStatus: {},
    financials: null,
    ...overrides,
  }) as ProjectionProject;

describe('buildPnlProject', () => {
  it('returns null when project has no financials', () => {
    const p = fakeProject({ id: '1', name: 'Empty' });
    expect(buildPnlProject(p)).toBeNull();
  });

  it('aggregates months into totals', () => {
    const p = fakeProject({
      id: '1',
      name: 'Suncoast',
      financials: {
        months: [
          month('2026-01-01', 4200000, 3780000),
          month('2026-02-01', 5100000, 4590000),
        ],
        originalBid: { revenue: 195000000, cost: 169650000, profit: 25350000, gpPct: 13.0 },
      },
    });
    const result = buildPnlProject(p)!;
    expect(result.id).toBe('1');
    expect(result.name).toBe('Suncoast');
    expect(result.customer).toBe('Test Co');
    expect(result.months).toHaveLength(2);
    expect(result.totals.revenue).toBe(9300000);
    expect(result.totals.cost).toBe(8370000);
    expect(result.totals.profit).toBe(930000);
    expect(result.totals.gpPct).toBeCloseTo(10.0, 1);
    expect(result.originalBid).not.toBeNull();
  });

  it('handles single-month data', () => {
    const p = fakeProject({
      id: '2',
      name: 'Solo',
      financials: {
        months: [month('2026-03-01', 1000000, 900000)],
        originalBid: null,
      },
    });
    const result = buildPnlProject(p)!;
    expect(result.totals.revenue).toBe(1000000);
    expect(result.totals.gpPct).toBeCloseTo(10.0, 1);
    expect(result.originalBid).toBeNull();
  });
});

describe('buildPnlPortfolio', () => {
  it('aggregates multiple projects', () => {
    const p1 = fakeProject({
      id: '1',
      name: 'A',
      financials: {
        months: [month('2026-01-01', 4000000, 3600000)],
        originalBid: { revenue: 100000000, cost: 87000000, profit: 13000000, gpPct: 13.0 },
      },
    });
    const p2 = fakeProject({
      id: '2',
      name: 'B',
      financials: {
        months: [
          month('2026-01-01', 2000000, 1700000),
          month('2026-02-01', 3000000, 2550000),
        ],
        originalBid: null,
      },
    });
    const portfolio = buildPnlPortfolio([p1, p2]);
    expect(portfolio.projects).toHaveLength(2);
    expect(portfolio.totals.revenue).toBe(9000000);
    expect(portfolio.totals.cost).toBe(7850000);
    expect(portfolio.totals.profit).toBe(1150000);
    expect(portfolio.months).toHaveLength(2);
    expect(portfolio.months[0]!.revenue).toBe(6000000);
  });

  it('returns empty portfolio when no projects have financials', () => {
    const p = fakeProject({ id: '1', name: 'Empty' });
    const portfolio = buildPnlPortfolio([p]);
    expect(portfolio.projects).toHaveLength(0);
    expect(portfolio.totals.revenue).toBe(0);
    expect(portfolio.months).toHaveLength(0);
  });

  it('sorts projects by revenue descending', () => {
    const p1 = fakeProject({
      id: '1',
      name: 'Small',
      financials: { months: [month('2026-01-01', 1000000, 800000)], originalBid: null },
    });
    const p2 = fakeProject({
      id: '2',
      name: 'Big',
      financials: { months: [month('2026-01-01', 5000000, 4000000)], originalBid: null },
    });
    const portfolio = buildPnlPortfolio([p1, p2]);
    expect(portfolio.projects[0]!.name).toBe('Big');
    expect(portfolio.projects[1]!.name).toBe('Small');
  });
});

const ts = (cost: number): TimeSlice => ({
  qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost,
});

const fakeItem = (costType: string, forecastCost: number): ProjectionItem =>
  ({
    lineKey: `B-100-|${costType}`,
    keyParts: ['B-100-', costType],
    label: 'Test',
    unitOfMeasure: 'EA',
    CTP: ts(0),
    CTD: ts(0),
    CTC: ts(0),
    F: ts(forecastCost),
    Est: ts(0),
    estVar: 0,
    comp: 0,
    prevForecast: 0,
    calcHrs: 0,
    wsRisk: 0,
    isNew: false,
    stale: false,
  }) as ProjectionItem;

describe('buildCostBreakdown', () => {
  it('groups items by cost type', () => {
    const items = [
      fakeItem('2Labor', 500000),
      fakeItem('2Labor', 300000),
      fakeItem('3Material', 200000),
    ];
    const result = buildCostBreakdown(items);
    expect(result).toHaveLength(2);
    const labor = result.find((r) => r.type === 'Labor');
    expect(labor).toBeDefined();
    expect(labor!.amount).toBe(800000);
    expect(labor!.percentage).toBeCloseTo(80.0, 1);
    const material = result.find((r) => r.type === 'Material');
    expect(material!.amount).toBe(200000);
  });

  it('returns empty array for no items', () => {
    expect(buildCostBreakdown([])).toEqual([]);
  });

  it('handles unknown cost types as Other', () => {
    const items = [fakeItem('99Unknown', 100000)];
    const result = buildCostBreakdown(items);
    expect(result[0]!.type).toBe('Other');
  });
});

// ---------------------------------------------------------------------------
// buildStratagraphPnl
// ---------------------------------------------------------------------------

const fakeInvoice = (
  id: string,
  projectId: string,
  totalUsd: number,
  rangeStart: string,
  rangeEnd: string,
  status: 'draft' | 'sent' | 'paid' = 'sent'
): Invoice =>
  ({
    id,
    invoiceNumber: `INV-${id}`,
    projectId,
    status,
    rangeStart,
    rangeEnd,
    generatedDate: rangeEnd,
    totalUsd,
  }) as Invoice;

const fakeJob = (id: string, bidId: string): Job =>
  ({
    id,
    jobNumber: `J-${id}`,
    customerId: 'cust-1',
    wellName: 'Test Well',
    status: 'active' as const,
    bidId,
    serviceRuns: [
      { code: 'LOG', startDate: '2026-01-01', endDate: '2026-01-31' },
      { code: 'LOG', startDate: '2026-02-01', endDate: '2026-02-28' },
    ],
  }) as unknown as Job;

const fakeBid = (id: string): Bid =>
  ({
    id,
    services: [
      { id: 'li-1', catalogItemId: 'cat-log', rate: 3500, estimatedQty: 30 },
    ],
  }) as unknown as Bid;

const fakeCatalogItem = (): ServiceCatalogItem =>
  ({
    id: 'cat-log',
    category: 'logging',
    name: 'Mudlogging',
    defaultRate: 3500,
    rateNote: null,
    dailyCode: 'LOG',
    billingUnit: 'per_day',
  }) as ServiceCatalogItem;

describe('buildStratagraphPnl', () => {
  it('groups invoice revenue by project and month', () => {
    const invoices = [
      fakeInvoice('1', 'job-1', 100000, '2026-01-01', '2026-01-31'),
      fakeInvoice('2', 'job-1', 120000, '2026-02-01', '2026-02-28'),
    ];
    const jobs = [fakeJob('job-1', 'bid-1')];
    const bids = [fakeBid('bid-1')];
    const catalog = [fakeCatalogItem()];

    const projects = buildStratagraphPnl(invoices, jobs, bids, catalog);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.months).toHaveLength(2);
    expect(projects[0]!.months[0]!.revenue).toBe(100000);
    expect(projects[0]!.months[1]!.revenue).toBe(120000);
    expect(projects[0]!.totals.revenue).toBe(220000);
  });

  it('returns empty when no invoices', () => {
    const projects = buildStratagraphPnl([], [], [], []);
    expect(projects).toHaveLength(0);
  });

  it('ignores draft invoices', () => {
    const invoices = [
      fakeInvoice('1', 'job-1', 50000, '2026-01-01', '2026-01-31', 'draft'),
    ];
    const projects = buildStratagraphPnl(invoices, [], [], []);
    expect(projects).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getPnlAlerts
// ---------------------------------------------------------------------------

const makePnlProject = (overrides: Partial<PnlProject>): PnlProject => ({
  id: 'test',
  name: 'Test',
  customer: 'Co',
  months: [],
  originalBid: null,
  totals: { revenue: 0, cost: 0, profit: 0, gpPct: 0 },
  ...overrides,
});

describe('getPnlAlerts', () => {
  it('flags low GP%', () => {
    const p = makePnlProject({ totals: { revenue: 100, cost: 95, profit: 5, gpPct: 5.0 } });
    const alerts = getPnlAlerts(p);
    expect(alerts.some((a) => a.type === 'low-gp')).toBe(true);
  });

  it('does not flag healthy GP%', () => {
    const p = makePnlProject({ totals: { revenue: 100, cost: 85, profit: 15, gpPct: 15.0 } });
    const alerts = getPnlAlerts(p);
    expect(alerts.some((a) => a.type === 'low-gp')).toBe(false);
  });

  it('flags declining GP% for 2+ consecutive months', () => {
    const p = makePnlProject({
      months: [
        { date: '2026-01-01', revenue: 100, cost: 85, profit: 15, gpPct: 15 },
        { date: '2026-02-01', revenue: 100, cost: 88, profit: 12, gpPct: 12 },
        { date: '2026-03-01', revenue: 100, cost: 91, profit: 9, gpPct: 9 },
      ],
    });
    const alerts = getPnlAlerts(p);
    expect(alerts.some((a) => a.type === 'declining-gp')).toBe(true);
  });

  it('does not flag one-month decline', () => {
    const p = makePnlProject({
      months: [
        { date: '2026-01-01', revenue: 100, cost: 85, profit: 15, gpPct: 15 },
        { date: '2026-02-01', revenue: 100, cost: 88, profit: 12, gpPct: 12 },
      ],
    });
    const alerts = getPnlAlerts(p);
    expect(alerts.some((a) => a.type === 'declining-gp')).toBe(false);
  });

  it('flags cost exceeding bid by >10%', () => {
    const p = makePnlProject({
      originalBid: { revenue: 1000, cost: 800, profit: 200, gpPct: 20 },
      totals: { revenue: 1000, cost: 900, profit: 100, gpPct: 10 },
    });
    const alerts = getPnlAlerts(p);
    expect(alerts.some((a) => a.type === 'over-bid')).toBe(true);
  });

  it('does not flag cost within 10% of bid', () => {
    const p = makePnlProject({
      originalBid: { revenue: 1000, cost: 800, profit: 200, gpPct: 20 },
      totals: { revenue: 1000, cost: 850, profit: 150, gpPct: 15 },
    });
    const alerts = getPnlAlerts(p);
    expect(alerts.some((a) => a.type === 'over-bid')).toBe(false);
  });
});
