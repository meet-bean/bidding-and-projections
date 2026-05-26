/**
 * KpiCard component tests.
 *
 * @see Linear MEE-1689: Procedure KPI Cards. KpiCard generalizes the
 * trend-chip + delta-footer pattern previously inlined in
 * `apps/web/src/components/reports/training/training-kpi-cards.tsx`,
 * so future report domains (procedures, tasks, audits) can reuse it.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Total Procedures" value={142} />);
    expect(screen.getByText('Total Procedures')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<KpiCard label="Total" value={1} loading />);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('renders trend chip with bad styling when polarity is positive-bad and delta is positive', () => {
    const { container } = render(
      <KpiCard
        label="Overdue"
        value={47}
        delta={8}
        deltaPolarity="positive-bad"
        deltaContextLabel="vs. last 30 days"
      />
    );
    const chip = container.querySelector('[data-trend="bad"]');
    expect(chip).toBeInTheDocument();
    expect(chip!.textContent).toMatch(/8%/);
  });

  it('renders trend chip with good styling when polarity is positive-good and delta is positive', () => {
    const { container } = render(
      <KpiCard
        label="Acknowledgment Rate"
        value="92%"
        delta={5}
        deltaPolarity="positive-good"
        deltaContextLabel="vs. last 30 days"
      />
    );
    const chip = container.querySelector('[data-trend="good"]');
    expect(chip).toBeInTheDocument();
  });

  it('renders trend chip with good styling when polarity is positive-bad and delta is negative', () => {
    const { container } = render(
      <KpiCard
        label="Overdue"
        value={47}
        delta={-12}
        deltaPolarity="positive-bad"
        deltaContextLabel="vs. last 30 days"
      />
    );
    expect(container.querySelector('[data-trend="good"]')).toBeInTheDocument();
  });

  it('renders trend chip with bad styling when polarity is positive-good and delta is negative', () => {
    const { container } = render(
      <KpiCard
        label="Acknowledgment Rate"
        value="92%"
        delta={-5}
        deltaPolarity="positive-good"
        deltaContextLabel="vs. last 30 days"
      />
    );
    expect(container.querySelector('[data-trend="bad"]')).toBeInTheDocument();
  });

  it('renders neutral trend chip when delta is 0', () => {
    const { container } = render(
      <KpiCard
        label="Total"
        value={100}
        delta={0}
        deltaPolarity="positive-good"
        deltaContextLabel="vs. last 30 days"
      />
    );
    const chip = container.querySelector('[data-trend="neutral"]');
    expect(chip).toBeInTheDocument();
    expect(chip!.textContent).not.toMatch(/[↑↓]/);
    expect(chip!.querySelector('.sr-only')?.textContent).toMatch(/unchanged/i);
  });

  it('renders the deltaContextLabel below the trend chip', () => {
    render(
      <KpiCard
        label="Total"
        value={100}
        delta={5}
        deltaPolarity="positive-good"
        deltaContextLabel="vs. prior 30-day window"
      />
    );
    expect(screen.getByText('vs. prior 30-day window')).toBeInTheDocument();
  });

  it('omits the footer entirely when delta is undefined', () => {
    const { container } = render(<KpiCard label="Total" value={100} />);
    expect(container.querySelector('[data-trend]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="separator"]')).not.toBeInTheDocument();
  });

  it('shows urgent label when urgent is a positive number', () => {
    render(
      <KpiCard
        label="Overdue"
        value={47}
        urgent={9}
        delta={8}
        deltaPolarity="positive-bad"
        deltaContextLabel="vs. last 30 days"
      />
    );
    expect(screen.getByText(/9.*urgent/i)).toBeInTheDocument();
  });

  it('hides urgent label when urgent is 0', () => {
    render(<KpiCard label="Overdue" value={47} urgent={0} />);
    expect(screen.queryByText(/urgent/i)).not.toBeInTheDocument();
  });

  it('hides urgent label when urgent is undefined', () => {
    render(<KpiCard label="Overdue" value={47} />);
    expect(screen.queryByText(/urgent/i)).not.toBeInTheDocument();
  });

  it('accepts a ReactNode urgent label for custom rendering', () => {
    render(<KpiCard label="Overdue" value={47} urgent={<span>3 critical</span>} />);
    expect(screen.getByText('3 critical')).toBeInTheDocument();
  });

  it('renders on top of StatCard chrome (data-slot="stat-card")', () => {
    // KpiCard is a thin wrapper, so the rendered root keeps StatCard's data-slot.
    // This intentionally preserves the selector used by callers like
    // training-kpi-cards.test.tsx when they migrate onto KpiCard later.
    const { container } = render(<KpiCard label="Total" value={1} />);
    expect(container.querySelector('[data-slot="stat-card"]')).toBeInTheDocument();
  });

  it('forwards icon to the StatCard slot', () => {
    render(<KpiCard label="Total" value={1} icon={<span data-testid="kpi-icon" />} />);
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  it('forwards labelTooltip to StatCard', () => {
    const { container } = render(
      <KpiCard label="Total" value={1} labelTooltip="How this is computed" />
    );
    expect(container.querySelector('[data-slot="stat-card"]')).toBeInTheDocument();
  });
});
