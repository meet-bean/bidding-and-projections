import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DonutChart } from './donut-chart.js';
import type { DonutDatum } from './chart-types.js';

// Mock ChartContainer to provide fixed dimensions in jsdom
vi.mock('./chart-container.js', () => ({
  ChartContainer: ({
    children,
  }: {
    children: (dims: { width: number; height: number }) => React.ReactNode;
  }) => <>{children({ width: 400, height: 300 })}</>,
}));

// ─── Test data ──────────────────────────────────────────────

const donutData: DonutDatum[] = [
  { label: 'Active', value: 234, color: '#10b981' },
  { label: 'Expiring', value: 56, color: '#f59e0b' },
  { label: 'Expired', value: 38, color: '#ef4444' },
];

const singleDatum: DonutDatum[] = [{ label: 'Only', value: 100 }];

const twoSegments: DonutDatum[] = [
  { label: 'Yes', value: 80 },
  { label: 'No', value: 20 },
];

// ─── Tests ──────────────────────────────────────────────────

describe('DonutChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders an svg with img role and descriptive aria-label', () => {
      render(<DonutChart data={donutData} />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label');
      const label = svg.getAttribute('aria-label') ?? '';
      expect(label).toContain('Active 234');
      expect(label).toContain('Expiring 56');
      expect(label).toContain('Expired 38');
    });

    it('renders path elements for each data segment', () => {
      const { container } = render(<DonutChart data={donutData} />);
      const paths = container.querySelectorAll('svg path');
      expect(paths.length).toBeGreaterThanOrEqual(donutData.length);
    });

    it('applies custom className to wrapper', () => {
      const { container } = render(<DonutChart data={donutData} className="my-donut" />);
      expect(container.firstElementChild).toHaveClass('my-donut');
    });

    it('uses datum colors for fills', () => {
      const { container } = render(<DonutChart data={donutData} />);
      const paths = container.querySelectorAll('svg path');
      expect(paths[0]).toHaveAttribute('fill', '#10b981');
      expect(paths[1]).toHaveAttribute('fill', '#f59e0b');
      expect(paths[2]).toHaveAttribute('fill', '#ef4444');
    });
  });

  describe('empty data', () => {
    it('renders an empty div when data is empty', () => {
      const { container } = render(<DonutChart data={[]} />);
      const div = container.firstElementChild;
      expect(div).toBeInTheDocument();
      expect(div?.tagName).toBe('DIV');
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('applies className to empty div', () => {
      const { container } = render(<DonutChart data={[]} className="empty-donut" />);
      expect(container.firstElementChild).toHaveClass('empty-donut');
    });
  });

  describe('single segment', () => {
    it('renders one path for a single data point', () => {
      const { container } = render(<DonutChart data={singleDatum} />);
      const paths = container.querySelectorAll('svg path');
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('innerRadiusRatio', () => {
    /** Extract path `d` attributes from all rendered arc segments */
    function getPathDs(container: HTMLElement): string[] {
      return Array.from(container.querySelectorAll('svg path')).map(
        (p) => p.getAttribute('d') ?? ''
      );
    }

    it('produces different arc paths for different innerRadiusRatio values', () => {
      const { container: defaultContainer } = render(<DonutChart data={twoSegments} />);
      const { container: pieContainer } = render(
        <DonutChart data={twoSegments} innerRadiusRatio={0} />
      );
      const { container: thinContainer } = render(
        <DonutChart data={twoSegments} innerRadiusRatio={0.9} />
      );

      const defaultDs = getPathDs(defaultContainer);
      const pieDs = getPathDs(pieContainer);
      const thinDs = getPathDs(thinContainer);

      // All should render valid paths
      expect(defaultDs).toHaveLength(2);
      expect(pieDs).toHaveLength(2);
      expect(thinDs).toHaveLength(2);

      // Paths must differ between each ratio value
      expect(defaultDs[0]).not.toBe(pieDs[0]);
      expect(defaultDs[0]).not.toBe(thinDs[0]);
      expect(pieDs[0]).not.toBe(thinDs[0]);
    });

    it('renders a full wedge (no inner cutout) when innerRadiusRatio=0', () => {
      const { container: pieContainer } = render(
        <DonutChart data={twoSegments} innerRadiusRatio={0} />
      );
      const { container: donutContainer } = render(
        <DonutChart data={twoSegments} innerRadiusRatio={0.6} />
      );

      const pieDs = getPathDs(pieContainer);
      const donutDs = getPathDs(donutContainer);

      // A pie (ratio=0) path starts at center and has fewer arc commands
      // because there is no inner arc to trace. A donut path is longer
      // since it must trace both the outer and inner arcs.
      for (let i = 0; i < pieDs.length; i++) {
        expect(pieDs[i]!.length).toBeLessThan(donutDs[i]!.length);
      }
    });

    it('renders a thinner ring as innerRadiusRatio increases', () => {
      const { container: smallHole } = render(
        <DonutChart data={twoSegments} innerRadiusRatio={0.3} />
      );
      const { container: largeHole } = render(
        <DonutChart data={twoSegments} innerRadiusRatio={0.9} />
      );

      const smallDs = getPathDs(smallHole);
      const largeDs = getPathDs(largeHole);

      // Both render 2 segments
      expect(smallDs).toHaveLength(2);
      expect(largeDs).toHaveLength(2);

      // The paths must differ to prove the ratio affects rendering
      expect(smallDs[0]).not.toBe(largeDs[0]);
      expect(smallDs[1]).not.toBe(largeDs[1]);
    });
  });

  describe('labels', () => {
    it('does not show labels by default', () => {
      render(<DonutChart data={donutData} />);
      // Labels render inside svg as <text> with content like "Active: 234"
      expect(screen.queryByText(/Active: 234/)).not.toBeInTheDocument();
    });

    it('shows labels when showLabels=true for large enough segments', () => {
      render(<DonutChart data={donutData} showLabels />);
      // The Active segment (234 out of 328) is large enough to show label
      expect(screen.getByText('Active: 234')).toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('does not render legend by default', () => {
      render(<DonutChart data={donutData} />);
      // Legend text would be in a div, not svg
      const legendContainer = screen.queryByText('Active: 234');
      expect(legendContainer).not.toBeInTheDocument();
    });

    it('renders legend when showLegend=true', () => {
      render(<DonutChart data={donutData} showLegend />);
      // Legend shows "label: value"
      expect(screen.getByText('Active: 234')).toBeInTheDocument();
      expect(screen.getByText('Expiring: 56')).toBeInTheDocument();
      expect(screen.getByText('Expired: 38')).toBeInTheDocument();
    });
  });

  describe('hover interaction', () => {
    it('dims non-hovered segments on mouse enter', async () => {
      const user = userEvent.setup();
      const { container } = render(<DonutChart data={donutData} />);
      const segments = container.querySelectorAll('svg g[style*="cursor: pointer"]');
      expect(segments.length).toBe(3);

      // Before hover, all segments should have opacity 1
      const paths = container.querySelectorAll('svg path');
      for (const path of paths) {
        expect(path).toHaveAttribute('opacity', '1');
      }

      // Hover over the first segment
      await user.hover(segments[0]!);

      // First segment stays full opacity, others dimmed
      const updatedPaths = container.querySelectorAll('svg path');
      expect(updatedPaths[0]).toHaveAttribute('opacity', '1');
      expect(updatedPaths[1]).toHaveAttribute('opacity', '0.6');
      expect(updatedPaths[2]).toHaveAttribute('opacity', '0.6');
    });

    it('restores opacity on mouse leave', async () => {
      const user = userEvent.setup();
      const { container } = render(<DonutChart data={donutData} />);
      const segments = container.querySelectorAll('svg g[style*="cursor: pointer"]');

      await user.hover(segments[0]!);
      await user.unhover(segments[0]!);

      const paths = container.querySelectorAll('svg path');
      for (const path of paths) {
        expect(path).toHaveAttribute('opacity', '1');
      }
    });
  });
});
