/**
 * DonutChart - Atomic recharts-based donut chart.
 *
 * Wraps recharts `<PieChart>` in `ChartContainer` so theming flows through
 * the `ChartConfig` CSS variables (`--color-<key>`) emitted by
 * `<ChartStyle>`. Optional `centerSlot` is absolutely positioned over the
 * donut hole.
 *
 * Lives at a deep import path
 * (`@repo/ui/components/charts/donut-chart`) to avoid a name collision
 * with the legacy visx `DonutChart` still re-exported from `@repo/ui`.
 *
 * @example
 * ```tsx
 * import { DonutChart } from '@repo/ui/components/charts/donut-chart';
 *
 * <DonutChart
 *   data={[{ key: 'pending', value: 30 }, { key: 'done', value: 70 }]}
 *   config={{
 *     pending: { label: 'Pending', color: 'var(--chart-1)' },
 *     done: { label: 'Done', color: 'var(--chart-2)' },
 *   }}
 *   centerSlot={<span>100 total</span>}
 * />
 * ```
 */

import { forwardRef, type ReactNode } from 'react';
import { Pie, PieChart } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface DonutDatum {
  /** Key matching a `ChartConfig` entry. Used as the slice color via `var(--color-<key>)`. */
  key: string;
  /** Numeric value for the slice. */
  value: number;
}

export interface DonutChartProps {
  /** Data points to render as donut slices. */
  data: DonutDatum[];
  /** ChartConfig describing the labels/colors for each `key`. */
  config: ChartConfig;
  /**
   * Inner radius of the donut. Accepts a pixel number or a percentage string
   * (e.g. `'60%'`). Percentage strings cause recharts to scale the radius
   * relative to the container, preventing clipping in small containers.
   * Defaults to `'60%'`.
   */
  innerRadius?: number | string;
  /**
   * Outer radius of the donut. Accepts a pixel number or a percentage string
   * (e.g. `'80%'`). Defaults to `'80%'`.
   */
  outerRadius?: number | string;
  /** Optional content rendered absolutely centered over the donut hole. */
  centerSlot?: ReactNode;
  /** Additional class names merged onto the root element. */
  className?: string;
}

export const DonutChart = forwardRef<HTMLDivElement, DonutChartProps>(function DonutChart(
  { data, config, innerRadius = '60%', outerRadius = '80%', centerSlot, className },
  ref
) {
  // Recharts wants `fill` keyed off chart CSS vars set by ChartContainer.
  const chartData = data.map((d) => ({
    name: d.key,
    value: d.value,
    fill: `var(--color-${d.key})`,
  }));

  return (
    <div ref={ref} className={cn('relative aspect-square', className)} data-slot="donut-chart">
      <ChartContainer config={config} className="h-full w-full">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            strokeWidth={2}
          />
        </PieChart>
      </ChartContainer>
      {centerSlot && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {centerSlot}
        </div>
      )}
    </div>
  );
});

DonutChart.displayName = 'DonutChart';
