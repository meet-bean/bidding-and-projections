/**
 * DonutCard - Compound card chrome for a donut chart with legend.
 *
 * Wraps `DonutChart` and `ChartLegend` slots in shadcn `Card` chrome with
 * a title, optional description, optional footer, loading skeleton, and
 * an empty-state slot. The legend can sit beside the donut (default) or
 * stack underneath via `legendPosition`.
 *
 * Both `donut` and `legend` are render slots — pass any ReactNode. The
 * card has no opinion about which chart primitive you use; the typical
 * pairing is `<DonutChart>` from `@repo/ui/components/charts/donut-chart`
 * with `<ChartLegend>` from `@repo/ui/components/charts/chart-legend`.
 *
 * @example
 * ```tsx
 * <DonutCard
 *   title="Status Distribution"
 *   donut={<DonutChart data={data} config={config} />}
 *   legend={<ChartLegend config={config} items={items} direction="vertical" />}
 * />
 * ```
 */

import { type ReactNode, type Ref } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DonutCardProps {
  /** Card title shown in the header. */
  title: ReactNode;
  /** Optional description rendered under the title. */
  description?: ReactNode;
  /** Donut chart slot (typically a `<DonutChart>`). */
  donut: ReactNode;
  /** Legend slot (typically a `<ChartLegend>`). */
  legend: ReactNode;
  /** Where the legend sits relative to the donut. Defaults to `'right'`. */
  legendPosition?: 'right' | 'bottom';
  /** Render a skeleton placeholder instead of the donut + legend. */
  loading?: boolean;
  /** Render this slot in place of the donut + legend (e.g., zero-state). */
  empty?: ReactNode;
  /** Optional footer rendered below a top border. */
  footer?: ReactNode;
  /** Additional class names merged onto the card root. */
  className?: string;
  /** Optional ref forwarded to the card root. */
  ref?: Ref<HTMLDivElement>;
}

export function DonutCard({
  title,
  description,
  donut,
  legend,
  legendPosition = 'right',
  loading,
  empty,
  footer,
  className,
  ref,
}: DonutCardProps) {
  return (
    <Card ref={ref} className={className} data-slot="donut-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : empty ? (
          empty
        ) : (
          <div
            className={cn(
              'flex gap-6',
              legendPosition === 'right'
                ? 'flex-col items-center md:flex-row md:items-center'
                : 'flex-col'
            )}
          >
            <div className="flex-1">{donut}</div>
            <div className={cn(legendPosition === 'right' ? 'md:flex-1' : 'w-full')}>{legend}</div>
          </div>
        )}
      </CardContent>
      {footer && <CardFooter className="border-t">{footer}</CardFooter>}
    </Card>
  );
}
