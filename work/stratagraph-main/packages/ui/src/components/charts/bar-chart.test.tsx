/**
 * BarChart (recharts) component tests.
 *
 * @see Linear MEE-1617 / MEE-1627: Training report components.
 * @see Linear MEE-1770: Stacked bar chart should only round end segments.
 *
 * Atomic recharts-based bar chart with horizontal/vertical layout and
 * stacked support. Lives at a deep import path to avoid name collision
 * with the legacy visx BarChart still re-exported from @repo/ui.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ChartConfig } from '@/components/ui/chart';
import { BarChart, getStackedBarRadius } from './bar-chart';

const config = {
  pending: { label: 'Pending', color: 'var(--chart-1)' },
  inProgress: { label: 'In Progress', color: 'var(--chart-2)' },
  dueSoon: { label: 'Due Soon', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const data = [
  { name: 'Site A', pending: 10, inProgress: 20, dueSoon: 5 },
  { name: 'Site B', pending: 5, inProgress: 15, dueSoon: 8 },
];

// We deliberately don't assert that recharts produces SVG bar/axis
// elements. That requires the recharts useEffect dispatch chain to flush
// in jsdom, which is slow and flaky on CI runners. recharts has its own
// tests for that. We test the parts of this component that we own:
// - data-slot wiring
// - the getStackedBarRadius helper (pure logic)

describe('BarChart', () => {
  it('has data-slot="bar-chart" on the root element', () => {
    const { container } = render(
      <BarChart data={data} config={config} series={['pending']} categoryKey="name" />
    );
    expect(container.querySelector('[data-slot="bar-chart"]')).toBeInTheDocument();
  });
});

// ─── getStackedBarRadius ──────────────────────────────────────────────────────

describe('getStackedBarRadius', () => {
  // Horizontal layout (vertical bars): first series rounds bottom corners,
  // last series rounds top corners, middle series are square.

  describe('horizontal layout (default) — stacked', () => {
    it('returns bottom-corner radius for the first series (index 0 of 2)', () => {
      expect(getStackedBarRadius({ index: 0, total: 2, layout: 'horizontal' })).toEqual([
        0, 0, 4, 4,
      ]);
    });

    it('returns top-corner radius for the last series (index 1 of 2)', () => {
      expect(getStackedBarRadius({ index: 1, total: 2, layout: 'horizontal' })).toEqual([
        4, 4, 0, 0,
      ]);
    });

    it('returns zero radius for a middle series in a 3-series stack', () => {
      expect(getStackedBarRadius({ index: 1, total: 3, layout: 'horizontal' })).toEqual(0);
    });

    it('returns bottom-corner radius for first series in a 3-series stack', () => {
      expect(getStackedBarRadius({ index: 0, total: 3, layout: 'horizontal' })).toEqual([
        0, 0, 4, 4,
      ]);
    });

    it('returns top-corner radius for last series in a 3-series stack', () => {
      expect(getStackedBarRadius({ index: 2, total: 3, layout: 'horizontal' })).toEqual([
        4, 4, 0, 0,
      ]);
    });
  });

  // Vertical layout (horizontal bars): first series rounds left corners,
  // last series rounds right corners, middle series are square.

  describe('vertical layout — stacked', () => {
    it('returns left-corner radius for the first series (index 0 of 2)', () => {
      expect(getStackedBarRadius({ index: 0, total: 2, layout: 'vertical' })).toEqual([4, 0, 0, 4]);
    });

    it('returns right-corner radius for the last series (index 1 of 2)', () => {
      expect(getStackedBarRadius({ index: 1, total: 2, layout: 'vertical' })).toEqual([0, 4, 4, 0]);
    });

    it('returns zero radius for a middle series in a 3-series vertical stack', () => {
      expect(getStackedBarRadius({ index: 1, total: 3, layout: 'vertical' })).toEqual(0);
    });

    it('returns left-corner radius for first series in a 3-series vertical stack', () => {
      expect(getStackedBarRadius({ index: 0, total: 3, layout: 'vertical' })).toEqual([4, 0, 0, 4]);
    });

    it('returns right-corner radius for last series in a 3-series vertical stack', () => {
      expect(getStackedBarRadius({ index: 2, total: 3, layout: 'vertical' })).toEqual([0, 4, 4, 0]);
    });
  });

  describe('non-stacked — all bars get uniform radius', () => {
    it('returns 4 for any index when stacked=false (horizontal)', () => {
      expect(
        getStackedBarRadius({ index: 0, total: 3, layout: 'horizontal', stacked: false })
      ).toBe(4);
      expect(
        getStackedBarRadius({ index: 1, total: 3, layout: 'horizontal', stacked: false })
      ).toBe(4);
      expect(
        getStackedBarRadius({ index: 2, total: 3, layout: 'horizontal', stacked: false })
      ).toBe(4);
    });

    it('returns 4 for any index when stacked=false (vertical)', () => {
      expect(getStackedBarRadius({ index: 0, total: 2, layout: 'vertical', stacked: false })).toBe(
        4
      );
      expect(getStackedBarRadius({ index: 1, total: 2, layout: 'vertical', stacked: false })).toBe(
        4
      );
    });
  });

  // Single-series stack edge case: a 1-series stacked chart should have both
  // ends rounded (the lone segment is simultaneously the bottom and top of
  // the stack). Returning only the bottom-corner tuple (`[0,0,4,4]`) when
  // `isFirst && isLast` would leave the top of a vertical bar square — which
  // looks broken next to non-stacked single-series bars that get `radius={4}`.
  describe('single-series stack (total === 1)', () => {
    it('returns uniform 4 for the lone series in stacked horizontal mode', () => {
      expect(getStackedBarRadius({ index: 0, total: 1, layout: 'horizontal' })).toBe(4);
    });

    it('returns uniform 4 for the lone series in stacked vertical mode', () => {
      expect(getStackedBarRadius({ index: 0, total: 1, layout: 'vertical' })).toBe(4);
    });
  });

  describe('BarChart component — stacked radius integration', () => {
    it('renders without throwing in stacked horizontal mode with 2 series', () => {
      expect(() =>
        render(
          <BarChart
            data={data}
            config={config}
            series={['pending', 'inProgress']}
            categoryKey="name"
            stacked
          />
        )
      ).not.toThrow();
    });

    it('renders without throwing in stacked horizontal mode with 3 series', () => {
      expect(() =>
        render(
          <BarChart
            data={data}
            config={config}
            series={['pending', 'inProgress', 'dueSoon']}
            categoryKey="name"
            stacked
          />
        )
      ).not.toThrow();
    });

    it('renders without throwing in stacked vertical mode', () => {
      expect(() =>
        render(
          <BarChart
            data={data}
            config={config}
            series={['pending', 'inProgress', 'dueSoon']}
            categoryKey="name"
            layout="vertical"
            stacked
          />
        )
      ).not.toThrow();
    });

    it('renders without throwing in non-stacked mode', () => {
      expect(() =>
        render(
          <BarChart
            data={data}
            config={config}
            series={['pending', 'inProgress']}
            categoryKey="name"
          />
        )
      ).not.toThrow();
    });
  });
});
