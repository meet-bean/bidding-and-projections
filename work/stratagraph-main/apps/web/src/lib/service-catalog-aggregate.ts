import type { Metric, MetricsCatalog, ServiceSource } from '@repo/projections';
import { aggregateGroup, groupMetrics } from '@repo/projections';

// Engine pieces live in @repo/projections (registry/aggregate); re-export for app code.
export { aggregateGroup, groupMetrics, groupUC } from '@repo/projections';

/** CTD-group metrics in catalog order. */
export function ctdMetrics(catalog: MetricsCatalog): Metric[] {
  return groupMetrics(catalog, 'CTD');
}

/** Resolve every CTD metric for a single CTD base triple → { [metricId]: value }. */
export function resolveCtd(
  catalog: MetricsCatalog,
  ctd: { qty: number; hours: number; cost: number },
): Record<string, number> {
  const source: ServiceSource = {
    projectId: '', lineKey: '', phaseCode: '', date: '',
    ctd, oe: { qty: 0, cost: 0 }, f: { qty: 0, cost: 0 },
  };
  return aggregateGroup(catalog, 'CTD', [source]);
}

/** Aggregate CTD across sources: SUM the bases, then resolve all CTD metrics on the sums. */
export function aggregateCtd(
  catalog: MetricsCatalog,
  sources: ServiceSource[],
): Record<string, number> {
  return aggregateGroup(catalog, 'CTD', sources);
}

/** Format a metric value for display. */
export function formatMetric(metric: Metric, value: number): string {
  const fmt =
    metric.format ?? (metric.field === 'cost' || metric.field === 'uc' ? 'currency' : 'number');
  if (fmt === 'currency') {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (fmt === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
