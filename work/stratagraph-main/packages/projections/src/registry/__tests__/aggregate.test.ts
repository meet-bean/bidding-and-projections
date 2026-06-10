import { describe, it, expect } from 'vitest';
import { createCatalog } from '../../metrics/catalog';
import { aggregateGroup, groupUC } from '../aggregate';
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
