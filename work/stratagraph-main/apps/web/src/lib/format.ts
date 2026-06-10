/**
 * Platform formatting library — THE single place numbers and dates get turned
 * into strings. Every page should read identically: same currency rounding,
 * same date shapes, same relative-time voice. Money/percent/number re-export
 * the projections engine implementations so the two packages can't drift.
 */
export { formatCurrency, formatCurrencyExact, formatPercent, formatNumber } from '@repo/projections';

/** "Aug 1, 2025" — the default absolute date everywhere. */
export function formatDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Aug 1" — short form for dense tables where the year is obvious. */
export function formatDateShort(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Friendly "12d ago" / "3w ago" / "5mo ago" — matches how the field talks. */
export function formatRelative(iso: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).getTime()) / 86_400_000),
  );
  if (days === 0) return 'today';
  if (days < 21) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/** Whole days since a date (for "Started 29d ago" style copy). */
export function daysSince(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).getTime()) / 86_400_000),
  );
}

/**
 * "May 8 → 13" same-month, "May 28 → Jun 4" cross-month; the year is appended
 * only when it isn't the current one. Used for invoice/service date ranges.
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const currentYear = new Date().getFullYear();
  const showYear = start.getFullYear() !== currentYear || end.getFullYear() !== currentYear;
  const monthFmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const monthYearFmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const startStr = start.toLocaleDateString('en-US', monthFmt);
    const yearSuffix = showYear ? `, ${end.getFullYear()}` : '';
    return `${startStr} → ${end.getDate()}${yearSuffix}`;
  }
  const fmt = showYear ? monthYearFmt : monthFmt;
  return `${start.toLocaleDateString('en-US', fmt)} → ${end.toLocaleDateString('en-US', fmt)}`;
}
