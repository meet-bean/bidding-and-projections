// Visx charts (legacy — slated for audit/removal in a follow-up ticket).
// Public API of @repo/ui stays unchanged: DonutChart, BarChart, LineChart,
// ChartContainer, scoreColor, BarDatum, LineSeries are still exported.
export * from './visx';

// New recharts-based atomic components are NOT re-exported here to avoid
// name collision with the visx versions while legacy consumers exist.
// Apps import recharts versions via deep paths:
//   import { DonutChart } from '@repo/ui/components/charts/donut-chart';
//   import { BarChart }   from '@repo/ui/components/charts/bar-chart';
//   import { ChartLegend } from '@repo/ui/components/charts/chart-legend';
