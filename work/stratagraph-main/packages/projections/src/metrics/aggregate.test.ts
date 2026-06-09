import { describe, it, expect } from 'vitest';
import { createCatalog } from './catalog';
import { resolveMetricValue } from './resolver';
import type { ProjectionItem, ServiceSource } from '../index';

// ── helpers mirrored from the web-app's service-catalog-aggregate ────────────

const ZERO = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };

function synthItem(ctd: { qty: number; hours: number; cost: number }): ProjectionItem {
  return {
    lineKey: '',
    keyParts: [],
    label: '',
    unitOfMeasure: '',
    CTP: { ...ZERO },
    CTD: { ...ZERO, qty: ctd.qty, hours: ctd.hours, cost: ctd.cost },
    CTC: { ...ZERO },
    F: { ...ZERO },
    Est: { ...ZERO },
    estVar: 0,
    comp: 0,
    prevForecast: 0,
    calcHrs: 0,
    wsRisk: 0,
    isNew: false,
    stale: false,
  };
}

function ctdMetrics(catalog: ReturnType<typeof createCatalog>) {
  return catalog.metrics.filter((m) => m.group === 'CTD');
}

function resolveCtd(
  catalog: ReturnType<typeof createCatalog>,
  ctd: { qty: number; hours: number; cost: number },
): Record<string, number> {
  const item = synthItem(ctd);
  const out: Record<string, number> = {};
  for (const m of ctdMetrics(catalog)) {
    out[m.id] = resolveMetricValue(item, m, { catalog, prevItems: [] });
  }
  return out;
}

function aggregateCtd(
  catalog: ReturnType<typeof createCatalog>,
  sources: ServiceSource[],
): Record<string, number> {
  const sum = sources.reduce(
    (a, s) => ({ qty: a.qty + s.ctd.qty, hours: a.hours + s.ctd.hours, cost: a.cost + s.ctd.cost }),
    { qty: 0, hours: 0, cost: 0 },
  );
  return resolveCtd(catalog, sum);
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('aggregateCtd', () => {
  const catalog = createCatalog('superior');

  const sources: ServiceSource[] = [
    { projectId: 'proj-a', lineKey: 'k1', phaseCode: 'B-100', date: '2026-01-01', ctd: { qty: 100, hours: 10, cost: 1000 }, oe: { qty: 100, cost: 1000 }, f: { qty: 100, cost: 1000 } },
    { projectId: 'proj-b', lineKey: 'k2', phaseCode: 'B-200', date: '2026-02-01', ctd: { qty: 300, hours: 30, cost: 5000 }, oe: { qty: 300, cost: 5000 }, f: { qty: 300, cost: 5000 } },
  ];

  it('sums qty, hours, and cost across sources', () => {
    const result = aggregateCtd(catalog, sources);
    expect(result['ctd-qty']).toBe(400);
    expect(result['ctd-hrs']).toBe(40);
    expect(result['ctd-cost']).toBe(6000);
  });

  it('recomputes ctd-uc (cost/qty) from the summed bases', () => {
    const result = aggregateCtd(catalog, sources);
    // 6000 / 400 = 15
    expect(result['ctd-uc']).toBeCloseTo(15);
  });

  it('recomputes ctd-um (qty/hours) from the summed bases', () => {
    const result = aggregateCtd(catalog, sources);
    // 400 / 40 = 10
    expect(result['ctd-um']).toBeCloseTo(10);
  });

  it('recomputes ctd-mu (hours/qty) from the summed bases', () => {
    const result = aggregateCtd(catalog, sources);
    // 40 / 400 = 0.1
    expect(result['ctd-mu']).toBeCloseTo(0.1);
  });

  it('returns 0 for formula metrics when denominator is zero', () => {
    const emptySources: ServiceSource[] = [
      { projectId: 'p', lineKey: 'k', phaseCode: '', date: '', ctd: { qty: 0, hours: 0, cost: 0 }, oe: { qty: 0, cost: 0 }, f: { qty: 0, cost: 0 } },
    ];
    const result = aggregateCtd(catalog, emptySources);
    expect(result['ctd-uc']).toBe(0);
    expect(result['ctd-um']).toBe(0);
  });

  it('handles empty sources array', () => {
    const result = aggregateCtd(catalog, []);
    expect(result['ctd-qty']).toBe(0);
    expect(result['ctd-cost']).toBe(0);
  });
});
