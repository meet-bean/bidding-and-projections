/**
 * Score color utilities using CSS custom properties.
 *
 * Maps a 0–100 ratio to the nearest score step CSS variable.
 * Uses `--score-N` vars defined in globals.css for theme-aware colors.
 */

/** Default score steps matching CSS variable definitions */
export const SCORE_STEPS = [0, 25, 50, 75, 100] as const;

/** Resolve the nearest score step for a ratio value */
function nearestStep(ratio: number, steps: readonly number[]): number {
  const clamped = Math.max(0, Math.min(100, ratio));
  return steps.reduce((prev, curr) =>
    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
  );
}

/**
 * Returns the CSS variable reference for the nearest score step.
 *
 * @param ratio - A number from 0 to 100 (clamped if outside range)
 * @param steps - Score step boundaries (default: SCORE_STEPS)
 * @returns CSS var reference, e.g. `var(--score-75)`
 */
export function ratioToScoreColor(ratio: number, steps: readonly number[] = SCORE_STEPS): string {
  return `var(--score-${nearestStep(ratio, steps)})`;
}

/**
 * Returns the soft (background) CSS variable reference for the nearest score step.
 *
 * @param ratio - A number from 0 to 100 (clamped if outside range)
 * @param steps - Score step boundaries (default: SCORE_STEPS)
 * @returns CSS var reference, e.g. `var(--score-75-soft)`
 */
export function ratioToScoreColorSoft(
  ratio: number,
  steps: readonly number[] = SCORE_STEPS
): string {
  return `var(--score-${nearestStep(ratio, steps)}-soft)`;
}
