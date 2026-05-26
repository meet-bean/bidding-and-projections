/**
 * DatePicker component tests — single, range, and multiple modes.
 *
 * @see Issue #210: P16-015: Fix DatePicker scroll jump
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Single mode (default) ────────────────────────────────────────

  describe('Single mode', () => {
    describe('Rendering', () => {
      it('renders with default placeholder', () => {
        render(<DatePicker onChange={() => {}} />);
        expect(screen.getByText('Pick a date')).toBeInTheDocument();
      });

      it('renders with custom placeholder', () => {
        render(<DatePicker onChange={() => {}} placeholder="Select date" />);
        expect(screen.getByText('Select date')).toBeInTheDocument();
      });

      it('displays selected date', () => {
        const date = new Date(2026, 1, 15);
        render(<DatePicker value={date} onChange={() => {}} />);
        // The date-fns format 'PPP' outputs "February 15th, 2026"
        expect(screen.getByText(/February 15th, 2026/i)).toBeInTheDocument();
      });
    });

    describe('Scroll Jump Prevention', () => {
      it('prevents default on button click to avoid scroll jump', () => {
        render(<DatePicker onChange={() => {}} />);

        const buttons = screen.getAllByRole('button', { name: /pick a date/i });
        const button = buttons.find((btn) => btn.tagName === 'BUTTON');
        expect(button).toBeDefined();

        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

        fireEvent(button!, clickEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('opens calendar popover when clicking input', async () => {
        const user = userEvent.setup();
        const { container } = render(<DatePicker onChange={() => {}} />);

        const trigger = container.querySelector('[data-slot="popover-trigger"]');
        expect(trigger).toBeDefined();
        await user.click(trigger!);

        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    describe('Date Selection', () => {
      it('calls onChange when date is selected', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { container } = render(<DatePicker onChange={onChange} />);

        const trigger = container.querySelector('[data-slot="popover-trigger"]');
        expect(trigger).toBeDefined();
        await user.click(trigger!);

        const dayCell = screen.getByRole('gridcell', { name: /15/i });
        const dayButton = dayCell.querySelector('button');
        expect(dayButton).toBeDefined();
        await user.click(dayButton!);

        expect(onChange).toHaveBeenCalled();
      });
    });

    describe('Clear Button', () => {
      it('shows clear button when date is selected', () => {
        const date = new Date(2026, 1, 15);
        render(<DatePicker value={date} onChange={() => {}} />);
        expect(screen.getByRole('button', { name: /clear date$/i })).toBeInTheDocument();
      });

      it('calls onChange with undefined when clear is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const date = new Date(2026, 1, 15);
        render(<DatePicker value={date} onChange={onChange} />);

        const clearButton = screen.getByRole('button', { name: /clear date$/i });
        await user.click(clearButton);

        expect(onChange).toHaveBeenCalledWith(undefined);
      });
    });

    describe('Disabled State', () => {
      it('disables the popover trigger when disabled prop is true', () => {
        render(<DatePicker onChange={() => {}} disabled />);
        const buttons = screen.getAllByRole('button');
        const innerButton = buttons.find((btn) => btn.hasAttribute('disabled'));
        expect(innerButton).toBeDefined();
        expect(innerButton).toBeDisabled();
      });
    });
  });

  // ─── Range mode ───────────────────────────────────────────────────

  describe('Range mode', () => {
    describe('Rendering', () => {
      it('renders with default range placeholder', () => {
        render(<DatePicker mode="range" onChange={() => {}} />);
        expect(screen.getByText('Pick a date range')).toBeInTheDocument();
      });

      it('renders with custom placeholder', () => {
        render(<DatePicker mode="range" onChange={() => {}} placeholder="Select range" />);
        expect(screen.getByText('Select range')).toBeInTheDocument();
      });

      it('displays collapsed range when from and to are set', () => {
        const range = { from: new Date(2026, 1, 10), to: new Date(2026, 1, 20) };
        render(<DatePicker mode="range" value={range} onChange={() => {}} />);
        // Same month: "Feb 10 – 20, 2026"
        expect(screen.getByText(/Feb\s+10\s*[–-]\s*20,?\s+2026/)).toBeInTheDocument();
      });

      it('displays only start date when to is undefined', () => {
        const range = { from: new Date(2026, 1, 10) };
        render(<DatePicker mode="range" value={range} onChange={() => {}} />);
        expect(screen.getByText(/Feb\s+10,?\s+2026/)).toBeInTheDocument();
      });
    });

    describe('Clear Button', () => {
      it('shows clear button with range-specific label', () => {
        const range = { from: new Date(2026, 1, 10), to: new Date(2026, 1, 20) };
        render(<DatePicker mode="range" value={range} onChange={() => {}} />);
        expect(screen.getByRole('button', { name: /clear date range/i })).toBeInTheDocument();
      });

      it('calls onChange with undefined when clear is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const range = { from: new Date(2026, 1, 10), to: new Date(2026, 1, 20) };
        render(<DatePicker mode="range" value={range} onChange={onChange} />);

        const clearButton = screen.getByRole('button', { name: /clear date range/i });
        await user.click(clearButton);

        expect(onChange).toHaveBeenCalledWith(undefined);
      });
    });

    describe('Calendar', () => {
      it('opens two-month calendar in range mode', async () => {
        const user = userEvent.setup();
        const { container } = render(<DatePicker mode="range" onChange={() => {}} />);

        const trigger = container.querySelector('[data-slot="popover-trigger"]');
        expect(trigger).toBeDefined();
        await user.click(trigger!);

        // Range mode renders two grids (two months)
        expect(screen.getAllByRole('grid').length).toBe(2);
      });
    });

    describe('Disabled State', () => {
      it('disables the trigger when disabled prop is true', () => {
        render(<DatePicker mode="range" onChange={() => {}} disabled />);
        const buttons = screen.getAllByRole('button');
        const innerButton = buttons.find((btn) => btn.hasAttribute('disabled'));
        expect(innerButton).toBeDefined();
        expect(innerButton).toBeDisabled();
      });
    });
  });

  // ─── Multiple mode ────────────────────────────────────────────────

  describe('Multiple mode', () => {
    describe('Rendering', () => {
      it('renders with default multiple placeholder', () => {
        render(<DatePicker mode="multiple" onChange={() => {}} />);
        expect(screen.getByText('Pick dates')).toBeInTheDocument();
      });

      it('displays count when dates are selected', () => {
        const dates = [new Date(2026, 1, 10), new Date(2026, 1, 15), new Date(2026, 1, 20)];
        render(<DatePicker mode="multiple" value={dates} onChange={() => {}} />);
        expect(screen.getByText('3 dates selected')).toBeInTheDocument();
      });

      it('displays single date text for one date', () => {
        const dates = [new Date(2026, 1, 10)];
        render(<DatePicker mode="multiple" value={dates} onChange={() => {}} />);
        expect(screen.getByText('1 date selected')).toBeInTheDocument();
      });
    });

    describe('Clear Button', () => {
      it('shows clear button with multiple-specific label', () => {
        const dates = [new Date(2026, 1, 10), new Date(2026, 1, 15)];
        render(<DatePicker mode="multiple" value={dates} onChange={() => {}} />);
        expect(screen.getByRole('button', { name: /clear dates/i })).toBeInTheDocument();
      });

      it('calls onChange with undefined when clear is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const dates = [new Date(2026, 1, 10), new Date(2026, 1, 15)];
        render(<DatePicker mode="multiple" value={dates} onChange={onChange} />);

        const clearButton = screen.getByRole('button', { name: /clear dates/i });
        await user.click(clearButton);

        expect(onChange).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
