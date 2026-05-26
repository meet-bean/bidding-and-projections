import { describe, it, expect } from 'vitest';
import {
  createCatalog,
  addMetric,
  removeMetric,
  updateMetric,
  findMetricByName,
  findMetricByAlias,
} from './catalog.js';
import type { Metric, MetricsCatalog } from './types.js';

const SAMPLE_METRIC: Metric = {
  id: 'f-cost',
  name: 'F Cost',
  aliases: ['Forecast Cost', 'Proj Cost'],
  sliceGroup: 'F',
  field: 'cost',
  kind: 'raw',
  formula: null,
  formulaRefs: [],
};

describe('createCatalog', () => {
  it('creates an empty catalog for a tenant', () => {
    const cat = createCatalog('superior');
    expect(cat.tenantId).toBe('superior');
    expect(cat.metrics).toEqual([]);
  });
});

describe('addMetric', () => {
  it('adds a metric to the catalog', () => {
    const cat = createCatalog('superior');
    const next = addMetric(cat, SAMPLE_METRIC);
    expect(next.metrics).toHaveLength(1);
    expect(next.metrics[0]!.id).toBe('f-cost');
  });

  it('does not mutate the original catalog', () => {
    const cat = createCatalog('superior');
    addMetric(cat, SAMPLE_METRIC);
    expect(cat.metrics).toHaveLength(0);
  });

  it('rejects duplicate ids', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    const next = addMetric(cat, SAMPLE_METRIC);
    expect(next.metrics).toHaveLength(1);
  });
});

describe('removeMetric', () => {
  it('removes a metric by id', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    const next = removeMetric(cat, 'f-cost');
    expect(next.metrics).toHaveLength(0);
  });
});

describe('updateMetric', () => {
  it('patches a metric by id', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    const next = updateMetric(cat, 'f-cost', { name: 'Forecast Cost' });
    expect(next.metrics[0]!.name).toBe('Forecast Cost');
  });
});

describe('findMetricByName', () => {
  it('finds by exact name (case-insensitive)', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByName(cat, 'f cost')).toBe(SAMPLE_METRIC);
  });

  it('returns undefined for no match', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByName(cat, 'Unknown Column')).toBeUndefined();
  });
});

describe('findMetricByAlias', () => {
  it('finds by alias (case-insensitive)', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByAlias(cat, 'forecast cost')).toBe(SAMPLE_METRIC);
  });

  it('returns undefined when no alias matches', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByAlias(cat, 'something else')).toBeUndefined();
  });
});
