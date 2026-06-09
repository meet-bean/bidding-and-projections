import type { Metric } from './types';

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
