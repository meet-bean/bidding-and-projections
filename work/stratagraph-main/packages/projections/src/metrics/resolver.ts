import type { Metric, MetricsCatalog } from './types';
import type { ProjectionItem } from '../types';

/** Matches SLICE.field reference tokens, e.g. F.cost, CTD.qty, LMF.cost. */
const REF_TOKEN = /[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*/g;

/**
 * Evaluate an arithmetic formula whose operands are SLICE.field references.
 * `resolve` maps each reference token to a number. Division by zero and any
 * non-finite result collapse to 0 (matching the engine's derived-field rules).
 */
export function evalFormula(
  formula: string,
  resolve: (token: string) => number,
): number {
  // Substitute every reference token with its resolved numeric value.
  const substituted = formula.replace(REF_TOKEN, (token) => {
    const v = resolve(token);
    return Number.isFinite(v) ? `(${v})` : '(0)';
  });

  // The substituted string must now be numbers + operators only.
  if (!/^[\d\s+\-*/().]*$/.test(substituted)) return 0;

  try {
    // eslint-disable-next-line no-new-func
    const result = Number(new Function(`"use strict"; return (${substituted});`)());
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

/** Group id → TimeSlice key. OE is stored under the `Est` slice. */
export const SLICE_BY_GROUP: Record<string, 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'> = {
  CTP: 'CTP', CTD: 'CTD', CTC: 'CTC', F: 'F', OE: 'Est',
};

const NUMERIC_SLICE_FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;
const IDENTITY_FIELDS = ['service', 'costType', 'description', 'unitOfMeasure'] as const;

export type MetricClass =
  | { kind: 'standard'; slice: 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'; field: 'qty' | 'hours' | 'upm' | 'mpu' | 'uc' | 'cost' }
  | { kind: 'extended' }
  | { kind: 'identity' };

/**
 * Decide how a metric's value is stored:
 * - `identity`: row-defining text field, not a value column.
 * - `standard`: maps onto an existing TimeSlice cell (read item[slice][field]).
 * - `extended`: lives in item.values[metric.id].
 */
export function classifyMetric(metric: Metric): MetricClass {
  if ((IDENTITY_FIELDS as readonly string[]).includes(metric.field)) {
    return { kind: 'identity' };
  }
  const slice = metric.group ? SLICE_BY_GROUP[metric.group] : undefined;
  if (slice && (NUMERIC_SLICE_FIELDS as readonly string[]).includes(metric.field)) {
    return { kind: 'standard', slice, field: metric.field as 'qty' | 'hours' | 'upm' | 'mpu' | 'uc' | 'cost' };
  }
  return { kind: 'extended' };
}

export interface ResolveCtx {
  catalog: MetricsCatalog;
  /** Previous version's items, for carry-over metrics. */
  prevItems: ProjectionItem[];
  /** Internal: cycle-detection set (metric ids currently resolving). */
  _visiting?: Set<string>;
}

/** Find the metric whose group maps to `slice` and whose field is `field`. */
function metricForSliceField(
  catalog: MetricsCatalog, slice: string, field: string,
): Metric | undefined {
  const groupId = Object.keys(SLICE_BY_GROUP).find((g) => SLICE_BY_GROUP[g] === slice);
  return catalog.metrics.find((m) => m.group === groupId && m.field === field);
}

/**
 * Resolve a single metric's value for one line.
 * Precedence: editable override → type-based resolution.
 */
export function resolveMetricValue(
  item: ProjectionItem,
  metric: Metric,
  ctx: ResolveCtx,
): number {
  // 1. Editable override always wins.
  if (metric.editable && item.values && metric.id in item.values) {
    return item.values[metric.id] ?? 0;
  }

  const cls = classifyMetric(metric);
  if (cls.kind === 'identity') return 0;

  // 2. Standard cell read.
  if (cls.kind === 'standard') {
    return item[cls.slice][cls.field] ?? 0;
  }

  // 3. Extended: by type.
  if (metric.type === 'formula' && metric.formula) {
    const visiting = ctx._visiting ?? new Set<string>();
    if (visiting.has(metric.id)) return 0; // cycle guard
    visiting.add(metric.id);
    const childCtx: ResolveCtx = { ...ctx, _visiting: visiting };
    const value = evalFormula(metric.formula, (token) => {
      const dotIdx = token.indexOf('.');
      const sliceTok = dotIdx >= 0 ? token.slice(0, dotIdx) : token;
      const fieldTok = dotIdx >= 0 ? token.slice(dotIdx + 1) : '';
      // LMF.cost → the New Projection metric; otherwise the slice/field metric.
      const slice = SLICE_BY_GROUP[sliceTok];
      const ref =
        sliceTok === 'LMF'
          ? ctx.catalog.metrics.find((mm) => mm.id === 'lmf')
          : slice
            ? metricForSliceField(ctx.catalog, slice, fieldTok)
            : undefined;
      return ref ? resolveMetricValue(item, ref, childCtx) : 0;
    });
    visiting.delete(metric.id);
    return value;
  }

  if (metric.type === 'carry-over') {
    const src = metric.carryOverSource ?? metric.id;
    const prev = ctx.prevItems.find((p) => p.lineKey === item.lineKey);
    if (prev?.values && src in prev.values) return prev.values[src] ?? 0;
    const srcMetric = ctx.catalog.metrics.find((mm) => mm.id === src);
    if (prev && srcMetric) return resolveMetricValue(prev, srcMetric, { ...ctx, prevItems: [] });
    return 0;
  }

  // vista-upload extended metric with no standard cell → generic store.
  return item.values?.[metric.id] ?? 0;
}
