/**
 * FilterChipPopover component tests.
 *
 * Tests verify:
 * - FilterChip renders as the popover trigger
 * - Clicking chip body opens the popover with correct submenu content
 * - onFilterChange is called when a value is updated in the popover
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChipPopover } from './filter-chip-popover';
import { createFilter } from './filter-utils';
import type { FilterFieldConfig } from './filter-types';

describe('FilterChipPopover', () => {
  it('renders a FilterChip as the trigger', () => {
    const field: FilterFieldConfig<string> = {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    };
    const filter = createFilter<string>('status', 'is', ['active']);

    render(
      <FilterChipPopover
        field={field}
        filter={filter}
        onFilterChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // The chip with value "Active" should be visible as trigger
    expect(screen.getByText('Active')).toBeInTheDocument();
    // Remove button should also be present
    expect(screen.getByRole('button', { name: /remove status filter/i })).toBeInTheDocument();
  });

  it('opens popover with ExclusiveSetContent on chip click (exclusive set field)', async () => {
    const field: FilterFieldConfig<string> = {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    };
    const filter = createFilter<string>('status', 'is', ['active']);

    render(
      <FilterChipPopover
        field={field}
        filter={filter}
        onFilterChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Click the chip body (button containing "Active")
    const chipBody = screen.getByRole('button', { name: /edit status filter/i });
    await userEvent.click(chipBody);

    // Popover should open - "Inactive" option should now appear in the submenu
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('operator-dynamic: standalone → value-based operator transition', () => {
    const multiselectField: FilterFieldConfig<string> = {
      key: 'sites',
      label: 'Sites',
      type: 'multiselect',
      options: [
        { value: 'site-1', label: 'Site A' },
        { value: 'site-2', label: 'Site B' },
      ],
      operators: [
        { value: 'includes', label: 'includes' },
        { value: 'includesAll', label: 'includes all' },
        { value: 'isEmpty', label: 'is empty' },
        { value: 'isNotEmpty', label: 'is not empty' },
      ],
    };

    it('does NOT call onFilterChange when switching from standalone to value-based operator', async () => {
      const onFilterChange = vi.fn();
      const filter = createFilter<string>('sites', 'isEmpty', []);

      render(
        <FilterChipPopover
          field={multiselectField}
          filter={filter}
          onFilterChange={onFilterChange}
          onRemove={vi.fn()}
        />
      );

      // Open the chip popover
      const chipBody = screen.getByRole('button', { name: /edit sites filter/i });
      await userEvent.click(chipBody);

      // Click the "includes" value-based operator
      await waitFor(() => {
        expect(screen.getByText('includes')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('includes'));

      // onFilterChange should NOT have been called yet — operator is deferred
      expect(onFilterChange).not.toHaveBeenCalled();
    });

    it('keeps popover open when switching from standalone to value-based operator', async () => {
      const onFilterChange = vi.fn();
      const filter = createFilter<string>('sites', 'isEmpty', []);

      render(
        <FilterChipPopover
          field={multiselectField}
          filter={filter}
          onFilterChange={onFilterChange}
          onRemove={vi.fn()}
        />
      );

      // Open the chip popover
      const chipBody = screen.getByRole('button', { name: /edit sites filter/i });
      await userEvent.click(chipBody);

      // Click "includes" operator
      await waitFor(() => {
        expect(screen.getByText('includes')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('includes'));

      // Value picker should be shown (popover stays open with value options visible)
      await waitFor(() => {
        expect(screen.getByText('Site A')).toBeInTheDocument();
        expect(screen.getByText('Site B')).toBeInTheDocument();
      });
    });

    it('flushes deferred operator when values are selected', async () => {
      const onFilterChange = vi.fn();
      const filter = createFilter<string>('sites', 'isEmpty', []);

      render(
        <FilterChipPopover
          field={multiselectField}
          filter={filter}
          onFilterChange={onFilterChange}
          onRemove={vi.fn()}
        />
      );

      // Open the chip popover
      const chipBody = screen.getByRole('button', { name: /edit sites filter/i });
      await userEvent.click(chipBody);

      // Switch to "includes" operator
      await waitFor(() => {
        expect(screen.getByText('includes')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('includes'));

      // Select a value
      await waitFor(() => {
        expect(screen.getByText('Site A')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('Site A'));

      // NOW onFilterChange should be called with both the new operator and value
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'sites',
          operator: 'includes',
          values: ['site-1'],
        })
      );
    });

    it('standalone operators still close on selection (no regression)', async () => {
      const onFilterChange = vi.fn();
      const filter = createFilter<string>('sites', 'includes', ['site-1']);

      render(
        <FilterChipPopover
          field={multiselectField}
          filter={filter}
          onFilterChange={onFilterChange}
          onRemove={vi.fn()}
        />
      );

      // Open the chip popover
      const chipBody = screen.getByRole('button', { name: /edit sites filter/i });
      await userEvent.click(chipBody);

      // Click "is empty" standalone operator
      await waitFor(() => {
        expect(screen.getByText('is empty')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('is empty'));

      // onFilterChange called immediately with standalone operator and cleared values
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'sites',
          operator: 'isEmpty',
          values: [],
        })
      );

      // Popover should have closed — operator buttons from the popover content
      // should no longer be visible (the "includes all" button only appears in popover)
      await waitFor(() => {
        expect(screen.queryByText('includes all')).not.toBeInTheDocument();
      });
    });

    it('value-based to value-based operator switch calls onFilterChange immediately', async () => {
      const onFilterChange = vi.fn();
      const filter = createFilter<string>('sites', 'includes', ['site-1']);

      render(
        <FilterChipPopover
          field={multiselectField}
          filter={filter}
          onFilterChange={onFilterChange}
          onRemove={vi.fn()}
        />
      );

      // Open the chip popover
      const chipBody = screen.getByRole('button', { name: /edit sites filter/i });
      await userEvent.click(chipBody);

      // Click "includes all" operator (value-based → value-based)
      await waitFor(() => {
        expect(screen.getByText('includes all')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('includes all'));

      // onFilterChange should be called immediately (no deferral needed)
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'sites',
          operator: 'includesAll',
        })
      );
    });
  });

  it('calls onFilterChange with updated filter when exclusive set value changes', async () => {
    const onFilterChange = vi.fn();
    const field: FilterFieldConfig<string> = {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    };
    const filter = createFilter<string>('status', 'is', ['active']);

    render(
      <FilterChipPopover
        field={field}
        filter={filter}
        onFilterChange={onFilterChange}
        onRemove={vi.fn()}
      />
    );

    // Open the popover
    const chipBody = screen.getByRole('button', { name: /edit status filter/i });
    await userEvent.click(chipBody);

    // Click the "Inactive" option in the submenu
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Inactive'));

    // onFilterChange should have been called with updated values
    expect(onFilterChange).toHaveBeenCalledOnce();
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'status',
        values: ['inactive'],
      })
    );
  });
});
