import type { MetricsCatalog, DetectionResult, DetectionSummary } from '../metrics/types.js';
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
        formulaGuess: metric.type === 'formula' ? { expression: metric.formula ?? '', refs: metric.formulaRefs } : null,
        group: metric.group,
        type: metric.type,
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
      group: null,
      type: formulaGuess ? 'formula' as const : 'vista-upload' as const,
      skipped: false,
    };
  });

  const serviceResults = results.filter((r) => r.matched && catalog.metrics.find((m) => m.id === r.metricId)?.field === 'service');
  let structureInfo: { structure: 'flat' | 'breakout'; breakoutPattern: string | null } = { structure: 'flat', breakoutPattern: null };

  if (serviceResults.length > 0) {
    const serviceHeader = serviceResults[0]!.columnHeader;
    const serviceNames = sampleRows.map((row) => String(row[serviceHeader] ?? ''));
    structureInfo = detectStructure(serviceNames);
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
  serviceNames: string[],
): { structure: 'flat' | 'breakout'; breakoutPattern: string | null } {
  const suffixPattern = /^(.+?)\s*[-–]\s*(Labor|Material|Rental|SubCont|Equipment|Parts|Fuel|Health|Other)$/i;
  const withSuffix = serviceNames.filter((item) => suffixPattern.test(item));
  const ratio = serviceNames.length > 0 ? withSuffix.length / serviceNames.length : 0;

  if (ratio >= 0.2 && withSuffix.length >= 2) {
    const match = withSuffix[0]!.match(suffixPattern);
    const separator = match ? ` - ` : '';
    return { structure: 'breakout', breakoutPattern: `{parent}${separator}{suffix}` };
  }

  return { structure: 'flat', breakoutPattern: null };
}
