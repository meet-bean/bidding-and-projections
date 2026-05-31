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
  id: 'test-custom',
  name: 'Custom Metric',
  aliases: ['My Custom Col'],
  group: 'F',
  field: 'cost',
  type: 'vista-upload',
  formula: null,
  formulaRefs: [],
};

function emptyCatalog(): MetricsCatalog {
  return createCatalog('test-tenant');
}

describe('createCatalog', () => {
  it('seeds metrics for superior tenant', () => {
    const cat = createCatalog('superior');
    expect(cat.tenantId).toBe('superior');
    expect(cat.metrics.length).toBeGreaterThan(0);
    expect(cat.metrics.find((m) => m.id === 'f-cost')).toBeDefined();
    expect(cat.metrics.find((m) => m.id === 'lmf')).toBeDefined();
    expect(cat.metrics.find((m) => m.id === 'risk')).toBeDefined();
    expect(cat.groups.length).toBe(6);
  });

  it('creates an empty catalog for other tenants', () => {
    const cat = createCatalog('stratagraph');
    expect(cat.tenantId).toBe('stratagraph');
    expect(cat.metrics).toEqual([]);
  });
});

describe('addMetric', () => {
  it('adds a metric to the catalog', () => {
    const cat = emptyCatalog();
    const next = addMetric(cat, SAMPLE_METRIC);
    expect(next.metrics).toHaveLength(1);
    expect(next.metrics[0]!.id).toBe('test-custom');
  });

  it('does not mutate the original catalog', () => {
    const cat = emptyCatalog();
    addMetric(cat, SAMPLE_METRIC);
    expect(cat.metrics).toHaveLength(0);
  });

  it('rejects duplicate ids', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    const next = addMetric(cat, SAMPLE_METRIC);
    expect(next.metrics).toHaveLength(1);
  });
});

describe('removeMetric', () => {
  it('removes a metric by id', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    const next = removeMetric(cat, 'test-custom');
    expect(next.metrics).toHaveLength(0);
  });
});

describe('updateMetric', () => {
  it('patches a metric by id', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    const next = updateMetric(cat, 'test-custom', { name: 'Renamed Metric' });
    expect(next.metrics[0]!.name).toBe('Renamed Metric');
  });
});

describe('findMetricByName', () => {
  it('finds by exact name (case-insensitive)', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    expect(findMetricByName(cat, 'custom metric')).toBe(SAMPLE_METRIC);
  });

  it('returns undefined for no match', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    expect(findMetricByName(cat, 'Unknown Column')).toBeUndefined();
  });
});

describe('findMetricByAlias', () => {
  it('finds by alias (case-insensitive)', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    expect(findMetricByAlias(cat, 'my custom col')).toBe(SAMPLE_METRIC);
  });

  it('returns undefined when no alias matches', () => {
    const cat = addMetric(emptyCatalog(), SAMPLE_METRIC);
    expect(findMetricByAlias(cat, 'something else')).toBeUndefined();
  });
});
