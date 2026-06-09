import type { Metric, MetricsCatalog, ProjectionItem, ServiceSource } from '@repo/projections';
import { resolveMetricValue } from '@repo/projections';

const ZERO = { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 };

function synthItem(ctd: { qty: number; hours: number; cost: number }): ProjectionItem {
  return {
    lineKey: '',
    keyParts: [],
    label: '',
    unitOfMeasure: '',
    CTP: { ...ZERO },
    CTD: { ...ZERO, qty: ctd.qty, hours: ctd.hours, cost: ctd.cost },
    CTC: { ...ZERO },
    F: { ...ZERO },
    Est: { ...ZERO },
    estVar: 0,
    comp: 0,
    prevForecast: 0,
    calcHrs: 0,
    wsRisk: 0,
    isNew: false,
    stale: false,
  };
}

/** CTD-group metrics in catalog order. */
export function ctdMetrics(catalog: MetricsCatalog): Metric[] {
  return catalog.metrics.filter((m) => m.group === 'CTD');
}

/** Resolve every CTD metric for a single CTD base triple → { [metricId]: value }. */
export function resolveCtd(
  catalog: MetricsCatalog,
  ctd: { qty: number; hours: number; cost: number },
): Record<string, number> {
  const item = synthItem(ctd);
  const out: Record<string, number> = {};
  for (const m of ctdMetrics(catalog)) {
    out[m.id] = resolveMetricValue(item, m, { catalog, prevItems: [] });
  }
  return out;
}

/** Aggregate CTD across sources: SUM the bases, then resolve all CTD metrics on the sums. */
export function aggregateCtd(
  catalog: MetricsCatalog,
  sources: ServiceSource[],
): Record<string, number> {
  const sum = sources.reduce(
    (a, s) => ({ qty: a.qty + s.qty, hours: a.hours + s.hours, cost: a.cost + s.cost }),
    { qty: 0, hours: 0, cost: 0 },
  );
  return resolveCtd(catalog, sum);
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
