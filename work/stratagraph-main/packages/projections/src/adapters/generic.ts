import type { ProjectionItem, TimeSlice } from '../types.js';
import type { DetectionResult } from '../metrics/types.js';
import { blankSlice, deriveItem, makeLineKey } from '../engine.js';
import { splitCostTypeUM } from './vista.js';

interface FieldMapping {
  sliceGroup: string | null;
  field: string;
}

interface ParseResult {
  items: ProjectionItem[];
  warnings: string[];
}

const SLICE_KEYS = ['CTP', 'CTD', 'CTC', 'F', 'Est'] as const;
const SLICE_FIELDS = ['qty', 'hours', 'cost', 'uc', 'mpu', 'upm'] as const;

export function parseWithMetrics(
  rows: Record<string, unknown>[],
  mappedColumns: DetectionResult[],
  fieldMap: Record<string, FieldMapping>,
  structure: 'flat' | 'breakout',
): ParseResult {
  const warnings: string[] = [];
  const items: ProjectionItem[] = [];

  const activeColumns = mappedColumns.filter((c) => !c.skipped && c.metricId);

  for (const row of rows) {
    let serviceValue = '';
    let costTypeValue = '';
    let descriptionValue = '';
    let umValue = '';

    const slices: Record<string, Partial<TimeSlice>> = {};
    for (const sk of SLICE_KEYS) slices[sk] = {};

    for (const col of activeColumns) {
      const mapping = col.metricId ? fieldMap[col.metricId] : null;
      if (!mapping) continue;

      const rawValue = row[col.columnHeader];

      if (mapping.sliceGroup === null) {
        const strVal = String(rawValue ?? '');
        if (mapping.field === 'service') serviceValue = strVal;
        else if (mapping.field === 'costType') {
          const parsed = splitCostTypeUM(strVal);
          costTypeValue = parsed.costType;
          umValue = parsed.um;
        }
        else if (mapping.field === 'description') descriptionValue = strVal;
        else if (mapping.field === 'unitOfMeasure') umValue = strVal;
        continue;
      }

      const numVal = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0;
      const sk = mapping.sliceGroup as typeof SLICE_KEYS[number];
      const sf = mapping.field as typeof SLICE_FIELDS[number];

      if (slices[sk] && SLICE_FIELDS.includes(sf)) {
        (slices[sk] as Record<string, number>)[sf] = numVal;
      }

      if (col.kind === 'formula' && col.formulaGuess) {
        const refs = col.formulaGuess.refs;
        const refColumns = activeColumns.filter((c) => c.metricId && refs.includes(c.metricId));
        if (refColumns.length === 2) {
          const valA = typeof row[refColumns[0]!.columnHeader] === 'number'
            ? row[refColumns[0]!.columnHeader] as number
            : parseFloat(String(row[refColumns[0]!.columnHeader])) || 0;
          const valB = typeof row[refColumns[1]!.columnHeader] === 'number'
            ? row[refColumns[1]!.columnHeader] as number
            : parseFloat(String(row[refColumns[1]!.columnHeader])) || 0;

          let computed: number | null = null;
          if (col.formulaGuess.expression.includes('/') && valB !== 0) computed = valA / valB;
          else if (col.formulaGuess.expression.includes('-')) computed = valA - valB;
          else if (col.formulaGuess.expression.includes('*')) computed = valA * valB;
          else if (col.formulaGuess.expression.includes('+')) computed = valA + valB;

          if (computed !== null && Math.abs(computed - numVal) > Math.abs(numVal) * 0.05 + 0.01) {
            warnings.push(
              `${col.columnHeader}: file says ${numVal}, formula gives ${computed.toFixed(2)} for ${serviceValue}`,
            );
          }
        }
      }
    }

    if (!serviceValue) continue;

    const item: ProjectionItem = {
      lineKey: makeLineKey(serviceValue, costTypeValue),
      keyParts: [serviceValue, costTypeValue],
      label: descriptionValue || serviceValue,
      unitOfMeasure: umValue,
      CTP: { ...blankSlice(), ...slices['CTP'] },
      CTD: { ...blankSlice(), ...slices['CTD'] },
      CTC: { ...blankSlice(), ...slices['CTC'] },
      F: { ...blankSlice(), ...slices['F'] },
      Est: { ...blankSlice(), ...slices['Est'] },
      estVar: 0,
      comp: 0,
      prevForecast: 0,
      calcHrs: 0,
      wsRisk: 0,
      isNew: false,
      stale: false,
    };

    items.push(deriveItem(item));
  }

  return { items, warnings };
}
