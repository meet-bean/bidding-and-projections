export interface MetricGroup {
  id: string;
  name: string;
  color: string;
}

export type MetricType = 'vista-upload' | 'formula' | 'carry-over';

export interface MetricFallback {
  type: MetricType;
  source?: string;
}

export interface Metric {
  id: string;
  name: string;
  aliases: string[];
  group: string | null;
  field: 'qty' | 'hours' | 'cost' | 'uc' | 'mpu' | 'upm' | 'service' | 'costType' | 'description' | 'unitOfMeasure';
  type: MetricType;
  formula: string | null;
  formulaRefs: string[];
  carryOverSource?: string;
  fallback?: MetricFallback;
  vistaField?: string;
  editable?: boolean;
  /** Display format. Defaults are derived from `field` when omitted. */
  format?: 'currency' | 'number' | 'percent';
}

export interface MetricsCatalog {
  tenantId: string;
  metrics: Metric[];
  groups: MetricGroup[];
}

export interface DetectionResult {
  columnIndex: number;
  columnHeader: string;
  sampleValue: string;
  matched: boolean;
  metricId: string | null;
  formulaGuess: { expression: string; refs: string[] } | null;
  group: Metric['group'];
  type: Metric['type'];
  skipped: boolean;
}

export interface DetectionSummary {
  results: DetectionResult[];
  recognizedCount: number;
  newCount: number;
  structure: 'flat' | 'breakout';
  breakoutPattern: string | null;
}
