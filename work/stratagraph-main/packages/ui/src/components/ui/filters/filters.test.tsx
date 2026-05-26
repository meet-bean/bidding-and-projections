/**
 * Filters component tests.
 *
 * @see Issue #225: P17-001: Fix Filters Component Types and Export
 *
 * Tests verify:
 * - All component parts are exported from @repo/ui
 * - createFilter utility works correctly
 * - Filter type is properly typed
 * - Filters renders FilterMenu button + active filter chips
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Filters } from './filters';
import { createFilter, type Filter, type FilterFieldConfig } from './index';

describe('Filters', () => {
  describe('createFilter utility', () => {
    it('creates a filter with required fields', () => {
      const filter = createFilter<string>('status', 'is', ['active']);

      expect(filter).toHaveProperty('id');
      expect(filter.field).toBe('status');
      expect(filter.operator).toBe('is');
      expect(filter.values).toEqual(['active']);
    });

    it('creates a filter with unique id', () => {
      const filter1 = createFilter('field1');
      const filter2 = createFilter('field2');

      expect(filter1.id).not.toBe(filter2.id);
    });

    it("defaults operator to 'is' when not provided", () => {
      const filter = createFilter('status');

      expect(filter.operator).toBe('is');
    });

    it('defaults values to empty array when not provided', () => {
      const filter = createFilter('status', 'is');

      expect(filter.values).toEqual([]);
    });

    it('works with different value types', () => {
      const stringFilter = createFilter<string>('name', 'is', ['test']);
      const numberFilter = createFilter<number>('count', 'equals', [42]);
      const booleanFilter = createFilter<boolean>('active', 'is', [true]);

      expect(stringFilter.values).toEqual(['test']);
      expect(numberFilter.values).toEqual([42]);
      expect(booleanFilter.values).toEqual([true]);
    });
  });

  describe('Filters component rendering', () => {
    const mockFields: FilterFieldConfig<string>[] = [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    ];

    it('renders without filters — shows the Filter menu button', () => {
      const onChange = vi.fn();

      render(
        <Filters<string>
          filters={[]}
          fields={mockFields}
          onChange={onChange}
          showAddButton={true}
        />
      );

      // New Filters uses FilterMenu which renders a "Filter" button
      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('renders with existing filters — shows the chip value', () => {
      const onChange = vi.fn();
      const filters: Filter<string>[] = [createFilter('status', 'is', ['active'])];

      render(<Filters<string> filters={filters} fields={mockFields} onChange={onChange} />);

      // Exclusive set chip shows just the value label "Active"
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Filter type', () => {
    it('Filter type has correct shape', () => {
      const filter: Filter<string> = {
        id: 'test-id',
        field: 'status',
        operator: 'is',
        values: ['active'],
      };

      expect(filter.id).toBe('test-id');
      expect(filter.field).toBe('status');
      expect(filter.operator).toBe('is');
      expect(filter.values).toEqual(['active']);
    });
  });
});
