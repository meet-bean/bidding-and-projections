'use client';

import { cn } from '@repo/ui';

interface CompletionRingProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function CompletionRing({
  pct,
  size = 32,
  strokeWidth = 3,
  label,
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

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
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
      {label !== undefined && (
        <span className="text-xs tabular-nums">{label}</span>
      )}
    </div>
  );
}
