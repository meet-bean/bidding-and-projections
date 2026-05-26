import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders with horizontal sizing classes by default', () => {
    const { container } = render(<Separator />);
    const el = container.querySelector('[data-slot="separator"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('h-px');
    expect(el).toHaveClass('w-full');
    expect(el).toHaveClass('bg-border');
  });

  it('renders with vertical sizing classes when orientation=vertical', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.querySelector('[data-slot="separator"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-orientation', 'vertical');
    expect(el?.className).toMatch(/data-\[orientation=vertical\]:w-px/);
    expect(el?.className).toMatch(/data-\[orientation=vertical\]:h-auto/);
  });

  it('forwards className', () => {
    const { container } = render(<Separator className="my-custom" />);
    expect(container.querySelector('[data-slot="separator"]')).toHaveClass('my-custom');
  });
});
