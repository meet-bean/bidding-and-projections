# Mapping Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a metrics catalog + auto-detecting spreadsheet mapper that lets any customer upload any XLSX, auto-recognize columns, confirm/correct in a dialog, and import normalized projection items — with the Vista adapter as fallback.

**Architecture:** Metrics are the backbone — a per-tenant catalog of known column types (raw or formula). The auto-detection engine matches uploaded file headers against the catalog, detects formula columns by sampling data, and surfaces only unrecognized columns in a mapper dialog during project creation. The generic parser uses the metric-to-column mapping to normalize rows into `ProjectionItem[]`. The Vista adapter stays untouched as fallback.

**Tech Stack:** TypeScript, Vitest, Zustand, React 19, TanStack Router, shadcn/ui Dialog + Badge + Button, `xlsx` library (already in deps), `@repo/projections` package, `@repo/ui` shared components.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/projections/src/metrics/types.ts` | Create | `Metric` type definition |
| `packages/projections/src/metrics/catalog.ts` | Create | Pure functions: CRUD, lookup, alias matching |
| `packages/projections/src/metrics/catalog.test.ts` | Create | Unit tests for catalog functions |
| `packages/projections/src/detection/detect.ts` | Create | Auto-detection engine: header matching, formula detection, structure detection |
| `packages/projections/src/detection/detect.test.ts` | Create | Unit tests for detection engine |
| `packages/projections/src/adapters/generic.ts` | Create | Generic parser: metric-mapped columns → `ProjectionItem[]` |
| `packages/projections/src/adapters/generic.test.ts` | Create | Unit tests for generic parser |
| `packages/projections/src/index.ts` | Modify | Re-export new modules |
| `apps/web/src/lib/store.ts` | Modify | Add `metrics` slice (per-tenant) |
| `apps/web/src/lib/tenant.ts` | Modify | Add "Metrics" to admin nav |
| `apps/web/src/components/mapping-dialog.tsx` | Create | Mapper dialog modal (column-per-row review) |
| `apps/web/src/routes/_dashboard/admin.metrics.tsx` | Create | Metrics admin page (CRUD table) |
| `apps/web/src/components/projection-upload.tsx` | Modify | Wire auto-detection + mapper dialog into upload flow |

---

### Task 1: Metric Type Definition

**Files:**
- Create: `packages/projections/src/metrics/types.ts`

- [ ] **Step 1: Create the Metric type**

```typescript
// packages/projections/src/metrics/types.ts

export interface Metric {
  id: string;
  name: string;
  aliases: string[];
  sliceGroup: 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est' | null;
  field: 'qty' | 'hours' | 'cost' | 'uc' | 'mpu' | 'upm' | 'lineItem' | 'costType' | 'description' | 'unitOfMeasure';
  kind: 'raw' | 'formula';
  formula: string | null;
  formulaRefs: string[];
}

export interface MetricsCatalog {
  tenantId: string;
  metrics: Metric[];
}

export interface DetectionResult {
  columnIndex: number;
  columnHeader: string;
  sampleValue: string;
  matched: boolean;
  metricId: string | null;
  formulaGuess: { expression: string; refs: string[] } | null;
  sliceGroup: Metric['sliceGroup'];
  kind: Metric['kind'];
  skipped: boolean;
}

export interface DetectionSummary {
  results: DetectionResult[];
  recognizedCount: number;
  newCount: number;
  structure: 'flat' | 'breakout';
  breakoutPattern: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/projections/src/metrics/types.ts
git commit -m "feat(projections): add Metric and DetectionResult type definitions"
```

---

### Task 2: Metrics Catalog — Pure Functions

**Files:**
- Create: `packages/projections/src/metrics/catalog.ts`
- Create: `packages/projections/src/metrics/catalog.test.ts`

- [ ] **Step 1: Write failing tests for catalog operations**

```typescript
// packages/projections/src/metrics/catalog.test.ts

import { describe, it, expect } from 'vitest';
import {
  createCatalog,
  addMetric,
  removeMetric,
  updateMetric,
  findMetricByName,
  findMetricByAlias,
} from './catalog.js';
import type { Metric, MetricsCatalog } from './types.js';

const SAMPLE_METRIC: Metric = {
  id: 'f-cost',
  name: 'F Cost',
  aliases: ['Forecast Cost', 'Proj Cost'],
  sliceGroup: 'F',
  field: 'cost',
  kind: 'raw',
  formula: null,
  formulaRefs: [],
};

describe('createCatalog', () => {
  it('creates an empty catalog for a tenant', () => {
    const cat = createCatalog('superior');
    expect(cat.tenantId).toBe('superior');
    expect(cat.metrics).toEqual([]);
  });
});

describe('addMetric', () => {
  it('adds a metric to the catalog', () => {
    const cat = createCatalog('superior');
    const next = addMetric(cat, SAMPLE_METRIC);
    expect(next.metrics).toHaveLength(1);
    expect(next.metrics[0]!.id).toBe('f-cost');
  });

  it('does not mutate the original catalog', () => {
    const cat = createCatalog('superior');
    addMetric(cat, SAMPLE_METRIC);
    expect(cat.metrics).toHaveLength(0);
  });

  it('rejects duplicate ids', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    const next = addMetric(cat, SAMPLE_METRIC);
    expect(next.metrics).toHaveLength(1);
  });
});

describe('removeMetric', () => {
  it('removes a metric by id', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    const next = removeMetric(cat, 'f-cost');
    expect(next.metrics).toHaveLength(0);
  });
});

describe('updateMetric', () => {
  it('patches a metric by id', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    const next = updateMetric(cat, 'f-cost', { name: 'Forecast Cost' });
    expect(next.metrics[0]!.name).toBe('Forecast Cost');
  });
});

describe('findMetricByName', () => {
  it('finds by exact name (case-insensitive)', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByName(cat, 'f cost')).toBe(SAMPLE_METRIC);
  });

  it('returns undefined for no match', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByName(cat, 'Unknown Column')).toBeUndefined();
  });
});

describe('findMetricByAlias', () => {
  it('finds by alias (case-insensitive)', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByAlias(cat, 'forecast cost')).toBe(SAMPLE_METRIC);
  });

  it('returns undefined when no alias matches', () => {
    const cat = addMetric(createCatalog('superior'), SAMPLE_METRIC);
    expect(findMetricByAlias(cat, 'something else')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/projections && npx vitest run src/metrics/catalog.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement catalog functions**

```typescript
// packages/projections/src/metrics/catalog.ts

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/projections && npx vitest run src/metrics/catalog.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/metrics/
git commit -m "feat(projections): add metrics catalog with CRUD and lookup functions"
```

---

### Task 3: Auto-Detection Engine

**Files:**
- Create: `packages/projections/src/detection/detect.ts`
- Create: `packages/projections/src/detection/detect.test.ts`

- [ ] **Step 1: Write failing tests for detection**

```typescript
// packages/projections/src/detection/detect.test.ts

import { describe, it, expect } from 'vitest';
import { detectColumns, detectFormula, detectStructure } from './detect.js';
import { createCatalog, addMetric } from '../metrics/catalog.js';
import type { Metric } from '../metrics/types.js';

const F_QTY: Metric = {
  id: 'f-qty', name: 'F Qty', aliases: ['Forecast Qty'],
  sliceGroup: 'F', field: 'qty', kind: 'raw', formula: null, formulaRefs: [],
};
const F_HOURS: Metric = {
  id: 'f-hours', name: 'F Hours', aliases: [],
  sliceGroup: 'F', field: 'hours', kind: 'raw', formula: null, formulaRefs: [],
};
const F_COST: Metric = {
  id: 'f-cost', name: 'F Cost', aliases: ['Forecast Cost'],
  sliceGroup: 'F', field: 'cost', kind: 'raw', formula: null, formulaRefs: [],
};
const PHASE: Metric = {
  id: 'phase', name: 'Phase', aliases: [],
  sliceGroup: null, field: 'lineItem', kind: 'raw', formula: null, formulaRefs: [],
};

function buildCatalog() {
  let cat = createCatalog('test');
  cat = addMetric(cat, PHASE);
  cat = addMetric(cat, F_QTY);
  cat = addMetric(cat, F_HOURS);
  cat = addMetric(cat, F_COST);
  return cat;
}

describe('detectColumns', () => {
  it('matches known columns by name', () => {
    const catalog = buildCatalog();
    const headers = ['Phase', 'F Qty', 'F Cost', 'Unknown Col'];
    const rows = [
      { 'Phase': 'B-100', 'F Qty': 1200, 'F Cost': 48000, 'Unknown Col': 'notes' },
    ];
    const result = detectColumns(headers, rows, catalog);
    expect(result.recognizedCount).toBe(3);
    expect(result.newCount).toBe(1);
    expect(result.results[0]!.matched).toBe(true);
    expect(result.results[0]!.metricId).toBe('phase');
    expect(result.results[3]!.matched).toBe(false);
  });

  it('matches by alias', () => {
    const catalog = buildCatalog();
    const headers = ['Forecast Cost'];
    const rows = [{ 'Forecast Cost': 50000 }];
    const result = detectColumns(headers, rows, catalog);
    expect(result.results[0]!.matched).toBe(true);
    expect(result.results[0]!.metricId).toBe('f-cost');
  });
});

describe('detectFormula', () => {
  it('detects division formula from sample data', () => {
    const columnValues = [32, 40, 25];
    const otherColumns = {
      'F Cost': [48000, 60000, 50000],
      'F Qty': [1500, 1500, 2000],
    };
    const result = detectFormula('F UC', columnValues, otherColumns);
    expect(result).not.toBeNull();
    expect(result!.expression).toBe('= F Cost / F Qty');
  });

  it('detects subtraction formula', () => {
    const columnValues = [14400, 12000, 8000];
    const otherColumns = {
      'F Cost': [48000, 60000, 50000],
      'CTD Cost': [33600, 48000, 42000],
    };
    const result = detectFormula('CTC Cost', columnValues, otherColumns);
    expect(result).not.toBeNull();
    expect(result!.expression).toContain('-');
  });

  it('returns null when no formula fits', () => {
    const columnValues = [1, 2, 3];
    const otherColumns = { 'A': [100, 200, 300] };
    const result = detectFormula('Random', columnValues, otherColumns);
    expect(result).toBeNull();
  });
});

describe('detectStructure', () => {
  it('detects flat structure when no suffix patterns found', () => {
    const lineItems = ['B-100', 'B-200', 'B-300'];
    const result = detectStructure(lineItems);
    expect(result.structure).toBe('flat');
    expect(result.breakoutPattern).toBeNull();
  });

  it('detects breakout structure with suffix patterns', () => {
    const lineItems = [
      'B-100', 'B-100 - Labor', 'B-100 - Material',
      'B-200', 'B-200 - Labor',
    ];
    const result = detectStructure(lineItems);
    expect(result.structure).toBe('breakout');
    expect(result.breakoutPattern).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/projections && npx vitest run src/detection/detect.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement detection engine**

```typescript
// packages/projections/src/detection/detect.ts

import type { Metric, MetricsCatalog, DetectionResult, DetectionSummary } from '../metrics/types.js';
import { findMetric } from '../metrics/catalog.js';

export function detectColumns(
  headers: string[],
  sampleRows: Record<string, unknown>[],
  catalog: MetricsCatalog,
): DetectionSummary {
  const otherColumns: Record<string, number[]> = {};
  for (const h of headers) {
    otherColumns[h] = sampleRows.map((row) => {
      const v = row[h];
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    });
  }

  const results: DetectionResult[] = headers.map((header, columnIndex) => {
    const sampleValue = sampleRows[0] != null ? String(sampleRows[0][header] ?? '') : '';
    const metric = findMetric(catalog, header);

    if (metric) {
      return {
        columnIndex,
        columnHeader: header,
        sampleValue,
        matched: true,
        metricId: metric.id,
        formulaGuess: metric.kind === 'formula' ? { expression: metric.formula ?? '', refs: metric.formulaRefs } : null,
        sliceGroup: metric.sliceGroup,
        kind: metric.kind,
        skipped: false,
      };
    }

    const columnValues = otherColumns[header]!;
    const formulaGuess = detectFormula(header, columnValues, otherColumns);

    return {
      columnIndex,
      columnHeader: header,
      sampleValue,
      matched: false,
      metricId: null,
      formulaGuess,
      sliceGroup: null,
      kind: formulaGuess ? 'formula' as const : 'raw' as const,
      skipped: false,
    };
  });

  const lineItemResults = results.filter((r) => r.matched && catalog.metrics.find((m) => m.id === r.metricId)?.field === 'lineItem');
  let structureInfo = { structure: 'flat' as const, breakoutPattern: null as string | null };

  if (lineItemResults.length > 0) {
    const lineItemHeader = lineItemResults[0]!.columnHeader;
    const lineItems = sampleRows.map((row) => String(row[lineItemHeader] ?? ''));
    structureInfo = detectStructure(lineItems);
  }

  return {
    results,
    recognizedCount: results.filter((r) => r.matched).length,
    newCount: results.filter((r) => !r.matched).length,
    ...structureInfo,
  };
}

export function detectFormula(
  columnName: string,
  columnValues: number[],
  otherColumns: Record<string, number[]>,
): { expression: string; refs: string[] } | null {
  const others = Object.entries(otherColumns).filter(([name]) => name !== columnName);
  const sampleCount = columnValues.length;
  if (sampleCount === 0) return null;

  for (let i = 0; i < others.length; i++) {
    const [nameA, valsA] = others[i]!;
    for (let j = 0; j < others.length; j++) {
      if (i === j) continue;
      const [nameB, valsB] = others[j]!;

      if (checkFormula(columnValues, valsA, valsB, (a, b) => b !== 0 ? a / b : null)) {
        return { expression: `= ${nameA} / ${nameB}`, refs: [nameA, nameB] };
      }
      if (checkFormula(columnValues, valsA, valsB, (a, b) => a - b)) {
        return { expression: `= ${nameA} - ${nameB}`, refs: [nameA, nameB] };
      }
      if (checkFormula(columnValues, valsA, valsB, (a, b) => a * b)) {
        return { expression: `= ${nameA} * ${nameB}`, refs: [nameA, nameB] };
      }
      if (checkFormula(columnValues, valsA, valsB, (a, b) => a + b)) {
        return { expression: `= ${nameA} + ${nameB}`, refs: [nameA, nameB] };
      }
    }
  }

  return null;
}

function checkFormula(
  expected: number[],
  valsA: number[],
  valsB: number[],
  op: (a: number, b: number) => number | null,
): boolean {
  const tolerance = 0.01;
  let matchCount = 0;
  let checkCount = 0;

  for (let k = 0; k < expected.length; k++) {
    const computed = op(valsA[k]!, valsB[k]!);
    if (computed === null) continue;
    checkCount++;
    if (Math.abs(computed - expected[k]!) <= Math.abs(expected[k]!) * tolerance + 0.001) {
      matchCount++;
    }
  }

  return checkCount >= 2 && matchCount === checkCount;
}

export function detectStructure(
  lineItems: string[],
): { structure: 'flat' | 'breakout'; breakoutPattern: string | null } {
  const suffixPattern = /^(.+?)\s*[-–]\s*(Labor|Material|Rental|SubCont|Equipment|Parts|Fuel|Health|Other)$/i;
  const withSuffix = lineItems.filter((item) => suffixPattern.test(item));
  const ratio = lineItems.length > 0 ? withSuffix.length / lineItems.length : 0;

  if (ratio >= 0.2 && withSuffix.length >= 2) {
    const match = withSuffix[0]!.match(suffixPattern);
    const separator = match ? ` - ` : '';
    return { structure: 'breakout', breakoutPattern: `{parent}${separator}{suffix}` };
  }

  return { structure: 'flat', breakoutPattern: null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/projections && npx vitest run src/detection/detect.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/detection/
git commit -m "feat(projections): add auto-detection engine with header matching and formula detection"
```

---

### Task 4: Generic Parser

**Files:**
- Create: `packages/projections/src/adapters/generic.ts`
- Create: `packages/projections/src/adapters/generic.test.ts`

- [ ] **Step 1: Write failing tests for the generic parser**

```typescript
// packages/projections/src/adapters/generic.test.ts

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
    sliceGroup: null,
    kind: 'raw',
    skipped: false,
    ...overrides,
  };
}

describe('parseWithMetrics', () => {
  it('maps flat rows to ProjectionItems', () => {
    const mappedColumns: DetectionResult[] = [
      makeDetectionResult({ columnIndex: 0, columnHeader: 'Phase', metricId: 'phase', sliceGroup: null, kind: 'raw' }),
      makeDetectionResult({ columnIndex: 1, columnHeader: 'CostType UM', metricId: 'costtype-um', sliceGroup: null, kind: 'raw' }),
      makeDetectionResult({ columnIndex: 2, columnHeader: 'F Qty', metricId: 'f-qty', sliceGroup: 'F', kind: 'raw' }),
      makeDetectionResult({ columnIndex: 3, columnHeader: 'F Cost', metricId: 'f-cost', sliceGroup: 'F', kind: 'raw' }),
    ];

    const fieldMap: Record<string, { sliceGroup: string | null; field: string }> = {
      'phase': { sliceGroup: null, field: 'lineItem' },
      'costtype-um': { sliceGroup: null, field: 'costType' },
      'f-qty': { sliceGroup: 'F', field: 'qty' },
      'f-cost': { sliceGroup: 'F', field: 'cost' },
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
      makeDetectionResult({ columnIndex: 0, columnHeader: 'Phase', metricId: 'phase', sliceGroup: null, kind: 'raw' }),
      makeDetectionResult({ columnIndex: 1, columnHeader: 'CostType UM', metricId: 'costtype-um', sliceGroup: null, kind: 'raw' }),
      makeDetectionResult({ columnIndex: 2, columnHeader: 'Notes', matched: false, skipped: true }),
    ];

    const fieldMap: Record<string, { sliceGroup: string | null; field: string }> = {
      'phase': { sliceGroup: null, field: 'lineItem' },
      'costtype-um': { sliceGroup: null, field: 'costType' },
    };

    const rows = [{ 'Phase': 'B-100', 'CostType UM': '2Labor', 'Notes': 'test' }];
    const result = parseWithMetrics(rows, mappedColumns, fieldMap, 'flat');
    expect(result.items).toHaveLength(1);
  });

  it('flags formula verification warnings', () => {
    const mappedColumns: DetectionResult[] = [
      makeDetectionResult({ columnIndex: 0, columnHeader: 'Phase', metricId: 'phase', sliceGroup: null, kind: 'raw' }),
      makeDetectionResult({ columnIndex: 1, columnHeader: 'CostType UM', metricId: 'costtype-um', sliceGroup: null, kind: 'raw' }),
      makeDetectionResult({ columnIndex: 2, columnHeader: 'F Qty', metricId: 'f-qty', sliceGroup: 'F', kind: 'raw' }),
      makeDetectionResult({ columnIndex: 3, columnHeader: 'F Cost', metricId: 'f-cost', sliceGroup: 'F', kind: 'raw' }),
      makeDetectionResult({
        columnIndex: 4, columnHeader: 'F UC', metricId: 'f-uc', sliceGroup: 'F', kind: 'formula',
        formulaGuess: { expression: '= F Cost / F Qty', refs: ['f-cost', 'f-qty'] },
      }),
    ];

    const fieldMap: Record<string, { sliceGroup: string | null; field: string }> = {
      'phase': { sliceGroup: null, field: 'lineItem' },
      'costtype-um': { sliceGroup: null, field: 'costType' },
      'f-qty': { sliceGroup: 'F', field: 'qty' },
      'f-cost': { sliceGroup: 'F', field: 'cost' },
      'f-uc': { sliceGroup: 'F', field: 'uc' },
    };

    const rows = [
      { 'Phase': 'B-100', 'CostType UM': '2Labor', 'F Qty': 1500, 'F Cost': 48000, 'F UC': 999 },
    ];

    const result = parseWithMetrics(rows, mappedColumns, fieldMap, 'flat');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('F UC');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/projections && npx vitest run src/adapters/generic.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement generic parser**

```typescript
// packages/projections/src/adapters/generic.ts

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
    let lineItemValue = '';
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
        if (mapping.field === 'lineItem') lineItemValue = strVal;
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
              `${col.columnHeader}: file says ${numVal}, formula gives ${computed.toFixed(2)} for ${lineItemValue}`,
            );
          }
        }
      }
    }

    if (!lineItemValue) continue;

    const item: ProjectionItem = {
      lineKey: makeLineKey(lineItemValue, costTypeValue),
      keyParts: [lineItemValue, costTypeValue],
      label: descriptionValue || lineItemValue,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/projections && npx vitest run src/adapters/generic.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/projections/src/adapters/generic.ts packages/projections/src/adapters/generic.test.ts
git commit -m "feat(projections): add generic parser using metric-mapped columns"
```

---

### Task 5: Export New Modules from Package Index

**Files:**
- Modify: `packages/projections/src/index.ts`

- [ ] **Step 1: Add exports for metrics and detection modules**

Add to `packages/projections/src/index.ts`:

```typescript
export * from './metrics/types';
export * from './metrics/catalog';
export * from './detection/detect';
export { parseWithMetrics } from './adapters/generic';
```

- [ ] **Step 2: Add package.json exports entries**

Add to `packages/projections/package.json` exports:

```json
"./metrics": "./src/metrics/types.ts",
"./detection": "./src/detection/detect.ts"
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd packages/projections && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/projections/src/index.ts packages/projections/package.json
git commit -m "feat(projections): export metrics catalog and detection engine from package"
```

---

### Task 6: Store — Add Metrics Slice

**Files:**
- Modify: `apps/web/src/lib/store.ts`

- [ ] **Step 1: Add metrics state and actions to the store interface**

Add to the `StratagraphState` interface in `store.ts` (after the projections section around line 491):

```typescript
  // Metrics catalog (per-tenant)
  metricsCatalog: MetricsCatalog;
  addMetricToStore: (metric: Metric) => void;
  removeMetricFromStore: (metricId: string) => void;
  updateMetricInStore: (metricId: string, patch: Partial<Metric>) => void;
```

- [ ] **Step 2: Add the imports**

Add to the imports at the top of `store.ts`:

```typescript
import type { Metric, MetricsCatalog } from '@repo/projections';
import { createCatalog, addMetric, removeMetric, updateMetric } from '@repo/projections';
```

- [ ] **Step 3: Add the initial state and action implementations**

Add to the store creation (after the `updateActiveProjection` action around line 1097):

```typescript
  metricsCatalog: createCatalog(_initialTenant),
  addMetricToStore: (metric) =>
    set((s) => ({ metricsCatalog: addMetric(s.metricsCatalog, metric) })),
  removeMetricFromStore: (metricId) =>
    set((s) => ({ metricsCatalog: removeMetric(s.metricsCatalog, metricId) })),
  updateMetricInStore: (metricId, patch) =>
    set((s) => ({ metricsCatalog: updateMetric(s.metricsCatalog, metricId, patch) })),
```

- [ ] **Step 4: Reset metrics catalog on tenant switch**

In the `setTenant` action (around line 1056), add `metricsCatalog: createCatalog(id)` to the set call:

```typescript
  setTenant: (id) => {
    if (typeof window !== 'undefined') localStorage.setItem('tenant', id);
    const seed = seedForTenant(id);
    set({
      tenantId: id,
      ...seed,
      notifications: [],
      projectionProjects: id === 'superior' ? [SEED_SUNCOAST_3A] : [],
      metricsCatalog: createCatalog(id),
    });
  },
```

- [ ] **Step 5: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/store.ts
git commit -m "feat(store): add metrics catalog slice with per-tenant reset"
```

---

### Task 7: Metrics Admin Page

**Files:**
- Create: `apps/web/src/routes/_dashboard/admin.metrics.tsx`
- Modify: `apps/web/src/lib/tenant.ts` (add nav entry)

- [ ] **Step 1: Add the route to sidebar navigation**

In `apps/web/src/lib/tenant.ts`, add to the `children` array of the `admin` nav item in `OPERATIONS_NAV` (after the `admin-yards` entry):

```typescript
      { id: 'admin-metrics', label: 'Metrics', href: '/admin/metrics', icon: 'Calculator' },
```

Also add it to `PROJECTIONS_NAV` so Superior sees it — insert before the closing `]`:

```typescript
const PROJECTIONS_NAV: NavItem[] = [
  { id: 'home', label: 'Dashboard', href: '/home', icon: 'Home' },
  { id: 'projections', label: 'Projections', href: '/projections', icon: 'BarChart3' },
  {
    id: 'admin',
    label: 'Admin',
    href: '/admin/metrics',
    icon: 'Settings',
    defaultOpen: true,
    children: [
      { id: 'admin-metrics', label: 'Metrics', href: '/admin/metrics', icon: 'Calculator' },
    ],
  },
];
```

- [ ] **Step 2: Create the metrics admin page**

```typescript
// apps/web/src/routes/_dashboard/admin.metrics.tsx

import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useStore } from '~/lib/store';
import { uid } from '@repo/projections';
import type { Metric } from '@repo/projections';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';

export const Route = createFileRoute('/_dashboard/admin/metrics')({
  component: MetricsPage,
});

const SLICE_OPTIONS = [
  { value: '', label: 'None (identifier)' },
  { value: 'CTP', label: 'CTP' },
  { value: 'CTD', label: 'CTD' },
  { value: 'CTC', label: 'CTC' },
  { value: 'F', label: 'Forecast' },
  { value: 'Est', label: 'Estimate' },
];

const FIELD_OPTIONS = [
  { value: 'qty', label: 'Quantity' },
  { value: 'hours', label: 'Hours' },
  { value: 'cost', label: 'Cost' },
  { value: 'uc', label: 'Unit Cost' },
  { value: 'mpu', label: 'Man-Per-Unit' },
  { value: 'upm', label: 'Units-Per-Man' },
  { value: 'lineItem', label: 'Line Item ID' },
  { value: 'costType', label: 'Cost Type' },
  { value: 'description', label: 'Description' },
  { value: 'unitOfMeasure', label: 'Unit of Measure' },
];

function MetricsPage() {
  const catalog = useStore((s) => s.metricsCatalog);
  const addMetric = useStore((s) => s.addMetricToStore);
  const removeMetric = useStore((s) => s.removeMetricFromStore);
  const updateMetric = useStore((s) => s.updateMetricInStore);
  const [editing, setEditing] = useState<Metric | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleNew = () => {
    setEditing({
      id: uid(),
      name: '',
      aliases: [],
      sliceGroup: null,
      field: 'qty',
      kind: 'raw',
      formula: null,
      formulaRefs: [],
    });
    setIsNew(true);
  };

  const handleEdit = (metric: Metric) => {
    setEditing({ ...metric });
    setIsNew(false);
  };

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      addMetric(editing);
    } else {
      updateMetric(editing.id, editing);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    const refs = catalog.metrics.filter((m) => m.formulaRefs.includes(id));
    if (refs.length > 0) {
      alert(`Cannot delete: referenced by ${refs.map((m) => m.name).join(', ')}`);
      return;
    }
    removeMetric(id);
  };

  const columnHelper = createColumnHelper<Metric>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Metric" />,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('sliceGroup', {
        id: 'sliceGroup',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Slice" />,
        cell: (info) => {
          const v = info.getValue();
          return v ? <Badge variant="outline">{v}</Badge> : <span className="text-muted-foreground">—</span>;
        },
        size: 100,
      }),
      columnHelper.accessor('field', {
        id: 'field',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Field" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
        size: 140,
      }),
      columnHelper.accessor('kind', {
        id: 'kind',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Kind" />,
        cell: (info) => (
          <Badge variant={info.getValue() === 'formula' ? 'secondary' : 'outline'}>
            {info.getValue()}
          </Badge>
        ),
        size: 100,
      }),
      columnHelper.accessor('formula', {
        id: 'formula',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Formula" />,
        cell: (info) => {
          const v = info.getValue();
          return v
            ? <code className="text-xs bg-muted px-2 py-0.5 rounded">{v}</code>
            : <span className="text-muted-foreground">—</span>;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => null,
        cell: (info) => {
          const metric = info.row.original;
          return (
            <div className="flex gap-1">
              <button className="text-muted-foreground hover:text-foreground p-1" onClick={(e) => { e.stopPropagation(); handleEdit(metric); }}>
                <Pencil className="size-3.5" />
              </button>
              <button className="text-muted-foreground hover:text-destructive p-1" onClick={(e) => { e.stopPropagation(); handleDelete(metric.id); }}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        },
        size: 70,
      }),
    ],
    [columnHelper, handleEdit, handleDelete],
  );

  return (
    <>
      <DataListShell
        data={catalog.metrics}
        columns={columns}
        searchPlaceholder="Search metrics..."
        searchableKeys={['name', 'field', 'formula']}
        filters={[
          {
            id: 'kind',
            label: 'Kind',
            options: [
              { value: 'raw', label: 'Raw' },
              { value: 'formula', label: 'Formula' },
            ],
          },
          {
            id: 'sliceGroup',
            label: 'Slice',
            options: SLICE_OPTIONS.filter((o) => o.value).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          },
        ]}
        emptyMessage="No metrics yet. They'll appear here as you upload spreadsheets, or you can create them manually."
        actions={
          <Button onClick={handleNew}>
            <Plus />
            New Metric
          </Button>
        }
      />

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isNew ? 'New Metric' : 'Edit Metric'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. F Cost"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Aliases (comma-separated)</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.aliases.join(', ')}
                  onChange={(e) => setEditing({ ...editing, aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Forecast Cost, Proj Cost"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Slice Group</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={editing.sliceGroup ?? ''}
                    onChange={(e) => setEditing({ ...editing, sliceGroup: (e.target.value || null) as Metric['sliceGroup'] })}
                  >
                    {SLICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Field</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={editing.field}
                    onChange={(e) => setEditing({ ...editing, field: e.target.value as Metric['field'] })}
                  >
                    {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Kind</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as 'raw' | 'formula' })}
                >
                  <option value="raw">Raw data</option>
                  <option value="formula">Formula</option>
                </select>
              </div>
              {editing.kind === 'formula' && (
                <div>
                  <label className="text-sm font-medium">Formula</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                    value={editing.formula ?? ''}
                    onChange={(e) => setEditing({ ...editing, formula: e.target.value || null })}
                    placeholder="= F Cost / F Qty"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!editing.name.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify the page renders**

Run: `cd apps/web && npx vite dev`
Navigate to `/?tenant=superior`, then click Admin → Metrics in sidebar.
Expected: Empty metrics table with "New Metric" button. Creating a metric should add a row.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_dashboard/admin.metrics.tsx apps/web/src/lib/tenant.ts
git commit -m "feat(web): add metrics admin page under admin navigation"
```

---

### Task 8: Mapping Dialog Component

**Files:**
- Create: `apps/web/src/components/mapping-dialog.tsx`

- [ ] **Step 1: Create the mapping dialog**

```typescript
// apps/web/src/components/mapping-dialog.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
} from '@repo/ui';
import { Check, X, AlertTriangle } from 'lucide-react';
import { useStore } from '~/lib/store';
import { uid } from '@repo/projections';
import type { Metric } from '@repo/projections';
import type { DetectionResult, DetectionSummary } from '@repo/projections';

interface MappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detection: DetectionSummary;
  onConfirm: (results: DetectionResult[]) => void;
  showOnlyNew?: boolean;
}

const SLICE_OPTIONS = ['CTP', 'CTD', 'CTC', 'F', 'Est'] as const;
const FIELD_OPTIONS = ['qty', 'hours', 'cost', 'uc', 'mpu', 'upm', 'lineItem', 'costType', 'description', 'unitOfMeasure'] as const;

export function MappingDialog({
  open,
  onOpenChange,
  detection,
  onConfirm,
  showOnlyNew = false,
}: MappingDialogProps) {
  const catalog = useStore((s) => s.metricsCatalog);
  const addMetric = useStore((s) => s.addMetricToStore);
  const [results, setResults] = useState<DetectionResult[]>(detection.results);

  const visibleResults = showOnlyNew
    ? results.filter((r) => !r.matched)
    : results;

  const updateResult = (index: number, patch: Partial<DetectionResult>) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const handleConfirm = () => {
    for (const r of results) {
      if (!r.matched && !r.skipped && r.metricId) {
        const existingMetric = catalog.metrics.find((m) => m.id === r.metricId);
        if (!existingMetric) {
          addMetric({
            id: r.metricId,
            name: r.columnHeader,
            aliases: [],
            sliceGroup: r.sliceGroup,
            field: r.kind === 'formula' ? 'uc' : 'qty',
            kind: r.kind,
            formula: r.formulaGuess?.expression ?? null,
            formulaRefs: r.formulaGuess?.refs ?? [],
          });
        }
      }
    }
    onConfirm(results);
  };

  const handleSkipAll = () => {
    const updated = results.map((r) => (r.matched ? r : { ...r, skipped: true }));
    onConfirm(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Columns</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {detection.recognizedCount} columns recognized
            {detection.newCount > 0 && ` · ${detection.newCount} new columns to review`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Column</th>
                <th className="text-left py-2 font-medium w-24">Sample</th>
                <th className="text-left py-2 font-medium w-36">Detected As</th>
                <th className="text-left py-2 font-medium">Formula</th>
                <th className="text-left py-2 font-medium w-20">Slice</th>
                <th className="text-center py-2 font-medium w-16">Include</th>
              </tr>
            </thead>
            <tbody>
              {visibleResults.map((r) => {
                const globalIndex = results.indexOf(r);
                return (
                  <tr
                    key={r.columnIndex}
                    className={`border-b ${
                      r.skipped ? 'opacity-40' :
                      r.matched ? '' :
                      r.formulaGuess ? 'bg-amber-50 dark:bg-amber-950/20' :
                      'bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <td className="py-2 font-medium">{r.columnHeader}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground truncate max-w-24">
                      {r.sampleValue}
                    </td>
                    <td className="py-2">
                      {r.matched ? (
                        <Badge variant="outline" className="text-xs">
                          <Check className="size-3 mr-1" />
                          {r.metricId}
                        </Badge>
                      ) : (
                        <select
                          className="w-full rounded border px-2 py-1 text-xs"
                          value={r.metricId ?? '__new__'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__new__') {
                              const newId = `custom-${uid()}`;
                              updateResult(globalIndex, { metricId: newId });
                            } else {
                              const metric = catalog.metrics.find((m) => m.id === val);
                              if (metric) {
                                updateResult(globalIndex, {
                                  metricId: metric.id,
                                  sliceGroup: metric.sliceGroup,
                                  kind: metric.kind,
                                });
                              }
                            }
                          }}
                        >
                          <option value="__new__">— New metric —</option>
                          {catalog.metrics.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2">
                      {r.formulaGuess ? (
                        <code className="text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                          {r.formulaGuess.expression}
                        </code>
                      ) : r.matched ? (
                        <span className="text-muted-foreground text-xs">— raw data</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">— not recognized</span>
                      )}
                    </td>
                    <td className="py-2">
                      {r.sliceGroup ? (
                        <Badge variant="secondary" className="text-xs">{r.sliceGroup}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => updateResult(globalIndex, { skipped: !r.skipped })}
                        className={`rounded p-1 ${r.skipped ? 'text-muted-foreground' : 'text-green-600'}`}
                      >
                        {r.skipped ? <X className="size-4" /> : <Check className="size-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {detection.structure === 'breakout' && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs">
            <AlertTriangle className="size-3.5 text-amber-600" />
            <span>Breakout structure detected (parent/child rows with suffix pattern)</span>
          </div>
        )}

        <DialogFooter>
          {detection.newCount > 0 && (
            <Button variant="ghost" onClick={handleSkipAll} className="mr-auto">
              Skip All New
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mapping-dialog.tsx
git commit -m "feat(web): add mapping dialog component for column review during upload"
```

---

### Task 9: Wire Upload Flow — Detection + Mapper + Fallback

**Files:**
- Modify: `apps/web/src/components/projection-upload.tsx`

- [ ] **Step 1: Update projection-upload to integrate detection and mapper dialog**

Replace the contents of `apps/web/src/components/projection-upload.tsx` with:

```typescript
'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
} from '@repo/ui';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { parseBatchUpload, detectColumns } from '@repo/projections';
import type { ProjectionAdapter, BatchUploadResult, DetectionSummary, DetectionResult } from '@repo/projections';
import { parseWithMetrics } from '@repo/projections';
import { useStore } from '~/lib/store';
import { MappingDialog } from './mapping-dialog';
import * as XLSX from 'xlsx';

interface ProjectionUploadProps {
  adapter: ProjectionAdapter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchImport: (result: BatchUploadResult) => void;
}

export function ProjectionUpload({
  adapter,
  open,
  onOpenChange,
  onBatchImport,
}: ProjectionUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<BatchUploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [detection, setDetection] = useState<DetectionSummary | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [rawSheetData, setRawSheetData] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useStore((s) => s.metricsCatalog);

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    setFiles(arr);
    setLoading(true);

    try {
      const file = arr[0]!;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0]!;
      const sheet = workbook.Sheets[sheetName]!;
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]!) : [];
      const sampleRows = jsonRows.slice(0, 20);

      setRawSheetData({ headers, rows: jsonRows });

      const detectionResult = detectColumns(headers, sampleRows, catalog);
      setDetection(detectionResult);

      if (detectionResult.newCount > 0) {
        setShowMapper(true);
      } else {
        await runGenericParse(detectionResult.results, jsonRows, arr);
      }
    } catch (e) {
      console.error('Generic detection failed, falling back to Vista adapter', e);
      try {
        const result = await parseBatchUpload(arr);
        setPreview(result);
      } catch (e2) {
        console.error('Vista fallback also failed', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const runGenericParse = async (
    mappedColumns: DetectionResult[],
    rows: Record<string, unknown>[],
    originalFiles: File[],
  ) => {
    const fieldMap: Record<string, { sliceGroup: string | null; field: string }> = {};
    for (const col of mappedColumns) {
      if (col.metricId && !col.skipped) {
        const metric = catalog.metrics.find((m) => m.id === col.metricId);
        if (metric) {
          fieldMap[col.metricId] = { sliceGroup: metric.sliceGroup, field: metric.field };
        }
      }
    }

    const structure = detection?.structure ?? 'flat';
    const parseResult = parseWithMetrics(rows, mappedColumns, fieldMap, structure);

    if (parseResult.items.length === 0) {
      console.warn('Generic parser produced 0 items, falling back to Vista adapter');
      const result = await parseBatchUpload(originalFiles);
      setPreview(result);
      return;
    }

    const batchResult: BatchUploadResult = {
      cycles: [{
        file: originalFiles[0]?.name ?? 'upload',
        tab: null,
        type: 'vista-dump',
        detectedDate: null,
        label: `Upload ${new Date().toLocaleDateString()}`,
        rowCount: parseResult.items.length,
        items: parseResult.items,
        notes: {},
      }],
      financials: null,
      errors: [],
    };

    if (parseResult.warnings.length > 0) {
      for (const w of parseResult.warnings) {
        batchResult.errors.push({ file: originalFiles[0]?.name ?? 'upload', message: `Warning: ${w}` });
      }
    }

    setPreview(batchResult);
  };

  const handleMapperConfirm = async (mappedResults: DetectionResult[]) => {
    setShowMapper(false);
    if (rawSheetData) {
      await runGenericParse(mappedResults, rawSheetData.rows, files);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    onBatchImport(preview);
    handleClose();
  };

  const handleClose = () => {
    setFiles([]);
    setPreview(null);
    setDetection(null);
    setShowMapper(false);
    setRawSheetData(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showMapper} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Projection Data</DialogTitle>
          </DialogHeader>

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Spreadsheet files (.xls, .xlsx, .csv)
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept=".xls,.xlsx,.csv"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {loading && (
            <p className="text-center text-sm text-muted-foreground py-2">Analyzing file...</p>
          )}

          {preview && !loading && (
            <div className="space-y-2">
              {preview.errors.length > 0 && (
                <div className="space-y-1">
                  {preview.errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    >
                      <AlertCircle className="size-3 shrink-0" />
                      <span>
                        {err.file}: {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {preview.cycles.map((cycle, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-success" />
                    <div>
                      <p className="text-sm font-medium">{cycle.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {cycle.file} · {cycle.rowCount} items
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Auto-detected
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!preview?.cycles.length}>
              Import{' '}
              {preview?.cycles.length
                ? `${preview.cycles.length} version${preview.cycles.length !== 1 ? 's' : ''}`
                : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showMapper && detection && (
        <MappingDialog
          open={showMapper}
          onOpenChange={(open) => {
            if (!open) {
              setShowMapper(false);
              setLoading(false);
            }
          }}
          detection={detection}
          onConfirm={handleMapperConfirm}
          showOnlyNew={detection.recognizedCount > 0}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify the full flow works**

Run: `cd apps/web && npx vite dev`
Navigate to `/?tenant=superior`, open Projections, click upload.
1. First upload with empty catalog → mapper dialog should appear showing all columns
2. Confirm columns → metrics should be added to catalog (check Admin → Metrics)
3. Upload same file again → mapper should NOT appear (all columns known)
4. If detection fails → should fall back to Vista parser silently

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/projection-upload.tsx
git commit -m "feat(web): wire auto-detection, mapper dialog, and Vista fallback into upload flow"
```

---

### Task 10: Run All Tests and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all projections package tests**

Run: `cd packages/projections && npx vitest run`
Expected: All tests in metrics/catalog.test.ts, detection/detect.test.ts, and adapters/generic.test.ts pass.

- [ ] **Step 2: Run typecheck across the monorepo**

Run: `npx turbo typecheck`
Expected: No type errors.

- [ ] **Step 3: Test the end-to-end flow in the browser**

Run: `cd apps/web && npx vite dev`

Test these scenarios:
1. Navigate to `/?tenant=superior`
2. Go to Admin → Metrics — should be empty
3. Go to Projections → upload a file
4. Mapper dialog appears with all columns detected
5. Review auto-detected types and formulas
6. Confirm & Import → data appears in projection table
7. Check Admin → Metrics — all confirmed metrics should be listed
8. Upload the same file again → no mapper dialog, silent import
9. Create a new metric manually in Admin → Metrics → it appears in the catalog

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete mapping template system — metrics catalog, auto-detection, mapper dialog, generic parser"
```
