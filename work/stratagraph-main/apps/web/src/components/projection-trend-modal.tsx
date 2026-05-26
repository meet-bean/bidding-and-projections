'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@repo/ui';
import { phaseHistory, formatCurrency } from '@repo/projections';
import type { ProjectionProject } from '@repo/projections';

interface ProjectionTrendModalProps {
  project: ProjectionProject;
  lineKey: string | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// TrendChart — reusable SVG line chart
// ---------------------------------------------------------------------------

interface TrendLine {
  values: (number | null)[];
  color: string;
  dash?: string;
  label: string;
}

interface TrendChartProps {
  history: { label: string }[];
  lines: TrendLine[];
  referenceLine?: number;
  width?: number;
  height?: number;
}

function TrendChart({
  history,
  lines,
  referenceLine,
  width = 480,
  height = 200,
}: TrendChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = lines
    .flatMap((l) => l.values)
    .filter((v): v is number => v !== null && isFinite(v));
  if (referenceLine !== undefined && isFinite(referenceLine)) {
    allValues.push(referenceLine);
  }
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const minVal = allValues.length ? Math.min(...allValues, 0) : 0;
  const range = maxVal - minVal || 1;

  const xScale = (i: number) => (i / Math.max(history.length - 1, 1)) * chartWidth;
  const yScale = (v: number) => chartHeight - ((v - minVal) / range) * chartHeight;

  const toPath = (values: (number | null)[]) => {
    const segments: string[] = [];
    let penDown = false;
    for (let i = 0; i < values.length; i++) {
      const v = values[i] ?? null;
      if (v === null || !isFinite(v)) {
        penDown = false;
        continue;
      }
      const x = xScale(i).toFixed(1);
      const y = yScale(v).toFixed(1);
      segments.push(`${penDown ? 'L' : 'M'} ${x} ${y}`);
      penDown = true;
    }
    return segments.join(' ');
  };

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%' }}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Grid lines */}
        {gridTicks.map((t) => {
          const v = minVal + t * range;
          const y = yScale(v);
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
                {v.toFixed(v >= 1000 ? 0 : v >= 10 ? 1 : 2)}
              </text>
            </g>
          );
        })}

        {/* Optional horizontal reference line */}
        {referenceLine !== undefined && isFinite(referenceLine) && (
          <line
            x1={0}
            y1={yScale(referenceLine)}
            x2={chartWidth}
            y2={yScale(referenceLine)}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="5 3"
            strokeOpacity={0.8}
          />
        )}

        {/* Data lines */}
        {lines.map((line) => (
          <path
            key={line.label}
            d={toPath(line.values)}
            fill="none"
            stroke={line.color}
            strokeWidth={line.dash ? 1.5 : 2}
            strokeDasharray={line.dash}
            strokeOpacity={line.color === '#f59e0b' ? 0.7 : 1}
          />
        ))}

        {/* X-axis labels */}
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
            {p.label
              .replace(' Projection', '')
              .replace(' projection', '')}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// MiniChart label
// ---------------------------------------------------------------------------

function MiniChartCard({
  title,
  history,
  lines,
  referenceLine,
}: {
  title: string;
  history: { label: string }[];
  lines: TrendLine[];
  referenceLine?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <TrendChart
        history={history}
        lines={lines}
        referenceLine={referenceLine}
        width={240}
        height={120}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

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

  // Shared x-axis labels (strip noise)
  const xLabels = history.map((p) => ({ label: p.versionLabel }));

  // Reference values from first version
  const first = history[0];
  const refCost = first?.estimate;
  const refUC = first?.estUC;
  const refMPU = first?.estMPU;
  const refUPM = first?.estUPM ?? undefined;

  // Latest data point for stats row
  const latest = history[history.length - 1];

  return (
    <Dialog open={lineKey !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
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
            <Tabs defaultValue="overview">
              <TabsList variant="line" className="h-8">
                <TabsTrigger value="overview" className="text-xs px-3 py-1 flex-none">Overview</TabsTrigger>
                <TabsTrigger value="cost" className="text-xs px-3 py-1 flex-none">Cost</TabsTrigger>
                <TabsTrigger value="uc" className="text-xs px-3 py-1 flex-none">Unit Cost</TabsTrigger>
                <TabsTrigger value="mhu" className="text-xs px-3 py-1 flex-none">MH/Unit</TabsTrigger>
                <TabsTrigger value="umh" className="text-xs px-3 py-1 flex-none">Unit/MH</TabsTrigger>
              </TabsList>

              {/* ── Overview ─────────────────────────────────────────── */}
              <TabsContent value="overview" className="pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <MiniChartCard
                    title="Cost"
                    history={xLabels}
                    lines={[
                      { label: 'Forecast', values: history.map((p) => p.forecast), color: '#3b82f6' },
                      { label: 'Actual', values: history.map((p) => p.actualToDate), color: '#10b981', dash: '4 2' },
                      { label: 'Estimate', values: history.map((p) => p.estimate), color: '#f59e0b' },
                    ]}
                    referenceLine={refCost}
                  />
                  <MiniChartCard
                    title="Unit Cost"
                    history={xLabels}
                    lines={[
                      { label: 'fUC', values: history.map((p) => p.fUC), color: '#3b82f6' },
                      { label: 'ctdUC', values: history.map((p) => p.ctdUC), color: '#10b981', dash: '4 2' },
                      { label: 'estUC', values: history.map((p) => p.estUC), color: '#f59e0b' },
                    ]}
                    referenceLine={refUC}
                  />
                  <MiniChartCard
                    title="MH/Unit"
                    history={xLabels}
                    lines={[
                      { label: 'fMPU', values: history.map((p) => p.fMPU), color: '#3b82f6' },
                      { label: 'ctdMPU', values: history.map((p) => p.ctdMPU), color: '#10b981', dash: '4 2' },
                      { label: 'estMPU', values: history.map((p) => p.estMPU), color: '#f59e0b' },
                    ]}
                    referenceLine={refMPU}
                  />
                  <MiniChartCard
                    title="Unit/MH"
                    history={xLabels}
                    lines={[
                      { label: 'fUPM', values: history.map((p) => p.fUPM), color: '#3b82f6' },
                      { label: 'ctdUPM', values: history.map((p) => p.ctdUPM), color: '#10b981', dash: '4 2' },
                      { label: 'estUPM', values: history.map((p) => p.estUPM), color: '#f59e0b' },
                    ]}
                    referenceLine={refUPM}
                  />
                </div>
              </TabsContent>

              {/* ── Cost ─────────────────────────────────────────────── */}
              <TabsContent value="cost" className="pt-3">
                <TrendChart
                  history={xLabels}
                  lines={[
                    { label: 'Forecast', values: history.map((p) => p.forecast), color: '#3b82f6' },
                    { label: 'Actual to Date', values: history.map((p) => p.actualToDate), color: '#10b981', dash: '4 2' },
                    { label: 'Estimate', values: history.map((p) => p.estimate), color: '#f59e0b' },
                  ]}
                  referenceLine={refCost}
                  width={480}
                  height={200}
                />
              </TabsContent>

              {/* ── Unit Cost ─────────────────────────────────────────── */}
              <TabsContent value="uc" className="pt-3">
                <TrendChart
                  history={xLabels}
                  lines={[
                    { label: 'fUC', values: history.map((p) => p.fUC), color: '#3b82f6' },
                    { label: 'ctdUC', values: history.map((p) => p.ctdUC), color: '#10b981', dash: '4 2' },
                    { label: 'estUC', values: history.map((p) => p.estUC), color: '#f59e0b' },
                  ]}
                  referenceLine={refUC}
                  width={480}
                  height={200}
                />
              </TabsContent>

              {/* ── MH/Unit ───────────────────────────────────────────── */}
              <TabsContent value="mhu" className="pt-3">
                <TrendChart
                  history={xLabels}
                  lines={[
                    { label: 'fMPU', values: history.map((p) => p.fMPU), color: '#3b82f6' },
                    { label: 'ctdMPU', values: history.map((p) => p.ctdMPU), color: '#10b981', dash: '4 2' },
                    { label: 'estMPU', values: history.map((p) => p.estMPU), color: '#f59e0b' },
                  ]}
                  referenceLine={refMPU}
                  width={480}
                  height={200}
                />
              </TabsContent>

              {/* ── Unit/MH ───────────────────────────────────────────── */}
              <TabsContent value="umh" className="pt-3">
                <TrendChart
                  history={xLabels}
                  lines={[
                    { label: 'fUPM', values: history.map((p) => p.fUPM), color: '#3b82f6' },
                    { label: 'ctdUPM', values: history.map((p) => p.ctdUPM), color: '#10b981', dash: '4 2' },
                    { label: 'estUPM', values: history.map((p) => p.estUPM), color: '#f59e0b' },
                  ]}
                  referenceLine={refUPM !== undefined && isFinite(refUPM) ? refUPM : undefined}
                  width={480}
                  height={200}
                />
              </TabsContent>
            </Tabs>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 bg-blue-500 rounded" />
                Forecast
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 border-t-2 border-dashed border-emerald-500" />
                Actual to Date
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 bg-amber-500 rounded opacity-70" />
                Estimate
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 border-t border-dashed border-amber-500 opacity-80" />
                Original Est.
              </div>
            </div>

            {/* Stats row */}
            {latest && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
                <span>
                  Forecast:{' '}
                  <strong className="text-foreground">{formatCurrency(latest.forecast)}</strong>
                </span>
                <span>
                  UC:{' '}
                  <strong className="text-foreground">${latest.fUC.toFixed(2)}</strong>
                </span>
                <span>
                  MH/U:{' '}
                  <strong className="text-foreground">{latest.fMPU.toFixed(2)}</strong>
                </span>
                <span>
                  Versions:{' '}
                  <strong className="text-foreground">{history.length}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
