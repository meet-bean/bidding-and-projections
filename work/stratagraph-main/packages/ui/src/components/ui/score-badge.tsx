/**
 * ScoreBadge — Displays a score value with theme-aware color coding.
 *
 * Uses CSS custom properties (--score-N) for consistent score coloring
 * across light and dark themes.
 */

import { cn } from '@/lib/utils';
import { ratioToScoreColor, ratioToScoreColorSoft } from '@/lib/score-colors';

export interface ScoreBadgeProps {
  /** Score ratio from 0 to 100 */
  ratio: number;
  /** Custom score step boundaries */
  steps?: readonly number[];
  /** Visual variant: default (solid bg + white text) or light (soft bg + colored text) */
  variant?: 'light';
  /** Append % sign after the number */
  showPercent?: boolean;
  className?: string;
}

export function ScoreBadge({ ratio, steps, variant, showPercent, className }: ScoreBadgeProps) {
  const color = ratioToScoreColor(ratio, steps);
  const softColor = ratioToScoreColorSoft(ratio, steps);

  const isSolid = variant !== 'light';

  return (
    <span
      className={cn(
        'inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-semibold',
        isSolid && 'text-white',
        className
      )}
      style={isSolid ? { backgroundColor: color } : { backgroundColor: softColor, color }}
    >
      {Math.round(ratio)}
      {showPercent && '%'}
    </span>
  );
}
