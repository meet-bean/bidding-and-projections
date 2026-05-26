/**
 * TableCard component tests.
 *
 * @see Linear MEE-1618 / MEE-1627: Training report components.
 *
 * Compound card chrome wrapping either a single table or a tabbed set of
 * tables (with optional count badges per tab), plus a loading skeleton,
 * empty-state slot, and optional footer.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableCard } from './table-card';
import type { TabsListProps } from './ui/tabs';

describe('TableCard', () => {
  it('renders single-table mode', () => {
    render(<TableCard title="Users" table={<div data-testid="table" />} />);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('renders tabs and the first tab as default', () => {
    render(
      <TableCard
        title="At Risk"
        tabs={[
          { key: 'overdue', label: 'Overdue', table: <div data-testid="t-overdue" /> },
          { key: '7d', label: 'Due 7d', table: <div data-testid="t-7d" /> },
        ]}
      />
    );
    // Assert active state on the trigger — Base UI Tabs may keep inactive
    // panels mounted, so testing only `*-overdue` content presence wouldn't
    // catch a regression where the wrong tab is selected.
    const overdueTab = screen.getByRole('tab', { name: /Overdue/ });
    const due7dTab = screen.getByRole('tab', { name: /Due 7d/ });
    expect(overdueTab).toHaveAttribute('aria-selected', 'true');
    expect(due7dTab).toHaveAttribute('aria-selected', 'false');
  });

  it('respects defaultTab prop', () => {
    render(
      <TableCard
        title="At Risk"
        defaultTab="7d"
        tabs={[
          { key: 'overdue', label: 'Overdue', table: <div data-testid="t-overdue" /> },
          { key: '7d', label: 'Due 7d', table: <div data-testid="t-7d" /> },
        ]}
      />
    );
    const overdueTab = screen.getByRole('tab', { name: /Overdue/ });
    const due7dTab = screen.getByRole('tab', { name: /Due 7d/ });
    expect(due7dTab).toHaveAttribute('aria-selected', 'true');
    expect(overdueTab).toHaveAttribute('aria-selected', 'false');
  });

  it('clamps defaultTab to first tab when key is not in tabs', () => {
    render(
      <TableCard
        title="At Risk"
        // Stale/typo key — should fall back to the first tab so the body
        // doesn't render blank.
        defaultTab="does-not-exist"
        tabs={[
          { key: 'overdue', label: 'Overdue', table: <div data-testid="t-overdue" /> },
          { key: '7d', label: 'Due 7d', table: <div data-testid="t-7d" /> },
        ]}
      />
    );
    // Base UI Tabs sets aria-selected on the active tab trigger. With the
    // stale defaultTab clamped to firstTab.key, "Overdue" is selected.
    const overdueTab = screen.getByRole('tab', { name: /Overdue/ });
    expect(overdueTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shows count badge on tab triggers when count is set', () => {
    render(
      <TableCard
        title="t"
        tabs={[
          { key: 'overdue', label: 'Overdue', count: 5, table: <div /> },
          { key: '7d', label: 'Due 7d', count: 12, table: <div /> },
        ]}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('omits count badge when count is not set', () => {
    render(<TableCard title="t" tabs={[{ key: 'overdue', label: 'Overdue', table: <div /> }]} />);
    // No badge should render — assertion: no element matching the badge data-slot
    const tabs = screen.getByRole('tablist');
    expect(tabs.querySelector('[data-slot="badge"]')).toBeNull();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<TableCard title="t" table={<div />} loading />);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it('renders empty slot when neither table nor tabs are provided', () => {
    render(<TableCard title="t" empty={<div data-testid="empty">No data</div>} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  it('has data-slot="table-card" on the root element', () => {
    const { container } = render(<TableCard title="t" table={<div />} />);
    expect(container.querySelector('[data-slot="table-card"]')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<TableCard title="t" table={<div />} footer={<span>Last updated 5m ago</span>} />);
    expect(screen.getByText('Last updated 5m ago')).toBeInTheDocument();
  });

  it('throws in dev when both table and tabs are provided', () => {
    // import.meta.env.DEV is true in tests by default with vitest.
    // Suppress error logging during this assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() =>
        render(
          <TableCard title="t" table={<div />} tabs={[{ key: 'a', label: 'A', table: <div /> }]} />
        )
      ).toThrow(/either `table` or `tabs`, not both/i);
    } finally {
      spy.mockRestore();
    }
  });

  it('omits CardHeader when no title and no description are provided', () => {
    const { container } = render(<TableCard table={<div data-testid="t">x</div>} />);
    expect(container.querySelector('[data-slot="card-header"]')).not.toBeInTheDocument();
    expect(screen.getByTestId('t')).toBeInTheDocument();
  });

  it('still renders CardHeader when only description is provided', () => {
    const { container } = render(
      <TableCard description="just a sub" table={<div data-testid="t">x</div>} />
    );
    expect(container.querySelector('[data-slot="card-header"]')).toBeInTheDocument();
  });

  describe('slotProps.tabList', () => {
    // Regression: prior implementation spread `slotProps.tabList` AFTER the
    // explicit `variant='line'` and merged `className`, so a caller-supplied
    // className silently replaced the internal `px-6` and a caller-supplied
    // variant silently overrode `line`. The fix destructures className +
    // variant out before spreading the rest.
    it('merges caller className with internal px-6 (does not clobber)', () => {
      render(
        <TableCard
          title="At Risk"
          tabs={[{ key: 'overdue', label: 'Overdue', table: <div /> }]}
          slotProps={{ tabList: { className: 'caller-class' } }}
        />
      );
      const tabList = screen.getByRole('tablist');
      // Both the internal layout class and the caller's class must be present.
      expect(tabList).toHaveClass('px-6');
      expect(tabList).toHaveClass('caller-class');
    });

    it('does not let caller-supplied variant override the explicit line variant', () => {
      render(
        <TableCard
          title="At Risk"
          tabs={[{ key: 'overdue', label: 'Overdue', table: <div /> }]}
          // Cast through unknown: this is an intentionally hostile call to
          // exercise the spread-clobber regression — narrowing it via the
          // TabsListProps surface would defeat the test.
          slotProps={{ tabList: { variant: 'default' } as unknown as TabsListProps }}
        />
      );
      const tabList = screen.getByRole('tablist');
      // The `line` variant renders with `border-b bg-transparent p-0`; the
      // `default` variant renders with `bg-muted rounded-lg p-1`. Assert the
      // line-variant class survives.
      expect(tabList.className).toMatch(/border-b/);
      expect(tabList.className).not.toMatch(/bg-muted/);
    });

    it('forwards unrelated tabList props through the spread', () => {
      render(
        <TableCard
          title="At Risk"
          tabs={[{ key: 'overdue', label: 'Overdue', table: <div /> }]}
          slotProps={{ tabList: { 'aria-label': 'risk tabs' } as TabsListProps }}
        />
      );
      const tabList = screen.getByRole('tablist');
      expect(tabList).toHaveAttribute('aria-label', 'risk tabs');
    });
  });
});
