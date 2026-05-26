/**
 * DonutCard component tests.
 *
 * @see Linear MEE-1616 / MEE-1627: Training report components.
 *
 * Compound card chrome wrapping DonutChart + ChartLegend slots, with
 * optional description, footer, loading skeleton, and empty state.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonutCard } from './donut-card';

describe('DonutCard', () => {
  it('renders title, donut slot, and legend slot', () => {
    render(
      <DonutCard
        title="Status"
        donut={<div data-testid="donut" />}
        legend={<div data-testid="legend" />}
      />
    );
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByTestId('donut')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<DonutCard title="t" description="desc" donut={<div />} legend={<div />} />);
    expect(screen.getByText('desc')).toBeInTheDocument();
  });

  it('renders empty slot in place of donut+legend when set', () => {
    render(
      <DonutCard
        title="t"
        donut={<div data-testid="donut" />}
        legend={<div data-testid="legend" />}
        empty={<div data-testid="empty">No data</div>}
      />
    );
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.queryByTestId('donut')).not.toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<DonutCard title="t" donut={<div />} legend={<div />} loading />);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it('has data-slot="donut-card" on the root element', () => {
    const { container } = render(<DonutCard title="t" donut={<div />} legend={<div />} />);
    expect(container.querySelector('[data-slot="donut-card"]')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <DonutCard
        title="t"
        donut={<div />}
        legend={<div />}
        footer={<span>Last updated 5m ago</span>}
      />
    );
    expect(screen.getByText('Last updated 5m ago')).toBeInTheDocument();
  });
});
