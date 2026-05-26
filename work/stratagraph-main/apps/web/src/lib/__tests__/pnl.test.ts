import { describe, it, expect } from 'vitest';
import { buildPnlProject, buildPnlPortfolio } from '../pnl';
import type { ProjectionProject, FinancialSummaryMonth } from '@repo/projections';

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
    expect(portfolio.months[0].revenue).toBe(6000000);
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
    expect(portfolio.projects[0].name).toBe('Big');
    expect(portfolio.projects[1].name).toBe('Small');
  });
});
