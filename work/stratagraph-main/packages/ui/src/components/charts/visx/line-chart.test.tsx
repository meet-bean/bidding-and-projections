import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineChart } from './line-chart.js';
import type { LineSeries } from './chart-types.js';

// Mock ChartContainer to provide fixed dimensions in jsdom
vi.mock('./chart-container.js', () => ({
  ChartContainer: ({
    children,
  }: {
    children: (dims: { width: number; height: number }) => React.ReactNode;
  }) => <>{children({ width: 600, height: 300 })}</>,
}));

// ─── Test data ──────────────────────────────────────────────

const singleSeries: LineSeries[] = [
  {
    label: 'Compliance',
    color: '#10b981',
    data: [
      { x: new Date(2025, 0, 1), y: 65 },
      { x: new Date(2025, 1, 1), y: 68 },
      { x: new Date(2025, 2, 1), y: 72 },
    ],
  },
];

const multiSeries: LineSeries[] = [
  {
    label: 'Site A',
    color: '#3b82f6',
    data: [
      { x: new Date(2025, 0, 1), y: 80 },
      { x: new Date(2025, 1, 1), y: 82 },
    ],
  },
  {
    label: 'Site B',
    color: '#10b981',
    data: [
      { x: new Date(2025, 0, 1), y: 70 },
      { x: new Date(2025, 1, 1), y: 75 },
    ],
  },
];

const numericSeries: LineSeries[] = [
  {
    label: 'Values',
    color: '#3b82f6',
    data: [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 15 },
    ],
  },
];

// ─── Tests ──────────────────────────────────────────────────

describe('LineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders an svg with img role and aria-label', () => {
      render(<LineChart series={singleSeries} />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', 'Line chart with 1 series');
    });

    it('shows correct series count in aria-label', () => {
      render(<LineChart series={multiSeries} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Line chart with 2 series');
    });

    it('applies custom className to wrapper', () => {
      const { container } = render(<LineChart series={singleSeries} className="my-line" />);
      expect(container.firstElementChild).toHaveClass('my-line');
    });

    it('renders line paths for each series', () => {
      const { container } = render(<LineChart series={multiSeries} />);
      // visx LinePath renders <path> elements with stroke
      const paths = container.querySelectorAll('path[stroke]');
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it('renders data point circles', () => {
      const { container } = render(<LineChart series={singleSeries} />);
      // Data point circles use r=3, tooltip circles use r=5
      const circles = container.querySelectorAll('circle[r="3"]');
      expect(circles.length).toBe(3);
    });
  });

  describe('empty / minimal data', () => {
    it('handles empty series array', () => {
      const { container } = render(<LineChart series={[]} />);
      // Should still render svg structure
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('handles series with empty data array', () => {
      const emptySeries: LineSeries[] = [{ label: 'Empty', color: '#000', data: [] }];
      const { container } = render(<LineChart series={emptySeries} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('numeric x-axis', () => {
    it('renders with numeric x values', () => {
      render(<LineChart series={numericSeries} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('grid', () => {
    it('renders grid by default', () => {
      const { container } = render(<LineChart series={singleSeries} />);
      // visx GridRows renders lines with class visx-rows
      const grid = container.querySelector('.visx-rows');
      expect(grid).toBeInTheDocument();
    });

    it('hides grid when showGrid=false', () => {
      const { container } = render(<LineChart series={singleSeries} showGrid={false} />);
      const grid = container.querySelector('.visx-rows');
      expect(grid).not.toBeInTheDocument();
    });
  });

  describe('axes', () => {
    it('renders axes by default', () => {
      const { container } = render(<LineChart series={singleSeries} />);
      const axes = container.querySelectorAll('.visx-axis-bottom, .visx-axis-left');
      expect(axes.length).toBe(2);
    });

    it('hides axes when showAxes=false', () => {
      const { container } = render(<LineChart series={singleSeries} showAxes={false} />);
      const axes = container.querySelectorAll('.visx-axis-bottom, .visx-axis-left');
      expect(axes.length).toBe(0);
    });
  });

  describe('legend', () => {
    it('renders legend by default', () => {
      render(<LineChart series={multiSeries} />);
      expect(screen.getByText('Site A')).toBeInTheDocument();
      expect(screen.getByText('Site B')).toBeInTheDocument();
    });

    it('hides legend when showLegend=false', () => {
      render(<LineChart series={multiSeries} showLegend={false} />);
      expect(screen.queryByText('Site A')).not.toBeInTheDocument();
    });
  });

  describe('curve types', () => {
    it.each(['linear', 'monotone', 'natural', 'step'] as const)(
      'renders with %s curve',
      (curveType) => {
        const { container } = render(<LineChart series={singleSeries} curveType={curveType} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
      }
    );
  });

  describe('tooltip interaction area', () => {
    it('renders transparent rect for mouse interaction', () => {
      const { container } = render(<LineChart series={singleSeries} />);
      const interactionRect = container.querySelector('rect[fill="transparent"]');
      expect(interactionRect).toBeInTheDocument();
    });
  });

  describe('tooltip overflow', () => {
    it('uses computeTooltipLeft to position the tooltip', () => {
      const { container } = render(<LineChart series={singleSeries} />);
      // jsdom does not compute layout; the actual flip is covered by
      // tooltip-flip.test.ts. Smoke-check that the interaction rect is wired.
      expect(container.querySelector('rect[fill="transparent"]')).toBeInTheDocument();
    });
  });
});
