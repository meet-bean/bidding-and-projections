export interface Metric {
  id: string;
  name: string;
  aliases: string[];
  sliceGroup: 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est' | null;
  field: 'qty' | 'hours' | 'cost' | 'uc' | 'mpu' | 'upm' | 'service' | 'costType' | 'description' | 'unitOfMeasure';
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
