/**
 * KpiCard - Report KPI card built on top of StatCard.
 *
 * Adds the standard report-page semantics that consumers shouldn't
 * re-implement per domain: a delta vs. previous-period trend chip
 * (with polarity-aware good/bad/neutral colouring and sr-only labels),
 * a context label describing the comparison window, and an "urgent"
 * sub-line that auto-styles a positive number with destructive emphasis.
 *
 * @example
 * ```tsx
 * <KpiCard
 *   label="Acknowledgment Rate"
 *   labelTooltip="% of required acknowledgments completed"
 *   value="92%"
 *   icon={<CheckCircle2 className="h-4 w-4" />}
 *   delta={5}
 *   deltaPolarity="positive-good"
 *   deltaContextLabel="vs. last 30 days"
 * />
 * ```
 */

import { forwardRef, type ReactNode } from 'react';
import { StatCard, type StatCardProps } from '@/components/stat-card';
import { cn } from '@/lib/utils';

/**
 * Whether a positive delta should be visually treated as "good" (e.g. completion rate)
 * or "bad" (e.g. overdue counts). Drives the trend-chip colour and sr-only verbiage.
 */
export type DeltaPolarity = 'positive-good' | 'positive-bad';

export interface KpiCardProps extends Pick<
  StatCardProps,
  'label' | 'labelTooltip' | 'value' | 'icon' | 'loading' | 'className'
> {
  /**
   * Period-over-period change as a percentage. When omitted the trend chip and
   * footer are not rendered (use this for KPIs without a meaningful comparison).
   */
  delta?: number;
  /** Required when `delta` is provided — controls trend semantics. */
  deltaPolarity?: DeltaPolarity;
  /** Required when `delta` is provided — describes the comparison window. */
  deltaContextLabel?: ReactNode;
  /**
   * Optional urgent/secondary line shown directly under the value. A positive
   * number is auto-formatted as "{n} urgent" with destructive emphasis; pass a
   * ReactNode for fully custom rendering.
   */
  urgent?: number | ReactNode;
}

function isUrgentNumber(urgent: KpiCardProps['urgent']): urgent is number {
  return typeof urgent === 'number';
}

function TrendChip({ delta, polarity }: { delta: number; polarity: DeltaPolarity }) {
  const isNeutral = delta === 0;
  const isPositiveDelta = delta > 0;
  const isGood = !isNeutral && (polarity === 'positive-good' ? isPositiveDelta : !isPositiveDelta);
  const trend = isNeutral ? 'neutral' : isGood ? 'good' : 'bad';
  return (
    <span
      data-trend={trend}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        isNeutral
          ? 'bg-muted text-muted-foreground'
          : isGood
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive'
      )}
    >
      {!isNeutral && <span aria-hidden="true">{isPositiveDelta ? '↑' : '↓'}</span>}
      <span className="sr-only">
        {isNeutral ? 'unchanged' : isGood ? 'improved by' : 'worsened by'}
      </span>
      {Math.abs(delta)}%
    </span>
  );
}

export const KpiCard = forwardRef<HTMLDivElement, KpiCardProps>(function KpiCard(
  {
    label,
    labelTooltip,
    value,
    icon,
    loading,
    className,
    delta,
    deltaPolarity,
    deltaContextLabel,
    urgent,
  },
  ref
) {
  const showFooter = delta !== undefined && deltaPolarity !== undefined;
  const urgentNode = isUrgentNumber(urgent) ? (
    urgent > 0 ? (
      <span className="text-destructive text-sm font-medium">{urgent} urgent</span>
    ) : undefined
  ) : (
    urgent
  );

  return (
    <StatCard
      ref={ref}
      label={label}
      labelTooltip={labelTooltip}
      value={value}
      icon={icon}
      loading={loading}
      className={cn('gap-2', className)}
      urgent={urgentNode}
      footer={
        showFooter ? (
          <div className="space-y-1">
            <TrendChip delta={delta} polarity={deltaPolarity} />
            {deltaContextLabel && (
              <div className="text-muted-foreground text-xs">{deltaContextLabel}</div>
            )}
          </div>
        ) : undefined
      }
    />
  );
});

KpiCard.displayName = 'KpiCard';
