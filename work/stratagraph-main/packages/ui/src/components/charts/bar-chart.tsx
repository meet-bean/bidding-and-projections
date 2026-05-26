/**
 * BarChart - Atomic recharts-based bar chart.
 *
 * Wraps recharts `<BarChart>` in `ChartContainer` so theming flows through
 * the `ChartConfig` CSS variables (`--color-<key>`) emitted by
 * `<ChartStyle>`. Supports horizontal (default) and vertical layouts and
 * stacked series.
 *
 * Lives at a deep import path
 * (`@repo/ui/components/charts/bar-chart`) to avoid a name collision
 * with the legacy visx `BarChart` still re-exported from `@repo/ui`.
 *
 * Generic `T` is preserved on the props using React 19's prop-based ref
 * pattern (no `forwardRef`), so callers retain type safety on `data` /
 * `categoryKey` while still being able to pass a `ref`.
 *
 * @example
 * ```tsx
 * import { BarChart } from '@repo/ui/components/charts/bar-chart';
 *
 * <BarChart
 *   data={[{ name: 'Site A', pending: 10, inProgress: 20 }]}
 *   config={{
 *     pending: { label: 'Pending', color: 'var(--chart-1)' },
 *     inProgress: { label: 'In Progress', color: 'var(--chart-2)' },
 *   }}
 *   series={['pending', 'inProgress']}
 *   categoryKey="name"
 * />
 * ```
 */

import type { Ref } from 'react';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

// ─── Radius helpers ───────────────────────────────────────────────────────────

export interface GetStackedBarRadiusOptions {
  /** Zero-based index of this series within the series array. */
  index: number;
  /** Total number of series being rendered. */
  total: number;
  /** Bar chart layout — `'horizontal'` means vertical bars; `'vertical'` means horizontal bars. */
  layout: 'horizontal' | 'vertical';
  /**
   * Whether the bars are stacked. When `false` (non-stacked) every bar gets
   * a uniform radius of `4`. Defaults to `true`.
   */
  stacked?: boolean;
}

/**
 * Compute the `radius` prop value for a recharts `<Bar>` inside a stacked bar chart.
 *
 * In a stacked bar the visible outer edges only exist at the two ends of the
 * stack. Rounding the interior segment joints produces an unwanted gap between
 * segments. This helper returns:
 *
 * - Non-stacked (or `stacked=false`): uniform `4` on all corners.
 * - Stacked, single series (`total === 1`): uniform `4` — the lone segment
 *   is both the bottom and top of the stack, so it renders like a regular
 *   non-stacked bar.
 * - Stacked, horizontal layout (vertical bars):
 *   - first series (bottom) → `[0, 0, 4, 4]` (bottom-left, bottom-right)
 *   - last series (top)     → `[4, 4, 0, 0]` (top-left, top-right)
 *   - middle series         → `0`
 * - Stacked, vertical layout (horizontal bars):
 *   - first series (left)   → `[4, 0, 0, 4]` (top-left, bottom-left)
 *   - last series (right)   → `[0, 4, 4, 0]` (top-right, bottom-right)
 *   - middle series         → `0`
 *
 * The radius tuple follows recharts' `[topLeft, topRight, bottomRight, bottomLeft]`
 * corner order.
 */
export function getStackedBarRadius({
  index,
  total,
  layout,
  stacked = true,
}: GetStackedBarRadiusOptions): number | [number, number, number, number] {
  if (!stacked) return 4;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Single-series stack: the lone segment is simultaneously the bottom AND
  // top of the stack, so it should look like a regular non-stacked bar with
  // all four corners rounded. Handle this before the layout branches —
  // otherwise `isFirst` would win and half the corners would render square.
  if (isFirst && isLast) return 4;

  if (layout === 'horizontal') {
    // Vertical bars: bottom of stack is first series, top is last.
    if (isFirst) return [0, 0, 4, 4]; // bottom corners
    if (isLast) return [4, 4, 0, 0]; // top corners
    return 0;
  }

  // Horizontal bars: left end is first series, right end is last.
  if (isFirst) return [4, 0, 0, 4]; // left corners
  if (isLast) return [0, 4, 4, 0]; // right corners
  return 0;
}

export interface BarChartProps<T extends object> {
  /** Data points to render as grouped/stacked bars. */
  data: T[];
  /** ChartConfig describing the labels/colors for each series key. */
  config: ChartConfig;
  /** Series keys to render as bars. Each must match a `ChartConfig` entry. */
  series: string[];
  /** Key on each datum used as the category label (x-axis when horizontal). */
  categoryKey: keyof T & string;
  /** Layout orientation. Defaults to `'horizontal'`. */
  layout?: 'horizontal' | 'vertical';
  /** Render bars stacked on a single column instead of grouped. */
  stacked?: boolean;
  /** Render the cartesian grid. Defaults to `true`. */
  showGrid?: boolean;
  /** Render the x-axis. Defaults to `true`. */
  showXAxis?: boolean;
  /** Render the y-axis. Defaults to `true`. */
  showYAxis?: boolean;
  /** Render the hover tooltip. Defaults to `true`. */
  showTooltip?: boolean;
  /** Optional formatter for axis tick labels. */
  tickFormatter?: (value: string) => string;
  /** Additional class names merged onto the root element. */
  className?: string;
  /** Optional ref forwarded to the root element. */
  ref?: Ref<HTMLDivElement>;
}

export function BarChart<T extends object>({
  data,
  config,
  series,
  categoryKey,
  layout = 'horizontal',
  stacked = false,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showTooltip = true,
  tickFormatter,
  className,
  ref,
}: BarChartProps<T>) {
  const stackId = stacked ? 'a' : undefined;
  const isHorizontal = layout === 'horizontal';
  // recharts' `TypedDataKey` constrains the inferred value type of `dataKey`.
  // Our public API accepts `keyof T & string` for ergonomics, but at the
  // recharts boundary we only need the runtime string key — recharts widens
  // string-typed keys correctly. Storing it in a `string`-typed local lets
  // type-checking pass without weakening the public API.
  const categoryKeyStr: string = categoryKey;
  const total = series.length;

  return (
    <div ref={ref} className={cn('h-full w-full', className)} data-slot="bar-chart">
      <ChartContainer config={config} className="h-full w-full">
        <RechartsBarChart data={data} layout={layout}>
          {showGrid && <CartesianGrid vertical={!isHorizontal} />}
          {showXAxis &&
            (isHorizontal ? (
              <XAxis
                dataKey={categoryKeyStr}
                tickFormatter={tickFormatter}
                tickLine={false}
                axisLine={false}
              />
            ) : (
              <XAxis
                type="number"
                tickFormatter={tickFormatter}
                tickLine={false}
                axisLine={false}
              />
            ))}
          {showYAxis &&
            (isHorizontal ? (
              <YAxis tickFormatter={tickFormatter} tickLine={false} axisLine={false} />
            ) : (
              <YAxis
                dataKey={categoryKeyStr}
                type="category"
                tickFormatter={tickFormatter}
                tickLine={false}
                axisLine={false}
              />
            ))}
          {showTooltip && <Tooltip content={<ChartTooltipContent />} cursor={false} />}
          {series.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              stackId={stackId}
              radius={getStackedBarRadius({ index, total, layout, stacked })}
            />
          ))}
        </RechartsBarChart>
      </ChartContainer>
    </div>
  );
}
