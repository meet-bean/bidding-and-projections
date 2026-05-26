import type { FinancialSummaryMonth } from '@repo/projections';

interface PnlTrendChartProps {
  months: FinancialSummaryMonth[];
  height?: number;
}

export function PnlTrendChart({ months, height = 180 }: PnlTrendChartProps) {
  if (months.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
        <p className="text-muted-foreground text-sm">Need at least 2 months for a trend chart.</p>
      </div>
    );
  }

  const width = 480;
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = months.flatMap((m) => [m.revenue, m.cost]);
  const maxVal = Math.max(...allValues);
  const minVal = 0;

  const xScale = (i: number) => (i / Math.max(months.length - 1, 1)) * chartWidth;
  const yScale = (v: number) =>
    chartHeight - ((v - minVal) / (maxVal - minVal || 1)) * chartHeight;

  const toPath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`)
      .join(' ');

  const formatAxis = (val: number): string => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  };

  const formatMonth = (date: string): string => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <g transform={`translate(${padding.left},${padding.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = yScale(minVal + t * (maxVal - minVal));
            return (
              <g key={t}>
                <line x1={0} y1={y} x2={chartWidth} y2={y} stroke="currentColor" strokeOpacity={0.08} />
                <text x={-8} y={y + 3} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.4}>
                  {formatAxis(minVal + t * (maxVal - minVal))}
                </text>
              </g>
            );
          })}

          <path d={toPath(months.map((m) => m.revenue))} fill="none" stroke="#16a34a" strokeWidth={2} />
          <path
            d={toPath(months.map((m) => m.cost))}
            fill="none"
            stroke="#dc2626"
            strokeWidth={2}
            strokeDasharray="6 3"
          />

          {months.map((m, i) => (
            <text
              key={m.date}
              x={xScale(i)}
              y={chartHeight + 16}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              opacity={0.5}
            >
              {formatMonth(m.date)}
            </text>
          ))}
        </g>
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded bg-green-600" />
          Revenue
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded border-dashed bg-red-600" />
          Cost
        </div>
      </div>
    </div>
  );
}
