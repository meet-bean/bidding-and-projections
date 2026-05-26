'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExclusiveSetContent } from './filter-menu-exclusive';
import type { FilterOption } from './filter-types';

const options: FilterOption<string>[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

describe('ExclusiveSetContent', () => {
  it('renders all options', () => {
    render(<ExclusiveSetContent options={options} selectedValue={undefined} onSelect={vi.fn()} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows check indicator on selected option', () => {
    render(<ExclusiveSetContent options={options} selectedValue="inactive" onSelect={vi.fn()} />);

    const activeItem = screen.getByRole('button', { name: 'Active' });
    const inactiveItem = screen.getByRole('button', { name: 'Inactive' });

    // The selected item has aria-pressed="true"
    expect(inactiveItem).toHaveAttribute('aria-pressed', 'true');
    expect(activeItem).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with value when clicking unselected option', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<ExclusiveSetContent options={options} selectedValue={undefined} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Active' }));

    expect(onSelect).toHaveBeenCalledWith('active');
  });

  it('calls onSelect with undefined when clicking selected option (toggle off)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<ExclusiveSetContent options={options} selectedValue="active" onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Active' }));

    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});
