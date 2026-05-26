/**
 * Standardized type definitions for all chart components.
 * Each chart type has a well-defined input schema so consumers
 * can swap chart variants without restructuring data.
 */

// ─── Shared ────────────────────────────────────────────────

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const defaultMargin: ChartMargin = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 50,
};

// ─── Donut / Pie ───────────────────────────────────────────

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  /** 0 = full pie, 0.6 = default donut */
  innerRadiusRatio?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  colorPalette?: readonly string[];
  className?: string;
}

// ─── Line ──────────────────────────────────────────────────

export interface LinePoint {
  x: Date | number;
  y: number;
}

export interface LineSeries {
  label: string;
  color: string;
  data: LinePoint[];
}

export interface LineChartProps {
  series: LineSeries[];
  showGrid?: boolean;
  showAxes?: boolean;
  showLegend?: boolean;
  /** visx curve factory — defaults to curveMonotoneX */
  curveType?: 'linear' | 'monotone' | 'natural' | 'step';
  margin?: Partial<ChartMargin>;
  className?: string;
}

// ─── Bar ───────────────────────────────────────────────────

export interface BarValue {
  key: string;
  value: number;
  color?: string;
}

export interface BarDatum {
  label: string;
  values: BarValue[];
}

export interface BarChartProps {
  data: BarDatum[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'simple' | 'stacked' | 'grouped';
  showAxes?: boolean;
  showValues?: boolean;
  colorPalette?: readonly string[];
  barPadding?: number;
  margin?: Partial<ChartMargin>;
  className?: string;
}
