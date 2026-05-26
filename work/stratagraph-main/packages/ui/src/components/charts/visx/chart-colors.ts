/**
 * Standardized color palette for data visualization.
 * Designed for accessibility (WCAG contrast) and consistency.
 */

/** Primary categorical palette — use for series differentiation */
export const chartColors = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
] as const;

/** Semantic colors for status-based visualizations */
export const statusColors = {
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#3b82f6', // blue-500
  muted: '#9ca3af', // gray-400
} as const;

/** Score-based color thresholds (green → yellow → red) */
export function scoreColor(value: number, thresholds = { green: 80, yellow: 70 }): string {
  if (value >= thresholds.green) return statusColors.success;
  if (value >= thresholds.yellow) return statusColors.warning;
  return statusColors.danger;
}

/** Get color from palette by index (wraps around) */
export function paletteColor(index: number, palette: readonly string[] = chartColors): string {
  return palette[index % palette.length] ?? chartColors[0];
}
