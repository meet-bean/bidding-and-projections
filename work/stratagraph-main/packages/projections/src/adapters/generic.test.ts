import { describe, it, expect } from 'vitest';
import { parseWithMetrics } from './generic.js';
import type { DetectionResult } from '../metrics/types.js';
import type { ProjectionItem } from '../types.js';

function makeDetectionResult(overrides: Partial<DetectionResult> & Pick<DetectionResult, 'columnIndex' | 'columnHeader'>): DetectionResult {
  return {
    sampleValue: '',
    matched: true,
    metricId: null,
    formulaGuess: null,
    group: null,
    type: 'vista-upload',
    skipped: false,
    ...overrides,
  };
}

describe('parseWithMetrics', () => {
  it('maps flat rows to ProjectionItems', () => {
    const mappedColumns: DetectionResult[] = [
      makeDetectionResult({ columnIndex: 0, columnHeader: 'Phase', metricId: 'phase', group: null, type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 1, columnHeader: 'CostType UM', metricId: 'costtype-um', group: null, type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 2, columnHeader: 'F Qty', metricId: 'f-qty', group: 'F', type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 3, columnHeader: 'F Cost', metricId: 'f-cost', group: 'F', type: 'vista-upload' }),
    ];

    const fieldMap: Record<string, { group: string | null; field: string }> = {
      'phase': { group: null, field: 'service' },
      'costtype-um': { group: null, field: 'costType' },
      'f-qty': { group: 'F', field: 'qty' },
      'f-cost': { group: 'F', field: 'cost' },
    };

    const rows = [
      { 'Phase': 'B-100', 'CostType UM': '2Labor', 'F Qty': 1500, 'F Cost': 48000 },
      { 'Phase': 'B-200', 'CostType UM': '3Material', 'F Qty': 200, 'F Cost': 15000 },
    ];

    const result = parseWithMetrics(rows, mappedColumns, fieldMap, 'flat');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.lineKey).toBe('B-100|2Labor');
    expect(result.items[0]!.F.qty).toBe(1500);
    expect(result.items[0]!.F.cost).toBe(48000);
    expect(result.items[1]!.lineKey).toBe('B-200|3Material');
    expect(result.warnings).toHaveLength(0);
  });

  it('skips columns flagged as skipped', () => {
    const mappedColumns: DetectionResult[] = [
      makeDetectionResult({ columnIndex: 0, columnHeader: 'Phase', metricId: 'phase', group: null, type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 1, columnHeader: 'CostType UM', metricId: 'costtype-um', group: null, type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 2, columnHeader: 'Notes', matched: false, skipped: true }),
    ];

    const fieldMap: Record<string, { group: string | null; field: string }> = {
      'phase': { group: null, field: 'service' },
      'costtype-um': { group: null, field: 'costType' },
    };

    const rows = [{ 'Phase': 'B-100', 'CostType UM': '2Labor', 'Notes': 'test' }];
    const result = parseWithMetrics(rows, mappedColumns, fieldMap, 'flat');
    expect(result.items).toHaveLength(1);
  });

  it('flags formula verification warnings', () => {
    const mappedColumns: DetectionResult[] = [
      makeDetectionResult({ columnIndex: 0, columnHeader: 'Phase', metricId: 'phase', group: null, type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 1, columnHeader: 'CostType UM', metricId: 'costtype-um', group: null, type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 2, columnHeader: 'F Qty', metricId: 'f-qty', group: 'F', type: 'vista-upload' }),
      makeDetectionResult({ columnIndex: 3, columnHeader: 'F Cost', metricId: 'f-cost', group: 'F', type: 'vista-upload' }),
      makeDetectionResult({
        columnIndex: 4, columnHeader: 'F UC', metricId: 'f-uc', group: 'F', type: 'formula',
        formulaGuess: { expression: '= F Cost / F Qty', refs: ['f-cost', 'f-qty'] },
      }),
    ];

    const fieldMap: Record<string, { group: string | null; field: string }> = {
      'phase': { group: null, field: 'service' },
      'costtype-um': { group: null, field: 'costType' },
      'f-qty': { group: 'F', field: 'qty' },
      'f-cost': { group: 'F', field: 'cost' },
      'f-uc': { group: 'F', field: 'uc' },
    };

    const rows = [
      { 'Phase': 'B-100', 'CostType UM': '2Labor', 'F Qty': 1500, 'F Cost': 48000, 'F UC': 999 },
    ];

    const result = parseWithMetrics(rows, mappedColumns, fieldMap, 'flat');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('F UC');
  });
});
