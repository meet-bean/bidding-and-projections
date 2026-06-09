import { describe, it, expect } from 'vitest';
import { evalFormula } from './resolver';

describe('evalFormula', () => {
  // resolve(token) returns the numeric value for a SLICE.field reference
  const resolve = (token: string): number =>
    ({ 'F.cost': 1000, 'CTD.cost': 400, 'F.qty': 200, 'F.hours': 0 }[token] ?? 0);

  it('evaluates arithmetic with references', () => {
    expect(evalFormula('F.cost - CTD.cost', resolve)).toBe(600);
  });

  it('respects precedence and parentheses', () => {
    expect(evalFormula('(F.cost - CTD.cost) / 2', resolve)).toBe(300);
  });

  it('returns 0 on divide-by-zero', () => {
    expect(evalFormula('F.qty / F.hours', resolve)).toBe(0);
  });

  it('returns 0 for an unknown/zero reference instead of NaN', () => {
    expect(evalFormula('UNKNOWN.thing * 2', resolve)).toBe(0);
  });

  it('handles a bare reference', () => {
    expect(evalFormula('F.cost', resolve)).toBe(1000);
  });
});

import { classifyMetric, SLICE_BY_GROUP } from './resolver';
import type { Metric } from './types';
import { resolveMetricValue, type ResolveCtx } from './resolver';
import type { ProjectionItem } from '../types';
import type { MetricsCatalog } from './types';

const emptySlice = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
const item = (over: Partial<ProjectionItem>): ProjectionItem => ({
  lineKey: 'B-100-|2Labor', keyParts: ['B-100-', '2Labor'], label: 'Traffic', unitOfMeasure: 'MOS',
  CTP: { ...emptySlice }, CTD: { ...emptySlice, cost: 400 }, CTC: { ...emptySlice },
  F: { ...emptySlice, qty: 186, cost: 1000 }, Est: { ...emptySlice },
  estVar: 0, comp: 0, prevForecast: 0, calcHrs: 0, wsRisk: 0, isNew: false, stale: false, ...over,
});

const catalog: MetricsCatalog = {
  tenantId: 'superior',
  groups: [],
  metrics: [
    { id: 'f-qty', name: 'F Qty', aliases: [], group: 'F', field: 'qty', type: 'vista-upload', formula: null, formulaRefs: [], editable: true },
    { id: 'f-cost', name: 'F Cost', aliases: [], group: 'F', field: 'cost', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'ctd-cost', name: 'CTD Cost', aliases: [], group: 'CTD', field: 'cost', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'left-spend', name: 'Left To Spend', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost - CTD.cost', formulaRefs: ['f-cost', 'ctd-cost'] },
    { id: 'lmf', name: 'New Projection', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'], editable: true },
    // A formula metric whose group/field DO map to a TimeSlice cell (F.hours).
    // It must still be evaluated via its formula, not read from item.F.hours.
    { id: 'calc-hrs', name: 'Calc Hrs', aliases: [], group: 'F', field: 'hours', type: 'formula', formula: 'F.qty * 2', formulaRefs: ['f-qty'] },
  ],
};
const ctx = (over: Partial<ResolveCtx> = {}): ResolveCtx => ({ catalog, prevItems: [], ...over });

describe('resolveMetricValue', () => {
  const byId = (id: string) => catalog.metrics.find((m) => m.id === id)!;

  it('reads a standard cell', () => {
    expect(resolveMetricValue(item({}), byId('f-cost'), ctx())).toBe(1000);
  });

  it('evaluates a formula metric from other metrics', () => {
    expect(resolveMetricValue(item({}), byId('left-spend'), ctx())).toBe(600);
  });

  it('prefers a user override on an editable formula metric', () => {
    const it2 = item({ values: { lmf: 1234 } });
    expect(resolveMetricValue(it2, byId('lmf'), ctx())).toBe(1234);
  });

  it('falls back to the formula when no override is present', () => {
    expect(resolveMetricValue(item({}), byId('lmf'), ctx())).toBe(1000);
  });

  it('reads an editable standard override from values', () => {
    const it2 = item({ values: { 'f-qty': 372 } });
    expect(resolveMetricValue(it2, byId('f-qty'), ctx())).toBe(372);
  });

  it('evaluates a formula metric even when its group/field map to a TimeSlice cell', () => {
    // item.F.hours is 0; the formula F.qty * 2 = 372. Reading the cell would give 0.
    expect(resolveMetricValue(item({}), byId('calc-hrs'), ctx())).toBe(372);
  });
});

const m = (over: Partial<Metric>): Metric => ({
  id: 'x', name: 'X', aliases: [], group: 'F', field: 'qty',
  type: 'vista-upload', formula: null, formulaRefs: [], ...over,
});

describe('classifyMetric', () => {
  it('maps a standard group+numeric field to a TimeSlice cell', () => {
    expect(classifyMetric(m({ group: 'F', field: 'qty' })))
      .toEqual({ kind: 'standard', slice: 'F', field: 'qty' });
  });

  it('maps the OE group to the Est slice', () => {
    expect(classifyMetric(m({ group: 'OE', field: 'cost' })))
      .toEqual({ kind: 'standard', slice: 'Est', field: 'cost' });
  });

  it('treats an unknown group as extended', () => {
    expect(classifyMetric(m({ group: 'PRJ', field: 'cost' })).kind).toBe('extended');
  });

  it('treats a null group as extended', () => {
    expect(classifyMetric(m({ group: null, field: 'cost' })).kind).toBe('extended');
  });

  it('treats an identity field as identity', () => {
    expect(classifyMetric(m({ group: 'F', field: 'description' })).kind).toBe('identity');
  });
});
