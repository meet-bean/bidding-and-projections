/**
 * Checkbox component tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders a checkbox input', () => {
    render(<Checkbox aria-label="Test checkbox" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test checkbox' });
    expect(checkbox).toBeInTheDocument();
  });

  it('is unchecked by default', () => {
    render(<Checkbox aria-label="Test checkbox" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test checkbox' });
    expect(checkbox).not.toBeChecked();
  });

  it('can be checked', () => {
    render(<Checkbox defaultChecked aria-label="Test checkbox" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test checkbox' });
    expect(checkbox).toBeChecked();
  });

  it('calls onCheckedChange when clicked', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Test checkbox" onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test checkbox' });
    fireEvent.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Checkbox aria-label="Test checkbox" disabled data-testid="checkbox" />);

    const checkbox = screen.getByTestId('checkbox');
    // Base UI uses aria-disabled for accessibility
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
  });

  it('applies custom className', () => {
    render(<Checkbox aria-label="Test checkbox" className="custom-class" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test checkbox' });
    expect(checkbox).toHaveClass('custom-class');
  });
});
