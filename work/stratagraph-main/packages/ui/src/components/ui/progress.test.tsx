/**
 * Progress component tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders with value prop', () => {
    render(<Progress value={50} data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute('role', 'progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders in indeterminate state when no value is provided', () => {
    render(<Progress data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute('role', 'progressbar');
    // Indeterminate: no aria-valuenow
    expect(progress).not.toHaveAttribute('aria-valuenow');
  });

  it("renders with size='sm' using h-1 class", () => {
    render(<Progress size="sm" data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-1');
  });

  it("renders with size='md' (default) using h-2 class", () => {
    render(<Progress data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-2');
  });

  it("renders with explicit size='md' using h-2 class", () => {
    render(<Progress size="md" data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-2');
  });

  it("renders with size='lg' using h-3 class", () => {
    render(<Progress size="lg" data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-3');
  });

  it('applies custom className', () => {
    render(<Progress className="custom-class" data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('custom-class');
  });

  it('renders indicator with correct width based on value', () => {
    render(<Progress value={75} data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    const indicator = progress.querySelector("[data-slot='progress-indicator']");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveStyle({ width: '75%' });
  });

  it('renders indeterminate indicator with animation class', () => {
    render(<Progress data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    const indicator = progress.querySelector("[data-slot='progress-indicator']");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('animate-indeterminate');
  });

  it('sets aria-valuemin and aria-valuemax attributes', () => {
    render(<Progress value={50} data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
  });

  it('applies custom indicatorClassName to the indicator', () => {
    render(<Progress value={50} indicatorClassName="bg-green-500" data-testid="progress" />);

    const progress = screen.getByTestId('progress');
    const indicator = progress.querySelector("[data-slot='progress-indicator']");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-green-500');
  });
});
