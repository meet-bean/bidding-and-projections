import { describe, it, expect } from 'vitest';
import { formatDateRange } from './format-date-range';

describe('formatDateRange', () => {
  describe('same month and year', () => {
    it('collapses to shared month/year', () => {
      const from = new Date(2025, 0, 12); // Jan 12
      const to = new Date(2025, 0, 20); // Jan 20
      const result = formatDateRange(from, to);
      // Intl produces en-US: "Jan 12 – 20, 2025"
      expect(result).toMatch(/Jan\s+12\s*[–-]\s*20,?\s+2025/);
    });
  });

  describe('same year, different month', () => {
    it('collapses to shared year', () => {
      const from = new Date(2025, 0, 12); // Jan 12
      const to = new Date(2025, 1, 20); // Feb 20
      const result = formatDateRange(from, to);
      // Intl produces en-US: "Jan 12 – Feb 20, 2025"
      expect(result).toMatch(/Jan\s+12\s*[–-]\s*Feb\s+20,?\s+2025/);
    });
  });

  describe('cross-year range', () => {
    it('shows both full dates', () => {
      const from = new Date(2024, 11, 28); // Dec 28, 2024
      const to = new Date(2025, 0, 5); // Jan 5, 2025
      const result = formatDateRange(from, to);
      // Intl produces en-US: "Dec 28, 2024 – Jan 5, 2025"
      expect(result).toMatch(/Dec\s+28,?\s+2024\s*[–-]\s*Jan\s+5,?\s+2025/);
    });
  });

  describe('single date fallback', () => {
    it('formats a single date when end is undefined', () => {
      const from = new Date(2025, 0, 12); // Jan 12, 2025
      const result = formatDateRange(from);
      expect(result).toMatch(/Jan\s+12,?\s+2025/);
    });
  });

  describe('identical dates', () => {
    it('handles from === to', () => {
      const date = new Date(2025, 5, 15); // Jun 15, 2025
      const result = formatDateRange(date, date);
      expect(result).toMatch(/Jun\s+15,?\s+2025/);
    });
  });
});
