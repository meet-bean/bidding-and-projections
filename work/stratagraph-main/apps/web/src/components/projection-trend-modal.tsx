'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { phaseHistory, formatCurrency } from '@repo/projections';
import type { ProjectionProject } from '@repo/projections';

interface ProjectionTrendModalProps {
  project: ProjectionProject;
  lineKey: string | null;
  onClose: () => void;
}

export function ProjectionTrendModal({
  project,
  lineKey,
  onClose,
}: ProjectionTrendModalProps) {
  const currentVersion = project.draft ?? project.versions[project.versions.length - 1];
  const item =
    lineKey && currentVersion
      ? currentVersion.items.find((i) => i.lineKey === lineKey)
      : null;

  const history = lineKey ? phaseHistory(project, lineKey) : [];

  // Simple SVG line chart — no dependency needed
  const width = 480;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = history
    .flatMap((p) => [p.forecast, p.actualToDate, p.estimate])
    .filter((v) => v > 0);
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const minVal = 0;

  const xScale = (i: number) => (i / Math.max(history.length - 1, 1)) * chartWidth;
  const yScale = (v: number) =>
    chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;

  const toPath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`)
      .join(' ');

  return (
    <Dialog open={lineKey !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item ? `${item.keyParts[0]} · ${item.label}` : 'Trend'}
          </DialogTitle>
        </DialogHeader>

        {history.length < 2 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Need at least 2 versions for a trend chart.
          </p>
        ) : (
          <div className="space-y-3">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
              <g transform={`translate(${padding.left},${padding.top})`}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = yScale(minVal + t * (maxVal - minVal));
                  return (
                    <g key={t}>
                      <line
                        x1={0}
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.1}
                      />
                      <text
                        x={-8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={9}
                        fill="currentColor"
                        opacity={0.5}
                      >
                        {formatCurrency(minVal + t * (maxVal - minVal))}
                      </text>
                    </g>
                  );
                })}

                {/* Lines */}
                <path
                  d={toPath(history.map((p) => p.forecast))}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <path
                  d={toPath(history.map((p) => p.actualToDate))}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <path
                  d={toPath(history.map((p) => p.estimate))}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />

                {/* X axis labels */}
                {history.map((p, i) => (
                  <text
                    key={i}
                    x={xScale(i)}
                    y={chartHeight + 15}
                    textAnchor="middle"
                    fontSize={9}
                    fill="currentColor"
                    opacity={0.6}
                  >
                    {p.versionLabel
                      .replace(' Projection', '')
                      .replace(' projection', '')}
                  </text>
                ))}
              </g>
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 bg-blue-500 rounded" />
                Forecast
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 bg-emerald-500 rounded border-dashed" />
                Actual to Date
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 bg-amber-500 rounded opacity-60" />
                Estimate
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
