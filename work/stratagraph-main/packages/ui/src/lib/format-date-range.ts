const defaultFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Formats a date range with smart collapsing via `Intl.DateTimeFormat.formatRange`.
 *
 * - Same month/year: `Jan 12 – 20, 2025`
 * - Same year: `Jan 12 – Feb 20, 2025`
 * - Cross-year: `Dec 28, 2024 – Jan 5, 2025`
 * - Single date: `Jan 12, 2025`
 */
export function formatDateRange(from: Date, to?: Date, formatter = defaultFormatter): string {
  if (!to) return formatter.format(from);
  return formatter.formatRange(from, to);
}
