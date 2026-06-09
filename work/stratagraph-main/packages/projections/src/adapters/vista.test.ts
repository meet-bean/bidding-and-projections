// packages/projections/src/adapters/vista.test.ts

import { describe, it, expect } from 'vitest';
import { parseSheet, num, str, splitCostTypeUM } from './vista.js';
import type { MetricsCatalog } from '../metrics/types.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal raw spreadsheet (array-of-arrays) that parseSheet can
 * consume. Row 0 is the header row, subsequent rows are data rows.
 * Each object in `dataRows` maps header name → cell value.
 */
function makeRows(
  headers: string[],
  dataRows: Record<string, unknown>[],
): unknown[][] {
  const header = headers;
  const rows: unknown[][] = [header];
  for (const dr of dataRows) {
    rows.push(headers.map((h) => dr[h] ?? null));
  }
  return rows;
}

// Minimal valid row: needs Phase, CostType UM (with a parseable costType), and
// at least one recognised column so that items.length > 0.
function minimalHeaders(): string[] {
  return ['Phase', 'CostType UM', 'F Qty', 'F Cost'];
}

function minimalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Phase: 'B-100',
    'CostType UM': '2Labor',
    'F Qty': 1000,
    'F Cost': 50000,
    ...overrides,
  };
}

// ── num() ─────────────────────────────────────────────────────────────────────
describe('num', () => {
  it('parses plain numbers', () => {
    expect(num(42)).toBe(42);
    expect(num(3.14)).toBeCloseTo(3.14);
  });

  it('parses comma-formatted strings', () => {
    expect(num('1,234.56')).toBeCloseTo(1234.56);
  });

  it('returns 0 for empty / null / undefined', () => {
    expect(num('')).toBe(0);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });

  it('returns 0 for non-numeric strings', () => {
    expect(num('abc')).toBe(0);
  });
});

// ── str() ─────────────────────────────────────────────────────────────────────
describe('str', () => {
  it('converts values to trimmed strings', () => {
    expect(str('  hello  ')).toBe('hello');
    expect(str(42)).toBe('42');
  });

  it('returns empty string for null / undefined', () => {
    expect(str(null)).toBe('');
    expect(str(undefined)).toBe('');
  });
});

// ── splitCostTypeUM() ─────────────────────────────────────────────────────────
describe('splitCostTypeUM', () => {
  it('splits "2Labor" correctly', () => {
    expect(splitCostTypeUM('2Labor')).toEqual({ costType: '2Labor', um: '' });
  });

  it('splits "3Material LF" correctly', () => {
    expect(splitCostTypeUM('3Material LF')).toEqual({ costType: '3Material', um: 'LF' });
  });

  it('handles empty string', () => {
    expect(splitCostTypeUM('')).toEqual({ costType: '', um: '' });
  });
});

// ── parseSheet() — baseline ───────────────────────────────────────────────────
describe('parseSheet', () => {
  it('parses a minimal sheet into ProjectionItems', () => {
    const rows = makeRows(minimalHeaders(), [minimalRow()]);
    const { items } = parseSheet(rows, 0);
    expect(items).toHaveLength(1);
    expect(items[0]!.lineKey).toContain('B-100');
    expect(items[0]!.F.qty).toBe(1000);
    expect(items[0]!.F.cost).toBe(50000);
  });

  it('returns empty items when required columns are missing', () => {
    const rows = [['NotPhase', 'NotCostTypeUM'], ['x', 'y']];
    const { items } = parseSheet(rows, 0);
    expect(items).toHaveLength(0);
  });

  it('skips rows with empty Phase', () => {
    const rows = makeRows(minimalHeaders(), [
      minimalRow(),
      { Phase: '', 'CostType UM': '2Labor', 'F Qty': 0, 'F Cost': 0 },
    ]);
    const { items } = parseSheet(rows, 0);
    expect(items).toHaveLength(1);
  });
});

// ── parseSheet() — extended metric population (Task 7) ────────────────────────
describe('parseSheet extended metric values', () => {
  /**
   * A catalog with one extended metric:
   * - id: 'bond-cost'
   * - type: 'vista-upload'   → uploaded column
   * - group: null / field that classifyMetric will classify as 'extended'
   *   (group is null and field is 'cost', so no SLICE_BY_GROUP entry → extended)
   * - vistaField: 'Bond Cost' → matches the column header in the spreadsheet
   */
  function makeCatalog(): MetricsCatalog {
    return {
      tenantId: 'superior',
      metrics: [
        {
          id: 'bond-cost',
          name: 'Bond Cost',
          aliases: [],
          group: null,       // null group → classifyMetric returns 'extended'
          field: 'cost',
          type: 'vista-upload',
          formula: null,
          formulaRefs: [],
          vistaField: 'Bond Cost',
        },
      ],
      groups: [],
    };
  }

  it('populates item.values[bond-cost] when catalog is provided', () => {
    const headers = [...minimalHeaders(), 'Bond Cost'];
    const rows = makeRows(headers, [
      { ...minimalRow(), 'Bond Cost': 5000 },
    ]);

    const { items } = parseSheet(rows, 0, makeCatalog());

    expect(items).toHaveLength(1);
    expect(items[0]!.values).toBeDefined();
    expect(items[0]!.values!['bond-cost']).toBe(5000);
  });

  it('populates values for multiple rows independently', () => {
    const headers = [...minimalHeaders(), 'Bond Cost'];
    const rows = makeRows(headers, [
      { ...minimalRow({ Phase: 'B-100', 'F Cost': 50000 }), 'Bond Cost': 5000 },
      { ...minimalRow({ Phase: 'B-200', 'CostType UM': '3Material', 'F Cost': 20000 }), 'Bond Cost': 1500 },
    ]);

    const { items } = parseSheet(rows, 0, makeCatalog());

    expect(items).toHaveLength(2);
    expect(items[0]!.values!['bond-cost']).toBe(5000);
    expect(items[1]!.values!['bond-cost']).toBe(1500);
  });

  it('does NOT populate values when catalog is absent (no-op)', () => {
    const headers = [...minimalHeaders(), 'Bond Cost'];
    const rows = makeRows(headers, [
      { ...minimalRow(), 'Bond Cost': 5000 },
    ]);

    const { items } = parseSheet(rows, 0); // no catalog

    expect(items).toHaveLength(1);
    expect(items[0]!.values).toBeUndefined();
  });

  it('ignores extended metrics whose vistaField does not match any header', () => {
    const headers = [...minimalHeaders()]; // 'Bond Cost' column absent
    const rows = makeRows(headers, [minimalRow()]);

    const { items } = parseSheet(rows, 0, makeCatalog());

    expect(items).toHaveLength(1);
    // values should remain undefined (no match)
    expect(items[0]!.values).toBeUndefined();
  });

  it('ignores standard metrics (group+field maps to a TimeSlice cell)', () => {
    // f-cost is group:'F', field:'cost' → standard → should NOT appear in values
    const catalogWithStandard: MetricsCatalog = {
      tenantId: 'superior',
      metrics: [
        {
          id: 'f-cost',
          name: 'F Cost',
          aliases: [],
          group: 'F',
          field: 'cost',
          type: 'vista-upload',
          formula: null,
          formulaRefs: [],
          vistaField: 'F Cost',
        },
      ],
      groups: [],
    };

    const headers = minimalHeaders();
    const rows = makeRows(headers, [minimalRow()]);

    const { items } = parseSheet(rows, 0, catalogWithStandard);

    expect(items).toHaveLength(1);
    // Standard metric must NOT be written into values (it's in F.cost)
    expect(items[0]!.values?.['f-cost']).toBeUndefined();
  });

  it('parses comma-formatted numbers into values', () => {
    const headers = [...minimalHeaders(), 'Bond Cost'];
    const rows = makeRows(headers, [
      { ...minimalRow(), 'Bond Cost': '12,345.67' },
    ]);

    const { items } = parseSheet(rows, 0, makeCatalog());

    expect(items[0]!.values!['bond-cost']).toBeCloseTo(12345.67);
  });

  it('skips non-finite values (does not set NaN/Infinity in values)', () => {
    const headers = [...minimalHeaders(), 'Bond Cost'];
    const rows = makeRows(headers, [
      { ...minimalRow(), 'Bond Cost': 'not-a-number' },
    ]);

    const { items } = parseSheet(rows, 0, makeCatalog());

    // 'not-a-number' → num() returns 0, which is finite — but the plan says
    // only set when Number.isFinite(n). num() already returns 0 for bad input,
    // and 0 IS finite, so it WILL be set. Let's verify num-0 is stored.
    // (If the impl uses parseFloat directly and gets NaN, it should skip.)
    // With our num() helper 'not-a-number' → 0, which is finite → stored as 0.
    expect(items[0]!.values!['bond-cost']).toBe(0);
  });
});
