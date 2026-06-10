import { describe, it, expect } from 'vitest';
import { createCatalog } from '../../metrics/catalog';
import { aggregateGroup, groupUC, recommendedRateFromSources, sourcesUomVaries } from '../aggregate';
import type { ServiceSource } from '../types';

// Helper: source with all-zero bases except what's specified
function src(
  overrides: Partial<{ ctd: ServiceSource['ctd']; oe: ServiceSource['oe']; f: ServiceSource['f'] }>,
  id = 'p1',
  lk = 'k',
): ServiceSource {
  return {
    projectId: id, lineKey: lk, phaseCode: 'B', date: '',
    ctd: { qty: 0, hours: 0, cost: 0 },
    oe:  { qty: 0, cost: 0 },
    f:   { qty: 0, cost: 0 },
    ...overrides,
  };
}

describe('sourcesUomVaries', () => {
  it('false when all sources share a unit (or it is absent)', () => {
    expect(
      sourcesUomVaries([
        { ...src({}), unitOfMeasure: 'DAY' },
        { ...src({}, 'p2', 'b'), unitOfMeasure: 'DAY' },
      ]),
    ).toBe(false);
    // absent units don't count as a distinct unit
    expect(sourcesUomVaries([src({}), src({}, 'p2', 'b')])).toBe(false);
  });

  it('true when sources span more than one unit', () => {
    expect(
      sourcesUomVaries([
        { ...src({}), unitOfMeasure: 'DAY' },
        { ...src({}, 'p2', 'b'), unitOfMeasure: 'MOS' },
      ]),
    ).toBe(true);
  });

  it('case/whitespace-insensitive', () => {
    expect(
      sourcesUomVaries([
        { ...src({}), unitOfMeasure: 'day' },
        { ...src({}, 'p2', 'b'), unitOfMeasure: ' DAY ' },
      ]),
    ).toBe(false);
  });
});

describe('aggregateGroup — OE', () => {
  const catalog = createCatalog('superior');

  it('sums bases and recomputes uc on the sums (not an average)', () => {
    const sources: ServiceSource[] = [
      src({ oe: { qty: 100, cost: 1000 } }, 'p1', 'a'),
      src({ oe: { qty: 300, cost: 5000 } }, 'p2', 'b'),
    ];
    const v = aggregateGroup(catalog, 'OE', sources);
    expect(v['oe-qty']).toBe(400);
    expect(v['oe-cost']).toBe(6000);
    expect(v['oe-uc']).toBeCloseTo(6000 / 400); // 15 — recomputed on sums
  });
});

describe('aggregateGroup — CTD', () => {
  const catalog = createCatalog('superior');

  it('sums qty, hours, cost across sources', () => {
    const sources: ServiceSource[] = [
      src({ ctd: { qty: 100, hours: 10, cost: 1000 } }, 'p1', 'a'),
      src({ ctd: { qty: 300, hours: 30, cost: 5000 } }, 'p2', 'b'),
    ];
    const v = aggregateGroup(catalog, 'CTD', sources);
    expect(v['ctd-qty']).toBe(400);
    expect(v['ctd-hrs']).toBe(40);
    expect(v['ctd-cost']).toBe(6000);
    expect(v['ctd-uc']).toBeCloseTo(15);  // 6000/400
    expect(v['ctd-um']).toBeCloseTo(10);  // 400/40
  });
});

describe('aggregateGroup — F', () => {
  const catalog = createCatalog('superior');

  it('sums bases and recomputes uc on the sums', () => {
    const sources: ServiceSource[] = [
      src({ f: { qty: 200, cost: 2200 } }, 'p1', 'a'),
      src({ f: { qty: 200, cost: 1800 } }, 'p2', 'b'),
    ];
    const v = aggregateGroup(catalog, 'F', sources);
    expect(v['f-qty']).toBe(400);
    expect(v['f-cost']).toBe(4000);
    expect(v['f-uc']).toBeCloseTo(10); // 4000/400
  });
});

describe('recommendedRateFromSources', () => {
  it('blends OE UC across only the sources where forecast held (f UC ≤ oe UC)', () => {
    const sources: ServiceSource[] = [
      // green: oe UC 10, f UC 9 → included
      src({ oe: { qty: 100, cost: 1000 }, f: { qty: 100, cost: 900 } }, 'p1', 'a'),
      // red: oe UC 10, f UC 12 → excluded
      src({ oe: { qty: 100, cost: 1000 }, f: { qty: 100, cost: 1200 } }, 'p2', 'b'),
      // green: oe UC 20, f UC 20 (held exactly) → included
      src({ oe: { qty: 100, cost: 2000 }, f: { qty: 100, cost: 2000 } }, 'p3', 'c'),
    ];
    // (1000 + 2000) / (100 + 100) = 15 — quantity-weighted, red source ignored
    expect(recommendedRateFromSources(sources)).toBeCloseTo(15);
  });

  it('null when every source went red', () => {
    const sources = [src({ oe: { qty: 100, cost: 1000 }, f: { qty: 100, cost: 1500 } })];
    expect(recommendedRateFromSources(sources)).toBeNull();
  });

  it('null for empty sources, zero-qty estimates, or missing forecasts', () => {
    expect(recommendedRateFromSources([])).toBeNull();
    expect(recommendedRateFromSources([src({ oe: { qty: 0, cost: 1000 } })])).toBeNull();
    expect(recommendedRateFromSources([src({ oe: { qty: 100, cost: 1000 } })])).toBeNull();
  });

  it('null when sources span mixed units', () => {
    const sources: ServiceSource[] = [
      { ...src({ oe: { qty: 100, cost: 1000 }, f: { qty: 100, cost: 900 } }), unitOfMeasure: 'CY' },
      { ...src({ oe: { qty: 50, cost: 600 }, f: { qty: 50, cost: 500 } }, 'p2', 'b'), unitOfMeasure: 'TON' },
    ];
    expect(recommendedRateFromSources(sources)).toBeNull();
  });
});

describe('groupUC', () => {
  const catalog = createCatalog('superior');

  it('returns null for empty sources (uc is 0 → non-positive → null)', () => {
    expect(groupUC(catalog, 'OE', [])).toBeNull();
  });

  it('returns the uc value when positive', () => {
    const sources = [src({ oe: { qty: 100, cost: 1000 } })];
    expect(groupUC(catalog, 'OE', sources)).toBeCloseTo(10);
  });

  it('returns null when uc metric is missing (non-superior catalog)', () => {
    const emptyCatalog = createCatalog('stratagraph'); // no metrics
    expect(groupUC(emptyCatalog, 'OE', [])).toBeNull();
  });
});
