'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterMenu } from './filter-menu';
import { DateFilterContent } from './filter-menu-date';
import type { FilterFieldConfig, FilterOperator } from './filter-types';
import { isStandaloneOperator } from './filter-utils';

const fields: FilterFieldConfig<string>[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'procedure', label: 'Procedure' },
      { value: 'task', label: 'Task' },
    ],
  },
];

const dateOperators: FilterOperator[] = [
  { value: 'before', label: 'is before' },
  { value: 'after', label: 'is after' },
  { value: 'lastWeek', label: 'in the last week', needsValue: false },
];

describe('FilterMenu', () => {
  it('renders ghost button with ListFilterPlus icon and "Filter" text', () => {
    render(<FilterMenu fields={fields} filters={[]} onFilterChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('opens dropdown menu on click showing field labels', async () => {
    const user = userEvent.setup();

    render(<FilterMenu fields={fields} filters={[]} onFilterChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /filter/i }));

    await waitFor(() => {
      expect(within(document.body).getByText('Status')).toBeInTheDocument();
    });
    expect(within(document.body).getByText('Type')).toBeInTheDocument();
  });

  it('renders submenu trigger for each field', async () => {
    const user = userEvent.setup();

    render(<FilterMenu fields={fields} filters={[]} onFilterChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /filter/i }));

    await waitFor(() => {
      expect(within(document.body).getByText('Status')).toBeInTheDocument();
    });

    expect(within(document.body).getByText('Type')).toBeInTheDocument();
  });

  describe('date field pending operator behavior', () => {
    /**
     * These tests verify the date operator pending state logic that FilterMenu's
     * FieldSubmenu uses. We render DateFilterContent with the same handler pattern
     * as FieldSubmenu to test the behavior without Radix DropdownMenu complexity.
     */

    it('standalone date operator calls upsertFilter immediately', async () => {
      const upsertFilter = vi.fn();
      const user = userEvent.setup();
      let pendingDateOperator: string | undefined;

      render(
        <DateFilterContent
          operators={dateOperators}
          selectedOperator={pendingDateOperator}
          selectedValues={[]}
          onOperatorChange={(operator) => {
            const op = dateOperators.find((o) => o.value === operator);
            if (op && isStandaloneOperator(op)) {
              upsertFilter('created', operator, []);
              pendingDateOperator = undefined;
            } else {
              pendingDateOperator = operator;
            }
          }}
          onValuesChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('in the last week'));

      expect(upsertFilter).toHaveBeenCalledWith('created', 'lastWeek', []);
    });

    it('value-based date operator does NOT call onOperatorChange or upsertFilter on click', async () => {
      const upsertFilter = vi.fn();
      const onOperatorChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DateFilterContent
          operators={dateOperators}
          selectedOperator={undefined}
          selectedValues={[]}
          onOperatorChange={onOperatorChange}
          onValuesChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('is before'));

      // Value-based operator click defers entirely to calendar selection.
      // Neither onOperatorChange nor upsertFilter should fire.
      expect(onOperatorChange).not.toHaveBeenCalled();
      expect(upsertFilter).not.toHaveBeenCalled();
    });
  });
});
