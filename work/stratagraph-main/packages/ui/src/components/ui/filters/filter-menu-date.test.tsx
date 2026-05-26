'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateFilterContent } from './filter-menu-date';
import type { FilterOperator } from './filter-types';
import { parseISO, formatISO } from 'date-fns';

const operators: FilterOperator[] = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
  { value: 'isExpired', label: 'Is expired', needsValue: false },
  { value: 'isExpiring', label: 'Is expiring soon', needsValue: false },
];

describe('parseISO', () => {
  it('parses YYYY-MM-DD string to a Date with correct date components', () => {
    const date = parseISO('2024-01-15');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January (0-indexed)
    expect(date.getDate()).toBe(15);
  });

  it('parses date-only strings to the correct local date', () => {
    const date = parseISO('2024-06-15');
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(5); // June
  });
});

describe('formatISO with date representation', () => {
  it('formats date using local time components', () => {
    const date = new Date(2024, 11, 31, 23, 0, 0);
    const formatted = formatISO(date, { representation: 'date' });
    expect(formatted).toBe('2024-12-31');
  });

  it('pads single-digit month and day with leading zeros', () => {
    const date = new Date(2024, 0, 5, 12, 0, 0);
    const formatted = formatISO(date, { representation: 'date' });
    expect(formatted).toBe('2024-01-05');
  });
});

describe('DateFilterContent', () => {
  it('renders all operator options', () => {
    render(
      <DateFilterContent
        operators={operators}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('Between')).toBeInTheDocument();
    expect(screen.getByText('Is expired')).toBeInTheDocument();
    expect(screen.getByText('Is expiring soon')).toBeInTheDocument();
  });

  it('clicking standalone operator calls onOperatorChange', async () => {
    const onOperatorChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DateFilterContent
        operators={operators}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={onOperatorChange}
        onValuesChange={vi.fn()}
      />
    );

    await user.click(screen.getByText('Is expired'));

    expect(onOperatorChange).toHaveBeenCalledWith('isExpired');
  });

  it('standalone operators show check when selected', () => {
    render(
      <DateFilterContent
        operators={operators}
        selectedOperator="isExpired"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    const expiredButton = screen.getByRole('button', { name: /Is expired/i });
    expect(expiredButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('standalone operators (isExpired, isExpiring) do NOT render chevron icon', () => {
    render(
      <DateFilterContent
        operators={operators}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    // Standalone operator buttons should NOT have aria-expanded attribute
    const expiredButton = screen.getByRole('button', { name: /Is expired/i });
    expect(expiredButton).not.toHaveAttribute('aria-expanded');

    const expiringButton = screen.getByRole('button', { name: /Is expiring soon/i });
    expect(expiringButton).not.toHaveAttribute('aria-expanded');
  });

  it('value operators (before, after) show calendar panel on hover', async () => {
    const user = userEvent.setup();

    render(
      <DateFilterContent
        operators={operators}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    // Hover over value operator to show calendar panel
    const beforeButton = screen.getByRole('button', { name: /Before/i });
    await user.hover(beforeButton);

    // Calendar panel should appear (the side panel with the calendar)
    expect(screen.getByTestId('date-calendar-panel')).toBeInTheDocument();
  });

  it('clicking a date in the calendar calls onValuesChange', async () => {
    const onValuesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DateFilterContent
        operators={operators}
        selectedOperator="before"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={onValuesChange}
      />
    );

    // The calendar should be visible for the selected value operator
    expect(screen.getByTestId('date-calendar-panel')).toBeInTheDocument();

    // Click a day button in the calendar
    const dayButtons = screen
      .getAllByRole('gridcell')
      .filter((el) => el.querySelector('button') !== null);
    if (dayButtons.length > 0) {
      const dayButton = dayButtons[0]!.querySelector('button');
      if (dayButton) {
        await user.click(dayButton);
        expect(onValuesChange).toHaveBeenCalled();
      }
    }
  });

  it('relative date operators with needsValue: false are treated as standalone', () => {
    const opsWithRelative: FilterOperator[] = [
      { value: 'on', label: 'is on' },
      { value: 'lastWeek', label: 'in the last week', needsValue: false },
      { value: 'lastMonth', label: 'in the last month', needsValue: false },
    ];

    render(
      <DateFilterContent
        operators={opsWithRelative}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    // Standalone operators should NOT have chevron
    const lastWeekButton = screen.getByRole('button', { name: /in the last week/i });
    expect(lastWeekButton).not.toHaveAttribute('aria-expanded');
  });

  it('value operator click does NOT call onOperatorChange (defers to calendar)', async () => {
    const onOperatorChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DateFilterContent
        operators={operators}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={onOperatorChange}
        onValuesChange={vi.fn()}
      />
    );

    // Click "Before" value operator
    const beforeButton = screen.getByRole('button', { name: /Before/i });
    await user.click(beforeButton);

    // onOperatorChange should NOT be called for value operators
    // Operator is deferred until the user picks a date in the calendar
    expect(onOperatorChange).not.toHaveBeenCalled();
  });

  it('calendar selection passes operator as second argument to onValuesChange', async () => {
    const onValuesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DateFilterContent
        operators={operators}
        selectedOperator="before"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={onValuesChange}
      />
    );

    // Calendar should be visible for "before" value operator
    expect(screen.getByTestId('date-calendar-panel')).toBeInTheDocument();

    // Click a day in the calendar
    const dayButtons = screen
      .getAllByRole('gridcell')
      .filter((el) => el.querySelector('button') !== null);
    if (dayButtons.length > 0) {
      const dayButton = dayButtons[0]!.querySelector('button');
      if (dayButton) {
        await user.click(dayButton);
        // onValuesChange should include the active operator as second arg
        expect(onValuesChange).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]),
          'before'
        );
      }
    }
  });

  it('range calendar does not commit on first click (partial selection)', async () => {
    const onValuesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DateFilterContent
        operators={operators}
        selectedOperator="between"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={onValuesChange}
      />
    );

    expect(screen.getByTestId('date-calendar-panel')).toBeInTheDocument();

    // Click first day — partial range selection (only from, no to)
    const dayButtons = screen
      .getAllByRole('gridcell')
      .filter((el) => el.querySelector('button') !== null)
      .map((el) => el.querySelector('button')!)
      .filter(Boolean);

    if (dayButtons.length > 0) {
      await user.click(dayButtons[0]!);
      // Should NOT commit on first click — need both from and to
      expect(onValuesChange).not.toHaveBeenCalled();
    }
  });

  it('uses two-panel layout with operators and calendar side by side', () => {
    render(
      <DateFilterContent
        operators={operators}
        selectedOperator="before"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    // Should have a flex layout with operator panel and calendar panel
    const container = screen.getByTestId('date-filter-content');
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('date-operators-panel')).toBeInTheDocument();
    expect(screen.getByTestId('date-calendar-panel')).toBeInTheDocument();
  });
});
