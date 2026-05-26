import { describe, it, expect } from 'vitest';
import { detectColumns, detectFormula, detectStructure } from './detect.js';
import { createCatalog, addMetric } from '../metrics/catalog.js';
import type { Metric } from '../metrics/types.js';

const F_QTY: Metric = {
  id: 'f-qty', name: 'F Qty', aliases: ['Forecast Qty'],
  sliceGroup: 'F', field: 'qty', kind: 'raw', formula: null, formulaRefs: [],
};
const F_HOURS: Metric = {
  id: 'f-hours', name: 'F Hours', aliases: [],
  sliceGroup: 'F', field: 'hours', kind: 'raw', formula: null, formulaRefs: [],
};
const F_COST: Metric = {
  id: 'f-cost', name: 'F Cost', aliases: ['Forecast Cost'],
  sliceGroup: 'F', field: 'cost', kind: 'raw', formula: null, formulaRefs: [],
};
const PHASE: Metric = {
  id: 'phase', name: 'Phase', aliases: [],
  sliceGroup: null, field: 'lineItem', kind: 'raw', formula: null, formulaRefs: [],
};

function buildCatalog() {
  let cat = createCatalog('test');
  cat = addMetric(cat, PHASE);
  cat = addMetric(cat, F_QTY);
  cat = addMetric(cat, F_HOURS);
  cat = addMetric(cat, F_COST);
  return cat;
}

describe('detectColumns', () => {
  it('matches known columns by name', () => {
    const catalog = buildCatalog();
    const headers = ['Phase', 'F Qty', 'F Cost', 'Unknown Col'];
    const rows = [
      { 'Phase': 'B-100', 'F Qty': 1200, 'F Cost': 48000, 'Unknown Col': 'notes' },
    ];
    const result = detectColumns(headers, rows, catalog);
    expect(result.recognizedCount).toBe(3);
    expect(result.newCount).toBe(1);
    expect(result.results[0]!.matched).toBe(true);
    expect(result.results[0]!.metricId).toBe('phase');
    expect(result.results[3]!.matched).toBe(false);
  });

  it('matches by alias', () => {
    const catalog = buildCatalog();
    const headers = ['Forecast Cost'];
    const rows = [{ 'Forecast Cost': 50000 }];
    const result = detectColumns(headers, rows, catalog);
    expect(result.results[0]!.matched).toBe(true);
    expect(result.results[0]!.metricId).toBe('f-cost');
  });
});

describe('detectFormula', () => {
  it('detects division formula from sample data', () => {
    const columnValues = [32, 40, 25];
    const otherColumns = {
      'F Cost': [48000, 60000, 50000],
      'F Qty': [1500, 1500, 2000],
    };
    const result = detectFormula('F UC', columnValues, otherColumns);
    expect(result).not.toBeNull();
    expect(result!.expression).toBe('= F Cost / F Qty');
  });

  it('detects subtraction formula', () => {
    const columnValues = [14400, 12000, 8000];
    const otherColumns = {
      'F Cost': [48000, 60000, 50000],
      'CTD Cost': [33600, 48000, 42000],
    };
    const result = detectFormula('CTC Cost', columnValues, otherColumns);
    expect(result).not.toBeNull();
    expect(result!.expression).toContain('-');
  });

  it('returns null when no formula fits', () => {
    const columnValues = [1, 2, 3];
    const otherColumns = { 'A': [100, 200, 300] };
    const result = detectFormula('Random', columnValues, otherColumns);
    expect(result).toBeNull();
  });
});

describe('detectStructure', () => {
  it('detects flat structure when no suffix patterns found', () => {
    const lineItems = ['B-100', 'B-200', 'B-300'];
    const result = detectStructure(lineItems);
    expect(result.structure).toBe('flat');
    expect(result.breakoutPattern).toBeNull();
  });

  it('detects breakout structure with suffix patterns', () => {
    const lineItems = [
      'B-100', 'B-100 - Labor', 'B-100 - Material',
      'B-200', 'B-200 - Labor',
    ];
    const result = detectStructure(lineItems);
    expect(result.structure).toBe('breakout');
    expect(result.breakoutPattern).toBeTruthy();
  });
});
