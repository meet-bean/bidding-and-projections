/**
 * BarChartCard component tests.
 *
 * @see Linear MEE-1617 / MEE-1627: Training report components.
 *
 * Compound card chrome wrapping a BarChart slot, with an optional toolbar
 * slot (typically legend + scope toggle), description, footer, loading
 * skeleton, and empty state.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChartCard } from './bar-chart-card';

describe('BarChartCard', () => {
  it('renders title and chart slot', () => {
    render(<BarChartCard title="Compliance" chart={<div data-testid="chart" />} />);
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<BarChartCard title="t" description="desc" chart={<div />} />);
    expect(screen.getByText('desc')).toBeInTheDocument();
  });

  it('renders toolbar slot', () => {
    render(<BarChartCard title="t" chart={<div />} toolbar={<button>Switch</button>} />);
    expect(screen.getByRole('button', { name: 'Switch' })).toBeInTheDocument();
  });

  it('renders empty slot in place of chart when set', () => {
    render(
      <BarChartCard
        title="t"
        chart={<div data-testid="chart" />}
        empty={<div data-testid="empty">No data</div>}
      />
    );
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<BarChartCard title="t" chart={<div />} loading />);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<BarChartCard title="t" chart={<div />} footer={<span>Last updated 5m ago</span>} />);
    expect(screen.getByText('Last updated 5m ago')).toBeInTheDocument();
  });

  it('has data-slot="bar-chart-card" on the root element', () => {
    const { container } = render(<BarChartCard title="t" chart={<div />} />);
    expect(container.querySelector('[data-slot="bar-chart-card"]')).toBeInTheDocument();
  });
});
