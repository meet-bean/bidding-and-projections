/**
 * ChartLegend component tests.
 *
 * @see Linear MEE-1616 / MEE-1627: Training report components.
 *
 * Atomic legend list extending the shadcn legend pattern with direction,
 * optional count, hover-revealed percentage, and per-item description tooltip.
 * Lives at a deep import path to avoid name collision with shadcn chart's
 * own internal `ChartLegend` recharts wrapper.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartLegend } from './chart-legend';

const config = {
  pending: { label: 'Pending', color: 'var(--chart-1)' },
  overdue: { label: 'Overdue', color: 'var(--destructive)' },
} satisfies ChartConfig;

describe('ChartLegend', () => {
  it('renders one row per item with label and color pip', () => {
    const { container } = render(
      <ChartLegend config={config} items={[{ key: 'pending' }, { key: 'overdue' }]} />
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="legend-pip"]').length).toBe(2);
  });

  it('shows count when item.count is set', () => {
    render(<ChartLegend config={config} items={[{ key: 'pending', count: 42 }]} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('supports vertical direction', () => {
    const { container } = render(
      <ChartLegend
        config={config}
        items={[{ key: 'pending' }, { key: 'overdue' }]}
        direction="vertical"
      />
    );
    expect(container.querySelector('[data-slot="chart-legend"]')).toHaveClass('flex-col');
  });

  it('renders horizontal by default', () => {
    const { container } = render(<ChartLegend config={config} items={[{ key: 'pending' }]} />);
    expect(container.querySelector('[data-slot="chart-legend"]')).toHaveClass('flex-row');
  });

  it('renders percentage on hover when showPercentage', async () => {
    const user = userEvent.setup();
    render(
      <ChartLegend
        config={config}
        items={[
          { key: 'pending', count: 30 },
          { key: 'overdue', count: 70 },
        ]}
        showPercentage
      />
    );
    const row = screen.getByText('Pending').closest('[data-slot="legend-row"]')!;
    await user.hover(row);
    // 30 / 100 = 30%. The percentage element is always in the DOM (with
    // opacity-0) and CSS group-hover handles the visual reveal — JSDOM does
    // not simulate CSS hover styles, so we verify presence rather than
    // visibility.
    expect(await screen.findByText('30%')).toBeInTheDocument();
  });

  it('has data-slot="chart-legend" on the root element', () => {
    const { container } = render(<ChartLegend config={config} items={[{ key: 'pending' }]} />);
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeInTheDocument();
  });

  it('bases percentage total on rendered rows only (ignores unknown keys)', async () => {
    const user = userEvent.setup();
    render(
      <ChartLegend
        config={config}
        items={[
          { key: 'pending', count: 30 },
          { key: 'overdue', count: 70 },
          // 'unknown' is not in config so this row is skipped — its count
          // must NOT inflate the percentage denominator. Without filtering,
          // pending would render as 30/130 = 23%; with filtering it's
          // 30/100 = 30%.
          { key: 'unknown', count: 30 },
        ]}
        showPercentage
      />
    );
    const row = screen.getByText('Pending').closest('[data-slot="legend-row"]')!;
    await user.hover(row);
    expect(await screen.findByText('30%')).toBeInTheDocument();
  });
});
