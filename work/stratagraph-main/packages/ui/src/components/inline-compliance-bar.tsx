import type { Ref } from 'react';
import { cn } from '@/lib/utils';
import { ratioToScoreColor } from '@/lib/score-colors';

export interface InlineComplianceBarProps {
  /** Compliance percent (0..100, clamped). */
  value: number;
  /** Additional class names merged onto the root wrapper. */
  className?: string;
  /** Optional accessible label override. Defaults to `${value}% compliance`. */
  ariaLabel?: string;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

export function InlineComplianceBar({
  value,
  className,
  ariaLabel,
  ref,
}: InlineComplianceBarProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(100, safeValue));
  const fill = ratioToScoreColor(clamped);

  return (
    <div
      ref={ref}
      data-slot="inline-compliance-bar"
      className={cn('inline-flex items-center justify-end gap-2 tabular-nums', className)}
    >
      <span className="text-sm font-medium">{clamped}%</span>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? `${clamped}% compliance`}
        className="bg-muted h-1.5 w-16 overflow-hidden rounded-full"
      >
        <div
          data-slot="inline-compliance-bar-fill"
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: fill }}
        />
      </div>
    </div>
  );
}
