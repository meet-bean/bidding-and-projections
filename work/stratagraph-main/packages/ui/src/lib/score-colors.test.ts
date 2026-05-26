import { describe, it, expect } from 'vitest';
import { ratioToScoreColor, ratioToScoreColorSoft, SCORE_STEPS } from './score-colors.js';

describe('ratioToScoreColor', () => {
  it('returns var(--score-0) for 0', () => {
    expect(ratioToScoreColor(0)).toBe('var(--score-0)');
  });

  it('returns var(--score-100) for 100', () => {
    expect(ratioToScoreColor(100)).toBe('var(--score-100)');
  });

  it('rounds to nearest step', () => {
    expect(ratioToScoreColor(12)).toBe('var(--score-0)');
    expect(ratioToScoreColor(13)).toBe('var(--score-25)');
    expect(ratioToScoreColor(37)).toBe('var(--score-25)');
    expect(ratioToScoreColor(38)).toBe('var(--score-50)');
    expect(ratioToScoreColor(62)).toBe('var(--score-50)');
    expect(ratioToScoreColor(63)).toBe('var(--score-75)');
    expect(ratioToScoreColor(87)).toBe('var(--score-75)');
    expect(ratioToScoreColor(88)).toBe('var(--score-100)');
  });

  it('clamps values below 0', () => {
    expect(ratioToScoreColor(-10)).toBe('var(--score-0)');
  });

  it('clamps values above 100', () => {
    expect(ratioToScoreColor(150)).toBe('var(--score-100)');
  });

  it('supports custom steps', () => {
    const customSteps = [0, 50, 100];
    expect(ratioToScoreColor(24, customSteps)).toBe('var(--score-0)');
    expect(ratioToScoreColor(26, customSteps)).toBe('var(--score-50)');
    expect(ratioToScoreColor(74, customSteps)).toBe('var(--score-50)');
    expect(ratioToScoreColor(76, customSteps)).toBe('var(--score-100)');
  });
});

describe('ratioToScoreColorSoft', () => {
  it('returns soft variant for score', () => {
    expect(ratioToScoreColorSoft(0)).toBe('var(--score-0-soft)');
    expect(ratioToScoreColorSoft(100)).toBe('var(--score-100-soft)');
    expect(ratioToScoreColorSoft(80)).toBe('var(--score-75-soft)');
  });

  it('clamps and rounds like ratioToScoreColor', () => {
    expect(ratioToScoreColorSoft(-5)).toBe('var(--score-0-soft)');
    expect(ratioToScoreColorSoft(200)).toBe('var(--score-100-soft)');
    expect(ratioToScoreColorSoft(63)).toBe('var(--score-75-soft)');
  });
});

describe('SCORE_STEPS', () => {
  it('has 5 steps from 0 to 100', () => {
    expect(SCORE_STEPS).toEqual([0, 25, 50, 75, 100]);
  });
});
