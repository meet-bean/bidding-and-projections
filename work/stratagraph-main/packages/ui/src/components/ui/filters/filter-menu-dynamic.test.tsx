'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicSetContent } from './filter-menu-dynamic';
import type { FilterOption } from './filter-types';

const options: FilterOption<string>[] = [
  { value: 'alice', label: 'Alice' },
  { value: 'bob', label: 'Bob' },
  { value: 'carol', label: 'Carol' },
];

describe('DynamicSetContent', () => {
  it('renders search input', () => {
    render(<DynamicSetContent options={options} selectedValues={[]} onSelect={vi.fn()} />);

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders all options when no search query', () => {
    render(<DynamicSetContent options={options} selectedValues={[]} onSelect={vi.fn()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('filters options by search query', async () => {
    const user = userEvent.setup();

    render(<DynamicSetContent options={options} selectedValues={[]} onSelect={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'ali');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows selected items in separate section', () => {
    render(<DynamicSetContent options={options} selectedValues={['alice']} onSelect={vi.fn()} />);

    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('selected items do not appear in unselected section', () => {
    render(<DynamicSetContent options={options} selectedValues={['alice']} onSelect={vi.fn()} />);

    // Alice should appear exactly once (in selected section, not in unselected)
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements).toHaveLength(1);
  });

  it('shows spinner when loading', () => {
    render(
      <DynamicSetContent options={[]} selectedValues={[]} onSelect={vi.fn()} isLoading={true} />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('single-select mode: replaces value on new selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <DynamicSetContent
        options={options}
        selectedValues={['alice']}
        onSelect={onSelect}
        maxSelections={1}
      />
    );

    await user.click(screen.getByText('Bob'));

    expect(onSelect).toHaveBeenCalledWith(['bob']);
  });

  it('multi-select mode: adds value on selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<DynamicSetContent options={options} selectedValues={['alice']} onSelect={onSelect} />);

    await user.click(screen.getByText('Bob'));

    expect(onSelect).toHaveBeenCalledWith(['alice', 'bob']);
  });

  it('multi-select mode: does not exceed maxSelections', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <DynamicSetContent
        options={options}
        selectedValues={['alice', 'bob']}
        onSelect={onSelect}
        maxSelections={2}
      />
    );

    // Try to select Carol when already at max (2 selected)
    await user.click(screen.getByText('Carol'));

    // onSelect should NOT be called - already at maxSelections
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('multi-select mode: allows deselect when at maxSelections', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <DynamicSetContent
        options={options}
        selectedValues={['alice', 'bob']}
        onSelect={onSelect}
        maxSelections={2}
      />
    );

    // Deselecting should still work even at max
    const [aliceButton] = screen.getAllByText('Alice');
    expect(aliceButton).toBeDefined();
    await user.click(aliceButton!);

    expect(onSelect).toHaveBeenCalledWith(['bob']);
  });

  it('input stops keyDown propagation to prevent parent menu capture', async () => {
    const parentHandler = vi.fn();
    const user = userEvent.setup();

    render(
      <div onKeyDown={parentHandler}>
        <DynamicSetContent options={options} selectedValues={[]} onSelect={vi.fn()} />
      </div>
    );

    const input = screen.getByPlaceholderText(/search/i);
    await user.click(input);
    await user.keyboard('a');

    expect(parentHandler).not.toHaveBeenCalled();
  });

  it('calls onSearchChange when search input changes', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DynamicSetContent
        options={options}
        selectedValues={[]}
        onSelect={vi.fn()}
        onSearchChange={onSearchChange}
      />
    );

    await user.type(screen.getByPlaceholderText(/search/i), 'ali');

    expect(onSearchChange).toHaveBeenLastCalledWith('ali');
  });

  it('does not error when onSearchChange is not provided', async () => {
    const user = userEvent.setup();

    render(<DynamicSetContent options={options} selectedValues={[]} onSelect={vi.fn()} />);

    // Should not throw
    await user.type(screen.getByPlaceholderText(/search/i), 'test');

    expect(screen.getByPlaceholderText(/search/i)).toHaveValue('test');
  });

  it('deselecting removes from selected section', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <DynamicSetContent options={options} selectedValues={['alice', 'bob']} onSelect={onSelect} />
    );

    // Click Alice in the selected section to deselect
    const [aliceButton] = screen.getAllByText('Alice');
    expect(aliceButton).toBeDefined();
    await user.click(aliceButton!);

    expect(onSelect).toHaveBeenCalledWith(['bob']);
  });
});
