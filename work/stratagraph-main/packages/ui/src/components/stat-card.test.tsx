/**
 * StatCard component tests.
 *
 * @see Linear MEE-1615 / MEE-1627: Training report components.
 *
 * Atomic stat card with label, value, optional icon, urgent slot, footer,
 * tooltip on label, and a loading skeleton state.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Open Trainings" value={42} />);
    expect(screen.getByText('Open Trainings')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders icon slot in top-right', () => {
    render(<StatCard label="Open" value={1} icon={<span data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders urgent slot below value', () => {
    render(<StatCard label="Overdue" value={10} urgent={<span>47 overdue</span>} />);
    expect(screen.getByText('47 overdue')).toBeInTheDocument();
  });

  it('renders footer with separator', () => {
    const { container } = render(
      <StatCard label="Done" value={5} footer={<span>vs last 30d</span>} />
    );
    expect(screen.getByText('vs last 30d')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="separator"]')).toBeInTheDocument();
  });

  it('omits separator when no footer provided', () => {
    const { container } = render(<StatCard label="Done" value={5} />);
    expect(container.querySelector('[data-slot="separator"]')).not.toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<StatCard label="Open" value={1} loading />);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows tooltip when labelTooltip is set', async () => {
    const { container } = render(
      <StatCard label="Open" value={1} labelTooltip="Pending and in-progress" />
    );
    // Tooltip is hydration-guarded with useHydrated() to avoid SSR/CSR
    // mismatch, so it may render asynchronously after the initial render.
    await waitFor(() => {
      expect(container.querySelector('[data-slot="tooltip-trigger"]')).toBeInTheDocument();
    });
  });

  it('uses overflow-text wrappers for label and value', () => {
    const { container } = render(<StatCard label="Long" value="Long value" />);
    expect(container.querySelectorAll('[data-slot="overflow-text"]').length).toBeGreaterThanOrEqual(
      2
    );
  });

  it('exposes data-slot="stat-card" on the root element', () => {
    const { container } = render(<StatCard label="Open" value={1} />);
    expect(container.querySelector('[data-slot="stat-card"]')).toBeInTheDocument();
  });

  it('renders the separator inside the footer wrapper (not as a sibling)', () => {
    const { container } = render(
      <StatCard
        label="Done"
        value={5}
        footer={<span data-testid="footer-text">vs last 30d</span>}
      />
    );
    const separator = container.querySelector('[data-slot="separator"]');
    const footerText = screen.getByTestId('footer-text');
    expect(separator).toBeInTheDocument();
    // The separator must share a parent with the footer node — proves they're
    // wrapped together so the entire block collapses when footer is absent.
    expect(separator?.parentElement).toBe(footerText.parentElement);
  });

  it('renders urgent flush under the value (no flex-1 between them) when no footer', () => {
    render(
      <StatCard label="Overdue" value={10} urgent={<span data-testid="urgent">47 urgent</span>} />
    );
    const urgent = screen.getByTestId('urgent');
    // The urgent wrapper must not be inside a flex-1 column that grows away
    // from the value; assert by checking that the urgent's parent does not
    // carry `flex-1` on the wrapper that contains label+value.
    const valueWrapper = urgent.parentElement?.parentElement;
    expect(valueWrapper).not.toHaveClass('flex-1');
  });
});
