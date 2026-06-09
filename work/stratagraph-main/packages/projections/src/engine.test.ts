import { describe, it, expect } from 'vitest';
import { updateMetricValue, clearMetricOverride } from './engine';
import { resolveMetricValue } from './metrics/resolver';
import type { ProjectionProject } from './types';
import type { Metric, MetricsCatalog } from './metrics/types';

// Minimal project with one version holding one item.
// Fixture shape copied from the resolver.test.ts item builder + real ProjectionProject type.
const emptySlice = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
const baseItem = {
  lineKey: 'K',
  keyParts: ['K'],
  label: 'L',
  unitOfMeasure: '',
  CTP: { ...emptySlice },
  CTD: { ...emptySlice, cost: 400 },
  CTC: { ...emptySlice },
  F: { ...emptySlice, qty: 186, cost: 1000 },
  Est: { ...emptySlice },
  estVar: 0,
  comp: 0,
  prevForecast: 0,
  calcHrs: 0,
  wsRisk: 0,
  isNew: false,
  stale: false,
};

const project = (): ProjectionProject => ({
  id: 'p',
  jobNumber: '1',
  name: 'N',
  customer: '',
  pm: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  versions: [
    {
      id: 'v1',
      label: 'V1',
      createdAt: '2026-01-01T00:00:00.000Z',
      saved: true,
      items: [structuredClone(baseItem)],
    },
  ],
  draft: null,
  comments: {},
  alertStatus: {},
  financials: null,
});

const lmf: Metric = {
  id: 'lmf',
  name: 'New Projection',
  aliases: [],
  group: 'PRJ',
  field: 'cost',
  type: 'formula',
  formula: 'F.cost',
  formulaRefs: ['f-cost'],
  editable: true,
};

const catalog: MetricsCatalog = {
  tenantId: 'superior',
  groups: [],
  metrics: [lmf],
};

describe('updateMetricValue', () => {
  it('stores an override in the draft and the resolver returns it', () => {
    const p = updateMetricValue(project(), 'K', lmf, 1234);
    const item = p.draft!.items.find((i) => i.lineKey === 'K')!;
    expect(resolveMetricValue(item, lmf, { catalog, prevItems: [] })).toBe(1234);
  });

  it('clearMetricOverride reverts to the computed value', () => {
    let p = updateMetricValue(project(), 'K', lmf, 1234);
    p = clearMetricOverride(p, 'K', lmf.id);
    const item = p.draft!.items.find((i) => i.lineKey === 'K')!;
    // lmf formula is 'F.cost' but catalog only has lmf itself — no f-cost metric → resolves to 0
    // Use a catalog with f-cost so the formula resolves properly
    const fCost: Metric = {
      id: 'f-cost',
      name: 'F Cost',
      aliases: [],
      group: 'F',
      field: 'cost',
      type: 'vista-upload',
      formula: null,
      formulaRefs: [],
    };
    const fullCatalog: MetricsCatalog = {
      tenantId: 'superior',
      groups: [],
      metrics: [lmf, fCost],
    };
    expect(resolveMetricValue(item, lmf, { catalog: fullCatalog, prevItems: [] })).toBe(1000);
  });
});
