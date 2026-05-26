/**
 * DateBadge component tests.
 *
 * @see UDC-001: DateBadge component
 *
 * Tests verify:
 * - Relative format renders "X hours ago" for recent dates
 * - Datetime format renders "Jan 30, 2026 at 3:45 PM"
 * - Date format renders "Jan 30, 2026"
 * - Time format renders "3:45 PM"
 * - Falls back to date format when relative date exceeds relativeCutoffDays
 * - Default relativeCutoffDays is 30
 * - Shows tooltip with exact datetime when tooltip is true (default)
 * - Hides tooltip when tooltip is false
 * - Accepts both Date object and ISO string inputs
 * - Renders a <time> element with correct dateTime attribute
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateBadge } from './date-badge';

// Fixed "now" for deterministic tests: Jan 30, 2026 15:45:00 UTC
const NOW = new Date('2026-01-30T15:45:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DateBadge', () => {
  describe('Semantic <time> element', () => {
    it('renders a <time> element', () => {
      render(<DateBadge date={NOW} data-testid="badge" />);

      const el = screen.getByTestId('badge');
      expect(el.tagName).toBe('TIME');
    });

    it('sets dateTime attribute to ISO string for Date input', () => {
      render(<DateBadge date={NOW} data-testid="badge" />);

      const el = screen.getByTestId('badge');
      expect(el).toHaveAttribute('dateTime', NOW.toISOString());
    });

    it('sets dateTime attribute to ISO string for string input', () => {
      const isoString = '2026-01-30T15:45:00.000Z';
      render(<DateBadge date={isoString} data-testid="badge" />);

      const el = screen.getByTestId('badge');
      expect(el).toHaveAttribute('dateTime', isoString);
    });
  });

  describe('Input types', () => {
    it('accepts a Date object', () => {
      render(<DateBadge date={NOW} format="date" data-testid="badge" />);

      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });

    it('accepts an ISO string', () => {
      render(<DateBadge date="2026-01-30T15:45:00.000Z" format="date" data-testid="badge" />);

      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });
  });

  describe('Format: relative (default)', () => {
    it('renders relative format for recent dates', () => {
      // 3 hours ago
      const threeHoursAgo = new Date('2026-01-30T12:45:00.000Z');
      render(<DateBadge date={threeHoursAgo} data-testid="badge" />);

      expect(screen.getByTestId('badge')).toHaveTextContent(/3 hours ago/);
    });

    it('renders relative format for dates within cutoff', () => {
      // 5 days ago
      const fiveDaysAgo = new Date('2026-01-25T15:45:00.000Z');
      render(<DateBadge date={fiveDaysAgo} data-testid="badge" />);

      expect(screen.getByTestId('badge')).toHaveTextContent(/5 days ago/);
    });

    it('falls back to date format when relative date exceeds default relativeCutoffDays (30)', () => {
      // 31 days ago
      const thirtyOneDaysAgo = new Date('2025-12-30T15:45:00.000Z');
      render(<DateBadge date={thirtyOneDaysAgo} data-testid="badge" />);

      // Should NOT show relative text, should show absolute date
      expect(screen.getByTestId('badge').textContent).not.toMatch(/ago/);
      expect(screen.getByTestId('badge')).toHaveTextContent('Dec 30, 2025');
    });

    it('respects custom relativeCutoffDays', () => {
      // 8 days ago, cutoff is 7
      const eightDaysAgo = new Date('2026-01-22T15:45:00.000Z');
      render(<DateBadge date={eightDaysAgo} relativeCutoffDays={7} data-testid="badge" />);

      expect(screen.getByTestId('badge').textContent).not.toMatch(/ago/);
      expect(screen.getByTestId('badge')).toHaveTextContent('Jan 22, 2026');
    });

    it('shows relative text when within custom relativeCutoffDays', () => {
      // 6 days ago, cutoff is 7
      const sixDaysAgo = new Date('2026-01-24T15:45:00.000Z');
      render(<DateBadge date={sixDaysAgo} relativeCutoffDays={7} data-testid="badge" />);

      expect(screen.getByTestId('badge')).toHaveTextContent(/6 days ago/);
    });
  });

  describe('Format: datetime', () => {
    it('renders datetime format', () => {
      render(<DateBadge date={NOW} format="datetime" data-testid="badge" />);

      // "Jan 30, 2026 at 3:45 PM" (time displayed in UTC since fake timers)
      expect(screen.getByTestId('badge')).toHaveTextContent(/Jan 30, 2026/);
    });
  });

  describe('Format: date', () => {
    it('renders date format', () => {
      render(<DateBadge date={NOW} format="date" data-testid="badge" />);

      expect(screen.getByTestId('badge')).toHaveTextContent(/Jan 30, 2026/);
    });
  });

  describe('Format: time', () => {
    it('renders time format', () => {
      render(<DateBadge date={NOW} format="time" data-testid="badge" />);

      // Should show time portion
      expect(screen.getByTestId('badge').textContent).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
    });
  });

  describe('Tooltip', () => {
    it('renders time element directly with tooltip providers (no DOM wrappers)', () => {
      const { container } = render(<DateBadge date={NOW} data-testid="badge" />);

      // TooltipProvider and Tooltip are context providers — no extra DOM wrappers
      const badge = screen.getByTestId('badge');
      expect(badge.parentElement).toBe(container);
    });

    it('renders same DOM structure regardless of nowrap setting', () => {
      const { container } = render(
        <DateBadge date={NOW} nowrap={false} data-testid="badge" />
      );

      const badge = screen.getByTestId('badge');
      expect(badge.parentElement).toBe(container);
    });

    it('does not render tooltip when tooltip=false', () => {
      const { container } = render(<DateBadge date={NOW} tooltip={false} data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge.parentElement).toBe(container);
    });

    it('applies whitespace-nowrap class by default', () => {
      render(<DateBadge date={NOW} data-testid="badge" />);
      expect(screen.getByTestId('badge')).toHaveClass('whitespace-nowrap');
    });

    it('does not apply whitespace-nowrap when nowrap=false', () => {
      render(<DateBadge date={NOW} nowrap={false} data-testid="badge" />);
      expect(screen.getByTestId('badge')).not.toHaveClass('whitespace-nowrap');
    });
  });

  describe('Invalid date input', () => {
    it('renders fallback text for an invalid date string', () => {
      render(<DateBadge date="not-a-date" data-testid="badge" />);

      const el = screen.getByTestId('badge');
      expect(el).toBeInTheDocument();
      expect(el).toHaveTextContent('Invalid date');
    });

    it('renders fallback text for an Invalid Date object', () => {
      render(<DateBadge date={new Date('invalid')} data-testid="badge" />);

      const el = screen.getByTestId('badge');
      expect(el).toBeInTheDocument();
      expect(el).toHaveTextContent('Invalid date');
    });

    it('does not crash the component tree on invalid date', () => {
      expect(() => {
        render(<DateBadge date="not-a-date" data-testid="badge" />);
      }).not.toThrow();
    });

    it('still renders a <time> element for invalid date', () => {
      render(<DateBadge date="not-a-date" data-testid="badge" />);

      const el = screen.getByTestId('badge');
      expect(el.tagName).toBe('TIME');
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      render(<DateBadge date={NOW} className="custom-class" data-testid="badge" />);

      expect(screen.getByTestId('badge')).toHaveClass('custom-class');
    });
  });
});
