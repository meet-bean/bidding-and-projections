/**
 * FilterChip component tests.
 *
 * Tests verify compact pill rendering for all filter types:
 * - Exclusive set (select): just the value label
 * - Dynamic set (searchable select): field label + value label
 * - Operator-dynamic (multiselect): field label + operator label + values
 * - Date: field label + operator label + formatted date
 * - Standalone date operator: just operator label
 * - Close button triggers onRemove
 * - Body click triggers onClick
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChip } from './filter-chip';
import { createFilter } from './filter-utils';
import type { FilterFieldConfig } from './filter-types';

describe('FilterChip', () => {
  it('renders exclusive set chip with value label only (no field label)', () => {
    const field: FilterFieldConfig<string> = {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' },
      ],
    };
    const filter = createFilter<string>('status', 'is', ['draft']);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    // Should show just the value label, not "Status Draft"
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('renders dynamic set chip with field label and value label', () => {
    const field: FilterFieldConfig<string> = {
      key: 'createdBy',
      label: 'Created by',
      type: 'select',
      searchable: true,
      options: [
        { value: 'user-1', label: 'John Doe' },
        { value: 'user-2', label: 'Jane Smith' },
      ],
    };
    const filter = createFilter<string>('createdBy', 'is', ['user-1']);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    expect(screen.getByText('Created by')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders operator-dynamic chip for tags with field label and operator label', () => {
    const field: FilterFieldConfig<string> = {
      key: 'tags',
      label: 'Tags',
      type: 'multiselect',
      operators: [
        { value: 'includes', label: 'include' },
        { value: 'excludes', label: 'exclude' },
        { value: 'empty', label: 'are empty' },
      ],
      options: [
        { value: 'tag-1', label: 'Tag-1' },
        { value: 'tag-2', label: 'Tag-2' },
      ],
    };
    const filter = createFilter<string>('tags', 'includes', ['tag-1', 'tag-2']);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('include')).toBeInTheDocument();
  });

  it('wraps operator-dynamic values in a max-width container for overflow', () => {
    const customRenderer = vi.fn((values: unknown[]) => `${values.length} items`);
    const field: FilterFieldConfig<string> = {
      key: 'tags',
      label: 'Tags',
      type: 'multiselect',
      operators: [{ value: 'includes', label: 'include' }],
      options: [
        { value: 'tag-1', label: 'Tag-1' },
        { value: 'tag-2', label: 'Tag-2' },
      ],
      customValueRenderer: customRenderer,
    };
    const filter = createFilter<string>('tags', 'includes', ['tag-1', 'tag-2']);

    const { container } = render(
      <FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />
    );

    // The value wrapper should exist with data-slot for overflow constraint
    const valueWrapper = container.querySelector('[data-slot="chip-values"]');
    expect(valueWrapper).not.toBeNull();
    expect(customRenderer).toHaveBeenCalled();
  });

  it('renders standalone operator chip for empty operator without values', () => {
    const field: FilterFieldConfig<string> = {
      key: 'tags',
      label: 'Tags',
      type: 'multiselect',
      operators: [
        { value: 'includes', label: 'include' },
        { value: 'empty', label: 'are empty' },
      ],
      options: [{ value: 'tag-1', label: 'Tag-1' }],
    };
    const filter = createFilter<string>('tags', 'empty', []);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('are empty')).toBeInTheDocument();
  });

  it('renders close button that calls onRemove when clicked', async () => {
    const onRemove = vi.fn();
    const field: FilterFieldConfig<string> = {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [{ value: 'active', label: 'Active' }],
    };
    const filter = createFilter<string>('status', 'is', ['active']);

    render(<FilterChip field={field} filter={filter} onRemove={onRemove} onClick={vi.fn()} />);

    const closeButton = screen.getByRole('button', { name: /remove status filter/i });
    await userEvent.click(closeButton);

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('calls onClick when chip body is clicked', async () => {
    const onClick = vi.fn();
    const field: FilterFieldConfig<string> = {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [{ value: 'active', label: 'Active' }],
    };
    const filter = createFilter<string>('status', 'is', ['active']);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={onClick} />);

    const chipBody = screen.getByRole('button', { name: /edit status filter/i });
    await userEvent.click(chipBody);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders date chip with formatted date and field + operator labels', () => {
    const field: FilterFieldConfig<string> = {
      key: 'expiresAt',
      label: 'Expires',
      type: 'date',
      operators: [
        { value: 'after', label: 'after' },
        { value: 'before', label: 'before' },
        { value: 'empty', label: 'is empty' },
      ],
    };
    const filter = createFilter<string>('expiresAt', 'after', ['2024-01-01']);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    expect(screen.getByText('Expires')).toBeInTheDocument();
    expect(screen.getByText('after')).toBeInTheDocument();
    // Jan 1, 2024
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it('renders standalone date chip (empty operator) without a date value', () => {
    const field: FilterFieldConfig<string> = {
      key: 'expiresAt',
      label: 'Expires',
      type: 'date',
      operators: [
        { value: 'after', label: 'after' },
        { value: 'empty', label: 'is empty' },
      ],
    };
    const filter = createFilter<string>('expiresAt', 'empty', []);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    expect(screen.getByText('Expires')).toBeInTheDocument();
    expect(screen.getByText('is empty')).toBeInTheDocument();
    // No date value should be present
    expect(screen.queryByText(/Jan/)).not.toBeInTheDocument();
  });

  it('renders standalone date chip with needsValue: false showing capitalized operator only', () => {
    const field: FilterFieldConfig<string> = {
      key: 'expiration',
      label: 'Expiration',
      type: 'date',
      operators: [
        { value: 'on', label: 'is on' },
        { value: 'isExpired', label: 'is expired', needsValue: false },
        { value: 'isExpiring', label: 'is expiring', needsValue: false },
      ],
    };
    const filter = createFilter<string>('expiration', 'isExpired', []);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    // Should show "Expiration" field label and "Is expired" (capitalized)
    expect(screen.getByText('Expiration')).toBeInTheDocument();
    expect(screen.getByText('is expired')).toBeInTheDocument();
  });

  it('renders date-only string as correct date using local parsing (MEE-1471)', () => {
    const field: FilterFieldConfig<string> = {
      key: 'updated',
      label: 'Updated',
      type: 'date',
      operators: [
        { value: 'on', label: 'on' },
        { value: 'after', label: 'after' },
      ],
    };
    // YYYY-MM-DD date-only string: "on Jan 1, 2026"
    // In UTC-7, new Date('2026-01-01') becomes Dec 31 2025 local time.
    // The chip should always show Jan 1, 2026 regardless of timezone.
    const filter = createFilter<string>('updated', 'on', ['2026-01-01']);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    // Should display Jan 1, 2026 — not Dec 31, 2025 (UTC midnight shift bug)
    expect(screen.getByText(/Jan 1, 2026/)).toBeInTheDocument();
  });

  it('renders relative date chip with needsValue: false showing capitalized operator only', () => {
    const field: FilterFieldConfig<string> = {
      key: 'created',
      label: 'Created',
      type: 'date',
      operators: [
        { value: 'on', label: 'is on' },
        { value: 'lastWeek', label: 'in the last week', needsValue: false },
      ],
    };
    const filter = createFilter<string>('created', 'lastWeek', []);

    render(<FilterChip field={field} filter={filter} onRemove={vi.fn()} onClick={vi.fn()} />);

    // Should show "Created" field label and "In the last week" (capitalized)
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('in the last week')).toBeInTheDocument();
  });
});
