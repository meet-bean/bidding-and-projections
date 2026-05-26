import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart } from './bar-chart.js';
import type { BarDatum } from './chart-types.js';

// Mock ChartContainer to provide fixed dimensions in jsdom
vi.mock('./chart-container.js', () => ({
  ChartContainer: ({
    children,
  }: {
    children: (dims: { width: number; height: number }) => React.ReactNode;
  }) => <>{children({ width: 600, height: 300 })}</>,
}));

// ─── Test data ──────────────────────────────────────────────

const simpleData: BarDatum[] = [
  { label: 'Category A', values: [{ key: 'Value', value: 95 }] },
  { label: 'Category B', values: [{ key: 'Value', value: 72 }] },
  { label: 'Category C', values: [{ key: 'Value', value: 58 }] },
];

const stackedData: BarDatum[] = [
  {
    label: 'Q1',
    values: [
      { key: 'Active', value: 58 },
      { key: 'Expiring', value: 12 },
      { key: 'Expired', value: 15 },
    ],
  },
  {
    label: 'Q2',
    values: [
      { key: 'Active', value: 65 },
      { key: 'Expiring', value: 8 },
      { key: 'Expired', value: 10 },
    ],
  },
];

const groupedData: BarDatum[] = [
  {
    label: 'Q1',
    values: [
      { key: 'Training', value: 82 },
      { key: 'Certifications', value: 75 },
    ],
  },
  {
    label: 'Q2',
    values: [
      { key: 'Training', value: 88 },
      { key: 'Certifications', value: 79 },
    ],
  },
];

const singleDatum: BarDatum[] = [{ label: 'Only', values: [{ key: 'Value', value: 42 }] }];

// ─── Tests ──────────────────────────────────────────────────

describe('BarChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders an svg with img role and aria-label', () => {
      render(<BarChart data={simpleData} />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', 'Bar chart with 3 categories');
    });

    it('renders bars for each data category', () => {
      const { container } = render(<BarChart data={simpleData} />);
      // Each simple datum renders one <rect> bar via visx Bar
      const rects = container.querySelectorAll('svg rect');
      expect(rects.length).toBeGreaterThanOrEqual(simpleData.length);
    });

    it('applies custom className to wrapper', () => {
      const { container } = render(<BarChart data={simpleData} className="my-chart" />);
      expect(container.firstElementChild).toHaveClass('my-chart');
    });
  });

  describe('empty data', () => {
    it('renders an empty div when data is empty', () => {
      const { container } = render(<BarChart data={[]} />);
      const div = container.firstElementChild;
      expect(div).toBeInTheDocument();
      expect(div?.tagName).toBe('DIV');
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('applies className to empty div', () => {
      const { container } = render(<BarChart data={[]} className="empty-chart" />);
      expect(container.firstElementChild).toHaveClass('empty-chart');
    });
  });

  describe('single data point', () => {
    it('renders a chart with one category', () => {
      render(<BarChart data={singleDatum} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Bar chart with 1 category');
    });
  });

  describe('variants', () => {
    it('renders stacked bars (multiple rects per category)', () => {
      const { container } = render(<BarChart data={stackedData} variant="stacked" />);
      const rects = container.querySelectorAll('svg rect');
      // 2 categories * 3 values each = 6 bars
      expect(rects.length).toBeGreaterThanOrEqual(6);
    });

    it('renders grouped bars (multiple rects per category)', () => {
      const { container } = render(<BarChart data={groupedData} variant="grouped" />);
      const rects = container.querySelectorAll('svg rect');
      // 2 categories * 2 values each = 4 bars
      expect(rects.length).toBeGreaterThanOrEqual(4);
    });

    it('renders simple bars by default', () => {
      const { container } = render(<BarChart data={simpleData} />);
      const rects = container.querySelectorAll('svg rect');
      // Simple: one rect per category = 3
      expect(rects.length).toBeGreaterThanOrEqual(simpleData.length);
    });
  });

  describe('orientation', () => {
    it('renders vertical bars by default (taller than wide)', () => {
      const { container } = render(<BarChart data={simpleData} />);
      const rects = container.querySelectorAll('svg rect');
      expect(rects.length).toBeGreaterThanOrEqual(1);
      const rect = rects[0]!;
      const height = Number(rect.getAttribute('height'));
      const width = Number(rect.getAttribute('width'));
      // Vertical bars are taller than wide
      expect(height).toBeGreaterThan(width);
    });

    it('renders horizontal bars (wider than tall)', () => {
      const { container } = render(<BarChart data={simpleData} orientation="horizontal" />);
      const rects = container.querySelectorAll('svg rect');
      expect(rects.length).toBeGreaterThanOrEqual(1);
      const rect = rects[0]!;
      const height = Number(rect.getAttribute('height'));
      const width = Number(rect.getAttribute('width'));
      // Horizontal bars are wider than tall
      expect(width).toBeGreaterThan(height);
    });
  });

  describe('axes', () => {
    it('renders axes by default (showAxes=true)', () => {
      const { container } = render(<BarChart data={simpleData} />);
      // visx axes render as <g> with class containing "visx-axis"
      const axes = container.querySelectorAll('.visx-axis-bottom, .visx-axis-left');
      expect(axes.length).toBe(2);
    });

    it('hides axes when showAxes=false', () => {
      const { container } = render(<BarChart data={simpleData} showAxes={false} />);
      const axes = container.querySelectorAll('.visx-axis-bottom, .visx-axis-left');
      expect(axes.length).toBe(0);
    });
  });

  describe('value labels', () => {
    it('does not show values by default', () => {
      render(<BarChart data={simpleData} />);
      // Value text for each datum should be absent
      expect(screen.queryByText('95')).not.toBeInTheDocument();
      expect(screen.queryByText('72')).not.toBeInTheDocument();
      expect(screen.queryByText('58')).not.toBeInTheDocument();
    });

    it('shows value labels when showValues=true', () => {
      render(<BarChart data={simpleData} showValues />);
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('does not render legend for single-key data', () => {
      render(<BarChart data={simpleData} />);
      // simpleData has a single key "Value" — legend should not render it
      expect(screen.queryByText('Value')).not.toBeInTheDocument();
    });

    it('renders legend for multi-key data', () => {
      render(<BarChart data={stackedData} variant="stacked" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Expiring')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  describe('custom colors', () => {
    it('uses datum-level color when provided', () => {
      const coloredData: BarDatum[] = [
        {
          label: 'A',
          values: [{ key: 'Val', value: 50, color: '#ff0000' }],
        },
      ];
      const { container } = render(<BarChart data={coloredData} />);
      const rects = Array.from(container.querySelectorAll('svg rect')).filter(
        (r) => r.getAttribute('fill') !== 'transparent' && r.getAttribute('fill') !== 'none'
      );
      expect(rects[0]).toHaveAttribute('fill', '#ff0000');
    });
  });
});
