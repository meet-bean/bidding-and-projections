// packages/projections/src/metrics/columns.test.ts
import { describe, it, expect } from 'vitest';
import { buildMetricColumns } from './columns';
import type { MetricsCatalog } from './types';

const catalog: MetricsCatalog = {
  tenantId: 'superior',
  groups: [
    { id: 'F', name: 'Forecast', color: '#92cddc' },
    { id: 'PRJ', name: 'Projection', color: '#f2dcdb' },
  ],
  metrics: [
    { id: 'f-qty', name: 'F Qty', aliases: [], group: 'F', field: 'qty', type: 'vista-upload', formula: null, formulaRefs: [], editable: true },
    { id: 'f-cost', name: 'F Cost', aliases: [], group: 'F', field: 'cost', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'lmf', name: 'New Projection', aliases: [], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'] },
    { id: 'desc', name: 'Description', aliases: [], group: 'F', field: 'description', type: 'vista-upload', formula: null, formulaRefs: [] },
    { id: 'risk', name: 'Risk', aliases: [], group: null, field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'] },
  ],
};

describe('buildMetricColumns', () => {
  const cols = buildMetricColumns(catalog);

  it('excludes identity-field metrics', () => {
    expect(cols.find((c) => c.id === 'desc')).toBeUndefined();
  });

  it('orders columns by group order, null group last', () => {
    expect(cols.map((c) => c.id)).toEqual(['f-qty', 'f-cost', 'lmf', 'risk']);
  });

  it('carries name, group color and editable flag', () => {
    const c = cols.find((c) => c.id === 'f-qty')!;
    expect(c.name).toBe('F Qty');
    expect(c.color).toBe('#92cddc');
    expect(c.editable).toBe(true);
  });

  it('derives currency format for cost fields and number otherwise', () => {
    expect(cols.find((c) => c.id === 'f-cost')!.format).toBe('currency');
    expect(cols.find((c) => c.id === 'f-qty')!.format).toBe('number');
  });
});
