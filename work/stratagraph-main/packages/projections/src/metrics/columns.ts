// packages/projections/src/metrics/columns.ts
import type { Metric, MetricsCatalog } from './types';
import { classifyMetric } from './resolver';

export interface MetricColumn {
  id: string;
  name: string;
  group: string | null;
  color: string | null;
  editable: boolean;
  format: 'currency' | 'number' | 'percent';
  metric: Metric;
}

function deriveFormat(metric: Metric): 'currency' | 'number' | 'percent' {
  if (metric.format) return metric.format;
  if (metric.field === 'cost' || metric.field === 'uc') return 'currency';
  if (metric.id.endsWith('-pct')) return 'percent';
  return 'number';
}

/**
 * Build the ordered list of value columns from the catalog.
 * Identity-field metrics are excluded. Order = group order from the catalog,
 * with `group: null` metrics appended last (the "Analytics" section).
 */
export function buildMetricColumns(catalog: MetricsCatalog): MetricColumn[] {
  const order = new Map<string, number>();
  catalog.groups.forEach((g, i) => order.set(g.id, i));
  const colorOf = (gid: string | null) =>
    gid ? catalog.groups.find((g) => g.id === gid)?.color ?? null : null;

  const value = catalog.metrics.filter((m) => classifyMetric(m).kind !== 'identity');

  const rank = (m: Metric) => (m.group && order.has(m.group) ? order.get(m.group)! : Number.MAX_SAFE_INTEGER);
  // Stable sort by group rank; preserve catalog order within a group.
  return value
    .map((metric, i) => ({ metric, i }))
    .sort((a, b) => rank(a.metric) - rank(b.metric) || a.i - b.i)
    .map(({ metric }) => ({
      id: metric.id,
      name: metric.name,
      group: metric.group,
      color: colorOf(metric.group),
      editable: metric.editable ?? false,
      format: deriveFormat(metric),
      metric,
    }));
}
