/**
 * Button component tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders a button', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  describe('sentiment variants', () => {
    it('renders with success variant styles', () => {
      render(<Button variant="success">Success</Button>);

      const button = screen.getByRole('button', { name: 'Success' });
      expect(button).toBeInTheDocument();
      // Success variant should have success-related classes
      expect(button.className).toContain('bg-success');
    });

    it('renders with warning variant styles', () => {
      render(<Button variant="warning">Warning</Button>);

      const button = screen.getByRole('button', { name: 'Warning' });
      expect(button).toBeInTheDocument();
      // Warning variant should have warning-related classes
      expect(button.className).toContain('bg-warning');
    });

    it('renders with info variant styles', () => {
      render(<Button variant="info">Info</Button>);

      const button = screen.getByRole('button', { name: 'Info' });
      expect(button).toBeInTheDocument();
      // Info variant should have info-related classes
      expect(button.className).toContain('bg-info');
    });
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toHaveClass('custom-class');
  });
});
