/**
 * Decide the absolute `left` pixel position for the tooltip box so it stays
 * inside the chart's inner area.
 *
 * The caller passes `cursorX` already expressed inside the inner area (i.e.
 * not including the left margin). The returned value should be added to the
 * left margin by the caller for the final `style.left`.
 */
export interface TooltipFlipArgs {
  /** Mouse x within the chart's inner area (0..innerWidth). */
  cursorX: number;
  /** Measured tooltip box width in pixels. 0 on first render (uncached). */
  tooltipWidth: number;
  /** Chart inner width (excluding margins). */
  innerWidth: number;
  /** Gap between cursor and tooltip in pixels. */
  gutter: number;
}

export function computeTooltipLeft({
  cursorX,
  tooltipWidth,
  innerWidth,
  gutter,
}: TooltipFlipArgs): number {
  const rightEdge = cursorX + gutter + tooltipWidth;
  if (rightEdge <= innerWidth) {
    return cursorX + gutter;
  }
  const flipped = cursorX - gutter - tooltipWidth;
  return Math.max(0, flipped);
}
