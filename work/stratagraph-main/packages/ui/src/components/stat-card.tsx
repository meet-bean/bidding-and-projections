/**
 * StatCard - Atomic stat display card.
 *
 * Generic stat card with a label, value, and optional icon, urgent slot,
 * and footer. Supports a tooltip on the label and a loading skeleton state.
 *
 * Both label and value are wrapped in `OverflowText` so long content
 * truncates with ellipsis and shows a tooltip with the full text.
 *
 * @example
 * ```tsx
 * <StatCard label="Open Trainings" value={142} icon={<Activity />} />
 * <StatCard label="Overdue" value={47} urgent={<span>47 urgent</span>} />
 * <StatCard label="Done" value={5} footer={<span>vs last 30d</span>} />
 * ```
 */

import { forwardRef, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { OverflowText } from '@/components/overflow-text';
import { useHydrated } from '@/hooks/use-hydrated';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  /** Short uppercase label describing the stat. */
  label: string;
  /** Optional tooltip explaining how the value is computed. */
  labelTooltip?: string;
  /** Primary value to display in large type. */
  value: string | number;
  /** Optional icon shown in the top-right of the card. */
  icon?: ReactNode;
  /** Optional urgent/secondary line shown directly under the value. */
  urgent?: ReactNode;
  /** Optional footer rendered below a separator. */
  footer?: ReactNode;
  /** Render a skeleton placeholder instead of the value. */
  loading?: boolean;
  /** Additional class names merged onto the card root. */
  className?: string;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(function StatCard(
  { label, labelTooltip, value, icon, urgent, footer, loading, className },
  ref
) {
  const isHydrated = useHydrated();

  if (loading) {
    return (
      <Card ref={ref} data-slot="stat-card" className={cn('flex h-full flex-col p-4', className)}>
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      </Card>
    );
  }

  const labelEl = (
    <OverflowText
      className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
      data-slot="overflow-text"
    >
      {label}
    </OverflowText>
  );

  return (
    <Card ref={ref} data-slot="stat-card" className={cn('flex h-full flex-col p-4', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          {labelTooltip && isHydrated ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild data-slot="tooltip-trigger">
                  <span className="cursor-help">{labelEl}</span>
                </TooltipTrigger>
                <TooltipContent>{labelTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            labelEl
          )}
          {icon && (
            <span className="bg-muted text-muted-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md">
              {icon}
            </span>
          )}
        </div>
        <OverflowText
          className="text-foreground text-4xl font-bold tracking-tight"
          data-slot="overflow-text"
        >
          {value}
        </OverflowText>
        {urgent && <div>{urgent}</div>}
      </div>
      {footer && (
        <div className="mt-auto">
          <Separator className="mb-3" />
          {footer}
        </div>
      )}
    </Card>
  );
});

StatCard.displayName = 'StatCard';
