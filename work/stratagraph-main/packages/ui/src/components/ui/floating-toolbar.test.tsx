/**
 * FloatingToolbar component tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingToolbar } from './floating-toolbar';

describe('FloatingToolbar', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <FloatingToolbar selectedCount={0} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders toolbar when selectedCount is greater than 0', () => {
    render(
      <FloatingToolbar selectedCount={3} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('displays the selected count text', () => {
    render(
      <FloatingToolbar selectedCount={5} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });

  it('displays singular "selected" text for count of 1', () => {
    render(
      <FloatingToolbar selectedCount={1} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('renders the Clear button', () => {
    render(
      <FloatingToolbar selectedCount={2} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('calls onClear when Clear button is clicked', () => {
    const onClear = vi.fn();
    render(
      <FloatingToolbar selectedCount={2} onClear={onClear}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders children action buttons', () => {
    render(
      <FloatingToolbar selectedCount={3} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
        <button type="button">Delete</button>
      </FloatingToolbar>
    );

    expect(screen.getByRole('button', { name: 'Bulk Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('has sticky bottom positioning classes', () => {
    render(
      <FloatingToolbar selectedCount={2} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.className).toContain('sticky');
    expect(toolbar.className).toContain('bottom-2');
  });

  it('is centered horizontally', () => {
    render(
      <FloatingToolbar selectedCount={2} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    const toolbar = screen.getByRole('toolbar');
    // The toolbar should be centered using auto margins
    expect(toolbar.className).toContain('mx-auto');
    expect(toolbar.className).toContain('w-fit');
  });

  it('applies custom className', () => {
    render(
      <FloatingToolbar selectedCount={2} onClear={vi.fn()} className="custom-class">
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('custom-class');
  });

  it('has accessible label describing the selection count', () => {
    render(
      <FloatingToolbar selectedCount={4} onClear={vi.fn()}>
        <button type="button">Bulk Edit</button>
      </FloatingToolbar>
    );

    const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
    expect(toolbar).toBeInTheDocument();
  });
});
