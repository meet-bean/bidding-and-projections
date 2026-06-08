import type { Metric, MetricGroup, MetricsCatalog } from './types.js';

const SUPERIOR_SEED_GROUPS: MetricGroup[] = [
  { id: 'CTP', name: 'Period',       color: '#fabf8f' },
  { id: 'CTD', name: 'To Date',      color: '#c2d69b' },
  { id: 'CTC', name: 'To Complete',  color: '#d9e2f3' },
  { id: 'F',   name: 'Forecast',     color: '#92cddc' },
  { id: 'OE',  name: 'Original',     color: '#e2d1f0' },
  { id: 'PRJ', name: 'Projection',   color: '#f2dcdb' },
];

const SUPERIOR_SEED_METRICS: Metric[] = [
  // ── Period (CTP) ──────────────────────────────────────
  { id: 'ctp-qty',   name: 'CTP Qty',   aliases: [],            group: 'CTP', field: 'qty',   type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'CTP Qty' },
  { id: 'ctp-hrs',   name: 'CTP Hours', aliases: [],            group: 'CTP', field: 'hours', type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'CTP Hours' },
  { id: 'ctp-um',    name: 'CTP U/M',   aliases: [],            group: 'CTP', field: 'upm',   type: 'formula', formula: 'CTP.qty / CTP.hours',      formulaRefs: ['ctp-qty', 'ctp-hrs'] },
  { id: 'ctp-mu',    name: 'CTP M/U',   aliases: [],            group: 'CTP', field: 'mpu',   type: 'formula', formula: 'CTP.hours / CTP.qty',      formulaRefs: ['ctp-hrs', 'ctp-qty'] },
  { id: 'ctp-uc',    name: 'CTP UC',    aliases: [],            group: 'CTP', field: 'uc',    type: 'formula', formula: 'CTP.cost / CTP.qty',       formulaRefs: ['ctp-cost', 'ctp-qty'] },
  { id: 'ctp-cost',  name: 'CTP Cost',  aliases: [],            group: 'CTP', field: 'cost',  type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'CTP Cost' },

  // ── To Date (CTD) ─────────────────────────────────────
  { id: 'ctd-qty',   name: 'CTD Qty',   aliases: [],            group: 'CTD', field: 'qty',   type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'CTD Qty' },
  { id: 'ctd-hrs',   name: 'CTD Hours', aliases: [],            group: 'CTD', field: 'hours', type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'CTD Hours' },
  { id: 'ctd-um',    name: 'CTD U/M',   aliases: [],            group: 'CTD', field: 'upm',   type: 'formula', formula: 'CTD.qty / CTD.hours',      formulaRefs: ['ctd-qty', 'ctd-hrs'] },
  { id: 'ctd-mu',    name: 'CTD M/U',   aliases: [],            group: 'CTD', field: 'mpu',   type: 'formula', formula: 'CTD.hours / CTD.qty',      formulaRefs: ['ctd-hrs', 'ctd-qty'] },
  { id: 'ctd-uc',    name: 'CTD UC',    aliases: [],            group: 'CTD', field: 'uc',    type: 'formula', formula: 'CTD.cost / CTD.qty',       formulaRefs: ['ctd-cost', 'ctd-qty'] },
  { id: 'ctd-cost',  name: 'CTD Cost',  aliases: [],            group: 'CTD', field: 'cost',  type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'CTD Cost' },

  // ── To Complete (CTC) ─────────────────────────────────
  { id: 'ctc-qty',   name: 'CTC Qty',   aliases: [],            group: 'CTC', field: 'qty',   type: 'formula', formula: 'F.qty - CTD.qty',          formulaRefs: ['f-qty', 'ctd-qty'] },
  { id: 'ctc-hrs',   name: 'CTC Hours', aliases: [],            group: 'CTC', field: 'hours', type: 'formula', formula: 'F.hours - CTD.hours',      formulaRefs: ['f-hrs', 'ctd-hrs'] },
  { id: 'ctc-um',    name: 'CTC U/M',   aliases: [],            group: 'CTC', field: 'upm',   type: 'formula', formula: 'CTC.qty / CTC.hours',     formulaRefs: ['ctc-qty', 'ctc-hrs'] },
  { id: 'ctc-mu',    name: 'CTC M/U',   aliases: [],            group: 'CTC', field: 'mpu',   type: 'formula', formula: 'CTC.hours / CTC.qty',     formulaRefs: ['ctc-hrs', 'ctc-qty'] },
  { id: 'ctc-uc',    name: 'CTC UC',    aliases: [],            group: 'CTC', field: 'uc',    type: 'formula', formula: 'CTC.cost / CTC.qty',      formulaRefs: ['ctc-cost', 'ctc-qty'] },
  { id: 'ctc-cost',  name: 'CTC Cost',  aliases: [],            group: 'CTC', field: 'cost',  type: 'formula', formula: 'F.cost - CTD.cost',       formulaRefs: ['f-cost', 'ctd-cost'] },

  // ── Forecast (F) ──────────────────────────────────────
  { id: 'f-qty',     name: 'F Qty',     aliases: [],            group: 'F',   field: 'qty',   type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'F Qty', editable: true },
  { id: 'f-hrs',     name: 'F Hours',   aliases: [],            group: 'F',   field: 'hours', type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'F Hours', editable: true },
  { id: 'calc-hrs',  name: 'Calc Hrs',  aliases: [],            group: 'F',   field: 'hours', type: 'formula', formula: '(CTD.hours / CTD.cost) * F.cost', formulaRefs: ['ctd-hrs', 'ctd-cost', 'f-cost'] },
  { id: 'f-um',      name: 'F U/M',     aliases: [],            group: 'F',   field: 'upm',   type: 'formula', formula: 'F.qty / F.hours',          formulaRefs: ['f-qty', 'f-hrs'] },
  { id: 'f-mu',      name: 'F M/U',     aliases: [],            group: 'F',   field: 'mpu',   type: 'formula', formula: 'F.hours / F.qty',          formulaRefs: ['f-hrs', 'f-qty'] },
  { id: 'f-uc',      name: 'F UC',      aliases: [],            group: 'F',   field: 'uc',    type: 'formula', formula: 'F.cost / F.qty',           formulaRefs: ['f-cost', 'f-qty'] },
  { id: 'f-cost',    name: 'F Cost',    aliases: [],            group: 'F',   field: 'cost',  type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'F Cost', editable: true },

  // ── Original Estimate (OE) ────────────────────────────
  { id: 'oe-qty',    name: 'OE Qty',    aliases: [],            group: 'OE',  field: 'qty',   type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'Est Qty' },
  { id: 'oe-hrs',    name: 'OE Hours',  aliases: [],            group: 'OE',  field: 'hours', type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'Est Hours' },
  { id: 'oe-um',     name: 'OE U/M',    aliases: [],            group: 'OE',  field: 'upm',   type: 'formula', formula: 'OE.qty / OE.hours',        formulaRefs: ['oe-qty', 'oe-hrs'] },
  { id: 'oe-mu',     name: 'OE M/U',    aliases: [],            group: 'OE',  field: 'mpu',   type: 'formula', formula: 'OE.hours / OE.qty',        formulaRefs: ['oe-hrs', 'oe-qty'] },
  { id: 'oe-uc',     name: 'OE UC',     aliases: [],            group: 'OE',  field: 'uc',    type: 'formula', formula: 'OE.cost / OE.qty',         formulaRefs: ['oe-cost', 'oe-qty'] },
  { id: 'oe-cost',   name: 'OE Cost',   aliases: [],            group: 'OE',  field: 'cost',  type: 'vista-upload', formula: null, formulaRefs: [], vistaField: 'Est Cost' },

  // ── Projection ────────────────────────────────────────
  { id: 'lmf',       name: 'New Projection', aliases: ['Forecast'], group: 'PRJ', field: 'cost', type: 'formula', formula: 'F.cost', formulaRefs: ['f-cost'], editable: true },
  { id: 'chg-prev',  name: 'Change From Prev',  aliases: [],    group: 'PRJ', field: 'cost',  type: 'formula', formula: 'F.cost - LMF.cost',        formulaRefs: ['f-cost', 'lmf'] },
  { id: 'left-spend',name: 'Left To Spend',     aliases: [],    group: 'PRJ', field: 'cost',  type: 'formula', formula: 'F.cost - CTD.cost',        formulaRefs: ['f-cost', 'ctd-cost'] },
  { id: 'chg-orig',  name: 'Change From Orig',  aliases: [],    group: 'PRJ', field: 'cost',  type: 'formula', formula: 'F.cost - OE.cost',         formulaRefs: ['f-cost', 'oe-cost'] },

  // ── Standalone derived columns ────────────────────────
  { id: 'qty-pct',   name: 'Qty % Complete',  aliases: [],      group: null,  field: 'qty',   type: 'formula', formula: 'CTD.qty / F.qty',          formulaRefs: ['ctd-qty', 'f-qty'] },
  { id: 'cost-pct',  name: '$ % Complete',    aliases: [],      group: null,  field: 'cost',  type: 'formula', formula: 'CTD.cost / F.cost',        formulaRefs: ['ctd-cost', 'f-cost'] },
  { id: 'risk',      name: 'Risk',            aliases: [],      group: null,  field: 'cost',  type: 'formula', formula: 'F.cost - (CTD.cost / (CTD.qty / F.qty))', formulaRefs: ['f-cost', 'ctd-cost', 'ctd-qty', 'f-qty'] },
];

export function createCatalog(tenantId: string): MetricsCatalog {
  if (tenantId === 'superior') {
    return { tenantId, metrics: [...SUPERIOR_SEED_METRICS], groups: [...SUPERIOR_SEED_GROUPS] };
  }
  return { tenantId, metrics: [], groups: [] };
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

export function addGroup(catalog: MetricsCatalog, group: MetricGroup): MetricsCatalog {
  if (catalog.groups.some((g) => g.id === group.id)) return catalog;
  return { ...catalog, groups: [...catalog.groups, group] };
}

export function updateGroup(
  catalog: MetricsCatalog,
  groupId: string,
  patch: Partial<MetricGroup>,
): MetricsCatalog {
  return {
    ...catalog,
    groups: catalog.groups.map((g) =>
      g.id === groupId ? { ...g, ...patch } : g,
    ),
  };
}

export function removeGroup(catalog: MetricsCatalog, groupId: string): MetricsCatalog {
  return {
    ...catalog,
    groups: catalog.groups.filter((g) => g.id !== groupId),
    metrics: catalog.metrics.map((m) =>
      m.group === groupId ? { ...m, group: null } : m,
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
