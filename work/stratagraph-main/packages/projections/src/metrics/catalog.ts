import type { Metric, MetricsCatalog } from './types.js';

export function createCatalog(tenantId: string): MetricsCatalog {
  return { tenantId, metrics: [] };
}

export function addMetric(catalog: MetricsCatalog, metric: Metric): MetricsCatalog {
  if (catalog.metrics.some((m) => m.id === metric.id)) return catalog;
  return { ...catalog, metrics: [...catalog.metrics, metric] };
}

export function removeMetric(catalog: MetricsCatalog, metricId: string): MetricsCatalog {
  return { ...catalog, metrics: catalog.metrics.filter((m) => m.id !== metricId) };
}

export function updateMetric(
  catalog: MetricsCatalog,
  metricId: string,
  patch: Partial<Metric>,
): MetricsCatalog {
  return {
    ...catalog,
    metrics: catalog.metrics.map((m) =>
      m.id === metricId ? { ...m, ...patch } : m,
    ),
  };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findMetricByName(
  catalog: MetricsCatalog,
  header: string,
): Metric | undefined {
  const norm = normalize(header);
  return catalog.metrics.find((m) => normalize(m.name) === norm);
}

export function findMetricByAlias(
  catalog: MetricsCatalog,
  header: string,
): Metric | undefined {
  const norm = normalize(header);
  return catalog.metrics.find((m) =>
    m.aliases.some((a) => normalize(a) === norm),
  );
}

export function findMetric(
  catalog: MetricsCatalog,
  header: string,
): Metric | undefined {
  return findMetricByName(catalog, header) ?? findMetricByAlias(catalog, header);
}
