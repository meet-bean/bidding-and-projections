import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker } from './date-range-picker';

describe('DateRangePicker (backward-compat wrapper)', () => {
  describe('Rendering', () => {
    it('renders with default placeholder', () => {
      render(<DateRangePicker onChange={() => {}} />);
      expect(screen.getByText('Pick a date range')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<DateRangePicker onChange={() => {}} placeholder="Select range" />);
      expect(screen.getByText('Select range')).toBeInTheDocument();
    });

    it('displays selected date range using smart formatting', () => {
      const range = { from: new Date(2026, 1, 10), to: new Date(2026, 1, 20) };
      render(<DateRangePicker value={range} onChange={() => {}} />);
      // Same month: Intl collapses to "Feb 10 – 20, 2026"
      expect(screen.getByText(/Feb\s+10\s*[–-]\s*20,?\s+2026/)).toBeInTheDocument();
    });

    it('displays only start date when to is undefined', () => {
      const range = { from: new Date(2026, 1, 10) };
      render(<DateRangePicker value={range} onChange={() => {}} />);
      expect(screen.getByText(/Feb\s+10,?\s+2026/)).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('shows clear button when range is selected', () => {
      const range = { from: new Date(2026, 1, 10), to: new Date(2026, 1, 20) };
      render(<DateRangePicker value={range} onChange={() => {}} />);
      expect(screen.getByRole('button', { name: /clear date range/i })).toBeInTheDocument();
    });

    it('calls onChange with undefined when clear is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const range = { from: new Date(2026, 1, 10), to: new Date(2026, 1, 20) };
      render(<DateRangePicker value={range} onChange={onChange} />);

      const clearButton = screen.getByRole('button', { name: /clear date range/i });
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Disabled State', () => {
    it('disables the trigger when disabled prop is true', () => {
      render(<DateRangePicker onChange={() => {}} disabled />);
      const buttons = screen.getAllByRole('button');
      const innerButton = buttons.find((btn) => btn.hasAttribute('disabled'));
      expect(innerButton).toBeDefined();
      expect(innerButton).toBeDisabled();
    });
  });

  describe('Calendar', () => {
    it('opens calendar popover when clicking trigger', async () => {
      const user = userEvent.setup();
      const { container } = render(<DateRangePicker onChange={() => {}} />);

      const trigger = container.querySelector('[data-slot="popover-trigger"]');
      expect(trigger).toBeDefined();
      await user.click(trigger!);

      expect(screen.getAllByRole('grid').length).toBeGreaterThanOrEqual(1);
    });
  });
});
