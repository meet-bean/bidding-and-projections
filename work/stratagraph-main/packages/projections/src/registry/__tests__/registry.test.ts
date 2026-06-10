import { describe, it, expect } from 'vitest';
import {
  createRegistry,
  addServiceItem,
  findServiceItem,
  findFuzzyMatches,
  mergeServiceItems,
  separateAlias,
  normalizeKey,
  primaryPhase,
  classifyImport,
} from '../registry';
import type { ServiceSource } from '../types';

const src = (over: Partial<ServiceSource> = {}): ServiceSource => ({
  projectId: 'p1',
  lineKey: 'k1',
  phaseCode: 'B-300',
  ctd: { qty: 10, hours: 1, cost: 100 },
  oe: { qty: 12, cost: 90 },
  f: { qty: 12, cost: 110 },
  date: '2026-01-01',
  ...over,
});

describe('normalizeKey', () => {
  it('uppercases and strips delimiters', () => {
    expect(normalizeKey('b-100')).toBe('B100');
    expect(normalizeKey('B.100-')).toBe('B100');
    expect(normalizeKey(' b 100 ')).toBe('B100');
  });
});

describe('createRegistry', () => {
  it('creates empty registry for tenant', () => {
    const reg = createRegistry('superior');
    expect(reg.tenantId).toBe('superior');
    expect(reg.items).toEqual([]);
  });
});

describe('addServiceItem', () => {
  it('adds a new item', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    expect(reg.items).toHaveLength(1);
    expect(reg.items[0]!.canonicalName).toBe('Concrete Formwork');
    expect(reg.items[0]!.projectIds).toEqual(['proj-1']);
  });

  it('skips duplicate by normalized name + costType', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    reg = addServiceItem(reg, {
      canonicalName: 'concrete formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-2',
    });
    expect(reg.items).toHaveLength(1);
    expect(reg.items[0]!.projectIds).toEqual(['proj-1', 'proj-2']);
  });

  it('source re-import idempotency: same source twice → sources.length === 1', () => {
    let reg = createRegistry('superior');
    const source = src({ projectId: 'p1', lineKey: 'k1' });
    reg = addServiceItem(reg, {
      canonicalName: 'Excavation',
      unitOfMeasure: 'CY',
      costType: '2Labor',
      sourceProjectId: 'p1',
      source,
    });
    reg = addServiceItem(reg, {
      canonicalName: 'Excavation',
      unitOfMeasure: 'CY',
      costType: '2Labor',
      sourceProjectId: 'p1',
      source,
    });
    expect(reg.items[0]!.sources).toHaveLength(1);
  });

  it('source re-import with changed cost: still length 1, new value wins', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Excavation',
      unitOfMeasure: 'CY',
      costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'k1', ctd: { qty: 10, hours: 1, cost: 500 } }),
    });
    reg = addServiceItem(reg, {
      canonicalName: 'Excavation',
      unitOfMeasure: 'CY',
      costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'k1', ctd: { qty: 10, hours: 1, cost: 999 } }),
    });
    expect(reg.items[0]!.sources).toHaveLength(1);
    expect(reg.items[0]!.sources[0]!.ctd.cost).toBe(999);
  });
});

describe('findServiceItem', () => {
  it('finds by canonical name', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Rebar Installation',
      unitOfMeasure: 'TON',
      costType: '3Material',
      sourceProjectId: 'proj-1',
    });
    const found = findServiceItem(reg, 'rebar installation', '3Material');
    expect(found?.canonicalName).toBe('Rebar Installation');
  });

  it('finds by alias', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Rebar Installation',
      unitOfMeasure: 'TON',
      costType: '3Material',
      sourceProjectId: 'proj-1',
    });
    reg = mergeServiceItems(reg, reg.items[0]!.id, {
      raw: 'Rebar Install.',
      normalizedTo: reg.items[0]!.id,
      sourceProjectId: 'proj-2',
      sourceUploadDate: '2026-05-26',
    });
    const found = findServiceItem(reg, 'Rebar Install.', '3Material');
    expect(found?.canonicalName).toBe('Rebar Installation');
  });
});

describe('findFuzzyMatches', () => {
  it('returns matches when 2 of 3 fields are similar', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    const matches = findFuzzyMatches(reg, 'Concrete Formwrk', 'SF', '2Labor');
    expect(matches).toHaveLength(1);
    expect(matches[0]!.matchedFields).toContain('costType');
  });

  it('returns empty when only 1 field matches', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    const matches = findFuzzyMatches(reg, 'Steel Erection', 'TON', '2Labor');
    expect(matches).toHaveLength(0);
  });
});

describe('mergeServiceItems', () => {
  it('adds alias to existing item', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    reg = mergeServiceItems(reg, reg.items[0]!.id, {
      raw: 'Conc. Formwork',
      normalizedTo: reg.items[0]!.id,
      sourceProjectId: 'proj-2',
      sourceUploadDate: '2026-05-26',
    });
    expect(reg.items[0]!.aliases).toHaveLength(1);
    expect(reg.items[0]!.aliases[0]!.raw).toBe('Conc. Formwork');
  });
});

describe('separateAlias', () => {
  it('removes alias and creates new item', () => {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Concrete Formwork',
      unitOfMeasure: 'SF',
      costType: '2Labor',
      sourceProjectId: 'proj-1',
    });
    reg = mergeServiceItems(reg, reg.items[0]!.id, {
      raw: 'Conc. Formwork',
      normalizedTo: reg.items[0]!.id,
      sourceProjectId: 'proj-2',
      sourceUploadDate: '2026-05-26',
    });
    reg = separateAlias(reg, reg.items[0]!.id, 'Conc. Formwork');
    expect(reg.items).toHaveLength(2);
    expect(reg.items[0]!.aliases).toHaveLength(0);
    expect(reg.items[1]!.canonicalName).toBe('Conc. Formwork');
  });
});

describe('derived selectors', () => {
  const item = {
    id: 'i1', tenantId: 'superior' as const, canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
    aliases: [], createdAt: '', projectIds: ['p1', 'p2', 'p3'],
    recommendedRate: null, rateNote: null, billingUnit: null, dailyCode: null,
    sources: [
      { projectId: 'p1', lineKey: 'a', phaseCode: 'B-300', ctd: { qty: 10, hours: 1, cost: 100 }, oe: { qty: 10, cost: 90 }, f: { qty: 10, cost: 100 }, date: '' },
      { projectId: 'p2', lineKey: 'b', phaseCode: 'B-310', ctd: { qty: 10, hours: 2, cost: 120 }, oe: { qty: 10, cost: 100 }, f: { qty: 10, cost: 120 }, date: '' },
      { projectId: 'p3', lineKey: 'c', phaseCode: 'B-300', ctd: { qty: 10, hours: 0, cost: 110 }, oe: { qty: 10, cost: 90 }, f: { qty: 10, cost: 110 }, date: '' },
    ],
  };
  it('primaryPhase returns most frequent + varies flag', () => {
    expect(primaryPhase(item)).toEqual({ code: 'B-300', varies: true });
  });
  it('handles empty sources', () => {
    const empty = { ...item, sources: [] };
    expect(primaryPhase(empty)).toEqual({ code: null, varies: false });
  });
});

describe('classifyImport (5-tier matcher)', () => {
  // Catalog: two services sharing cost type 2Labor, one 5SubCont sibling sharing a phase code.
  function buildReg() {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Erosion Control', unitOfMeasure: 'DY', costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-200-|2Labor', phaseCode: 'B-200-' }),
    });
    reg = addServiceItem(reg, {
      canonicalName: 'Mowing / Litter', unitOfMeasure: 'MOS', costType: '5SubCont',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-205-|5SubCont', phaseCode: 'B-205-' }),
    });
    return reg;
  }
  const line = (over: Record<string, unknown> = {}) => ({
    name: 'Erosion Control', unitOfMeasure: 'DY', costType: '2Labor',
    lineKey: 'B-200-|2Labor', phaseCode: 'B-200-',
    ctd: { qty: 1, hours: 0, cost: 1 },
    oe: { qty: 1, cost: 1 },
    f: { qty: 1, cost: 1 },
    date: '2026-06-01',
    projectId: 'p1',
    ...over,
  });

  it('tier 1: exact name + cost type → auto', () => {
    const res = classifyImport(buildReg(), [line()]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.canonicalName).toBe('Erosion Control');
    expect(res[0]!.confidence).toBe(1);
  });

  it('tier 1: alias name + cost type → auto', () => {
    let reg = buildReg();
    const target = reg.items[0]!;
    reg = mergeServiceItems(reg, target.id, {
      raw: 'Erosion Cntrl', normalizedTo: 'Erosion Control',
      sourceProjectId: 'p1', sourceUploadDate: '2026-05-01',
    });
    const res = classifyImport(reg, [line({ name: 'Erosion Cntrl' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.id).toBe(target.id);
  });

  it('canonical scenario: name+costType beats a phase-code sibling', () => {
    // Incoming B-205-/2Labor/"Erosion Control": shares phase B-205- with Mowing/Litter (5SubCont)
    // but must match Erosion Control (2Labor) by name+costType.
    const res = classifyImport(buildReg(), [line({ phaseCode: 'B-205-', lineKey: 'B-205-|2Labor' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.canonicalName).toBe('Erosion Control');
  });

  it('UoM mismatch does NOT block a name match; sets uomWarning', () => {
    const res = classifyImport(buildReg(), [line({ unitOfMeasure: 'MOS' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.uomWarning).toBe(true);
  });

  it('tier 2: single fuzzy name + cost type → auto', () => {
    const res = classifyImport(buildReg(), [line({ name: 'Erosion Controls' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestions[0]!.reason).toBe('fuzzy-name');
  });

  it('tier 3: same project + phase code + cost type with drifted name → review (phase-rename)', () => {
    const res = classifyImport(buildReg(), [
      line({ name: 'Silt Fence & SWPPP Maintenance', phaseCode: 'B-200-' }),
    ]);
    expect(res[0]!.bucket).toBe('review');
    expect(res[0]!.suggestions[0]!.reason).toBe('phase-rename');
    expect(res[0]!.suggestions[0]!.service.canonicalName).toBe('Erosion Control');
  });

  it('tier 3 never fires across projects', () => {
    const res = classifyImport(buildReg(), [
      line({ name: 'Silt Fence & SWPPP Maintenance', phaseCode: 'B-200-', projectId: 'p2' }),
    ]);
    expect(res[0]!.bucket).toBe('new');
  });

  it('tier 4: fuzzy + phase-rename conflict → review with both suggestions', () => {
    let reg = buildReg();
    reg = addServiceItem(reg, {
      canonicalName: 'Erosion Controls Inc', unitOfMeasure: 'DY', costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-210-|2Labor', phaseCode: 'B-210-' }),
    });
    // Name fuzzy-matches BOTH 'Erosion Control' and 'Erosion Controls Inc' → conflict → review.
    const res = classifyImport(reg, [line({ name: 'Erosion Controls' })]);
    expect(res[0]!.bucket).toBe('review');
    expect(res[0]!.suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('tier 5: nothing matches → new', () => {
    const res = classifyImport(buildReg(), [
      line({ name: 'Bridge Post-Tensioning', costType: '5SubCont', phaseCode: 'C-700-' }),
    ]);
    expect(res[0]!.bucket).toBe('new');
    expect(res[0]!.suggestions).toEqual([]);
  });

  it('cost type must agree even for exact name', () => {
    const res = classifyImport(buildReg(), [line({ costType: '3Material' })]);
    expect(res[0]!.bucket).toBe('new');
  });
});

describe('ServiceSource OE/CTD/F bases', () => {
  const oeCtdFSrc = () => ({
    projectId: 'p1', lineKey: 'k', phaseCode: 'B-300', date: '2025-09-01',
    ctd: { qty: 10, hours: 2, cost: 100 },
    oe:  { qty: 12, cost: 90 },
    f:   { qty: 12, cost: 110 },
  });
  it('stores all three slices on the source', () => {
    const reg = addServiceItem(createRegistry('superior'), {
      canonicalName: 'Excavation', unitOfMeasure: 'CY', costType: '2Labor',
      sourceProjectId: 'p1', source: oeCtdFSrc(),
    });
    expect(reg.items[0]!.sources[0]).toEqual(oeCtdFSrc());
  });
});
