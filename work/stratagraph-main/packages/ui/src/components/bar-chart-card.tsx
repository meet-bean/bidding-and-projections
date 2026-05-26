/**
 * BarChartCard - Compound card chrome for a bar chart with optional toolbar.
 *
 * Wraps a `<BarChart>` slot in shadcn `Card` chrome with a title row that
 * supports a right-aligned toolbar (typically used to host a `<ChartLegend>`
 * + `<ToggleGroup>` scope switcher), an optional description, an empty-state
 * slot, a loading skeleton, and an optional footer.
 *
 * The `chart` slot is a render slot — pass any ReactNode. The typical pairing
 * is `<BarChart>` from `@repo/ui/components/charts/bar-chart`.
 *
 * @example
 * ```tsx
 * <BarChartCard
 *   title="Compliance Breakdown"
 *   toolbar={<ChartLegend config={config} items={items} />}
 *   chart={<BarChart data={data} config={config} series={['pending']} categoryKey="name" />}
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

export interface BarChartCardProps {
  /** Card title shown in the header. */
  title: ReactNode;
  /** Optional sub-title shown beneath the title. */
  description?: ReactNode;
  /** Right-aligned toolbar slot — typically a `<ChartLegend>` + `<ToggleGroup>`. */
  toolbar?: ReactNode;
  /** The chart to render — typically a `<BarChart>`. */
  chart: ReactNode;
  /** Show a loading skeleton in place of the chart. */
  loading?: boolean;
  /** Replace the chart with this slot when provided (e.g. an empty state). */
  empty?: ReactNode;
  /** Optional content rendered below the chart in a `CardFooter` with a top border. */
  footer?: ReactNode;
  /** Extra classes merged onto the root Card. */
  className?: string;
  /** Forwarded to the underlying root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

export function BarChartCard({
  title,
  description,
  toolbar,
  chart,
  loading,
  empty,
  footer,
  className,
  ref,
}: BarChartCardProps) {
  return (
    <Card ref={ref} className={className} data-slot="bar-chart-card">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {toolbar && <div className="shrink-0">{toolbar}</div>}
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : (empty ?? chart)}</CardContent>
      {footer && <CardFooter className="border-t">{footer}</CardFooter>}
    </Card>
  );
}
