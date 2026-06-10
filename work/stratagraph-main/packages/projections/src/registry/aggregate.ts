import type { Metric, MetricsCatalog } from '../metrics/types';
import type { ProjectionItem } from '../types';
import type { ServiceSource } from './types';
import { resolveMetricValue } from '../metrics/resolver';

const ZERO = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };
const SLICE_OF: Record<string, 'CTD' | 'Est' | 'F'> = { CTD: 'CTD', OE: 'Est', F: 'F' };

function groupBases(
  groupId: string,
  s: ServiceSource,
): { qty: number; hours: number; cost: number } {
  if (groupId === 'CTD') return s.ctd;
  if (groupId === 'OE') return { qty: s.oe.qty, hours: 0, cost: s.oe.cost };
  return { qty: s.f.qty, hours: 0, cost: s.f.cost }; // F
}

function synthItem(
  slice: 'CTD' | 'Est' | 'F',
  b: { qty: number; hours: number; cost: number },
): ProjectionItem {
  const base = {
    lineKey: '', keyParts: [], label: '', unitOfMeasure: '',
    CTP: { ...ZERO }, CTD: { ...ZERO }, CTC: { ...ZERO }, F: { ...ZERO }, Est: { ...ZERO },
    estVar: 0, comp: 0, prevForecast: 0, calcHrs: 0, wsRisk: 0, isNew: false, stale: false,
  } as ProjectionItem;
  base[slice] = { ...ZERO, qty: b.qty, hours: b.hours, cost: b.cost };
  return base;
}

/** All metrics belonging to the given group, in catalog order. */
export function groupMetrics(catalog: MetricsCatalog, groupId: string): Metric[] {
  return catalog.metrics.filter((m) => m.group === groupId);
}

/**
 * Aggregate a group (CTD | OE | F) across sources: SUM the bases, then resolve
 * every metric in that group on the sums.
 * Returns `{ [metricId]: resolvedValue }`.
 */
export function aggregateGroup(
  catalog: MetricsCatalog,
  groupId: string,
  sources: ServiceSource[],
): Record<string, number> {
  const sum = sources.reduce(
    (a, s) => {
      const b = groupBases(groupId, s);
      return { qty: a.qty + b.qty, hours: a.hours + b.hours, cost: a.cost + b.cost };
    },
    { qty: 0, hours: 0, cost: 0 },
  );
  const item = synthItem(SLICE_OF[groupId] ?? 'CTD', sum);
  const out: Record<string, number> = {};
  for (const m of groupMetrics(catalog, groupId)) {
    out[m.id] = resolveMetricValue(item, m, { catalog, prevItems: [] });
  }
  return out;
}

/**
 * The UC ($/unit) for a group across sources.
 * Returns null when there is no `uc` metric in the group, or when the value is
 * zero / non-finite (e.g. empty sources → divide-by-zero → 0 → null).
 */
export function groupUC(
  catalog: MetricsCatalog,
  groupId: string,
  sources: ServiceSource[],
): number | null {
  const ucMetric = groupMetrics(catalog, groupId).find((m) => m.field === 'uc');
  if (!ucMetric) return null;
  const v = aggregateGroup(catalog, groupId, sources)[ucMetric.id];
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}
