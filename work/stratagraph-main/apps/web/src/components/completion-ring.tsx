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
