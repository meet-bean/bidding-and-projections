import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InlineComplianceBar } from './inline-compliance-bar';

describe('InlineComplianceBar', () => {
  it('renders the percent value with a % suffix', () => {
    render(<InlineComplianceBar value={73} />);
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('exposes data-slot="inline-compliance-bar" on the root', () => {
    const { container } = render(<InlineComplianceBar value={50} />);
    expect(container.querySelector('[data-slot="inline-compliance-bar"]')).toBeInTheDocument();
  });

  it('renders a progressbar with the correct ARIA values', () => {
    render(<InlineComplianceBar value={42} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values outside 0..100', () => {
    render(<InlineComplianceBar value={-5} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    render(<InlineComplianceBar value={130} />);
    expect(screen.getAllByRole('progressbar').at(-1)).toHaveAttribute('aria-valuenow', '100');
  });

  it('falls back to 0 for non-finite values (NaN, Infinity)', () => {
    const { container: nanContainer } = render(<InlineComplianceBar value={Number.NaN} />);
    const nanBar = nanContainer.querySelector('[role="progressbar"]');
    expect(nanBar).toHaveAttribute('aria-valuenow', '0');
    const nanFill = nanContainer.querySelector(
      '[data-slot="inline-compliance-bar-fill"]'
    ) as HTMLElement;
    expect(nanFill.style.width).toBe('0%');

    const { container: infContainer } = render(
      <InlineComplianceBar value={Number.POSITIVE_INFINITY} />
    );
    const infBar = infContainer.querySelector('[role="progressbar"]');
    expect(infBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('sets the fill width to the value percent', () => {
    const { container } = render(<InlineComplianceBar value={37} />);
    const fill = container.querySelector('[data-slot="inline-compliance-bar-fill"]') as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill.style.width).toBe('37%');
  });

  it('colorizes the fill via ratioToScoreColor (CSS var)', () => {
    const { container } = render(<InlineComplianceBar value={80} />);
    const fill = container.querySelector('[data-slot="inline-compliance-bar-fill"]') as HTMLElement;
    expect(fill.style.backgroundColor).toMatch(/var\(--score-/);
  });

  it('forwards className to the root', () => {
    const { container } = render(<InlineComplianceBar value={50} className="custom" />);
    expect(container.querySelector('[data-slot="inline-compliance-bar"]')).toHaveClass('custom');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineComplianceBar value={50} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('data-slot', 'inline-compliance-bar');
  });
});
