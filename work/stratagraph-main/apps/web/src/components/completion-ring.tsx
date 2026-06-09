'use client';

import { cn } from '@repo/ui';

/**
 * Largest font (px) that keeps `chars` glyphs inside a ring of `size`px.
 * The clear inner diameter is size - 2*strokeWidth; tabular digits are
 * ~0.6em wide, so we divide the usable width by the character count.
 */
function centerFontSize(size: number, chars: number): number {
  const inner = size * 0.82; // usable width inside the stroke
  const byWidth = inner / (chars * 0.6);
  return Math.max(7, Math.min(Math.round(byWidth), Math.round(size * 0.4)));
}

interface CompletionRingProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  /** Where to render the label: beside the ring ('side') or inside it ('center'). */
  labelPosition?: 'side' | 'center';
  className?: string;
}

export function CompletionRing({
  pct,
  size = 32,
  strokeWidth = 3,
  label,
  labelPosition = 'side',
  className,
}: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(pct, 0), 200);
  const offset = circumference - (Math.min(clamped, 100) / 100) * circumference;

  const color =
    clamped > 100
      ? 'stroke-destructive'
      : clamped >= 80
        ? 'stroke-success'
        : 'stroke-primary';

  const ring = (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );

  if (labelPosition === 'center') {
    return (
      <div
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
      >
        {ring}
        {label !== undefined && (
          <span
            className="absolute inset-0 flex items-center justify-center font-semibold leading-none tabular-nums"
            style={{ fontSize: centerFontSize(size, label.length) }}
          >
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {ring}
      {label !== undefined && (
        <span className="text-xs tabular-nums">{label}</span>
      )}
    </div>
  );
}

interface CompletionBarProps {
  pct: number;
  /** Track width in px. */
  width?: number;
  className?: string;
}

/**
 * Inline "% complete" for dense data tables: a tabular percentage next to a thin
 * rounded progress bar. Reads as a column at a glance and — unlike a donut —
 * expresses overrun: at >100% the fill maxes out and turns red (over plan).
 * Fill is brand sage (primary) up to plan; destructive once over.
 */
export function CompletionBar({ pct, width = 56, className }: CompletionBarProps) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  const over = pct > 100;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'w-9 text-right text-[13px] tabular-nums',
          over ? 'font-medium text-destructive' : 'text-foreground',
        )}
      >
        {pct.toFixed(0)}%
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" style={{ width }}>
        <div
          className={cn('h-full rounded-full', over ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${over ? 100 : clamped}%` }}
        />
      </div>
    </div>
  );
}
