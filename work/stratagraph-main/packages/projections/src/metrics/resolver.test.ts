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
