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
