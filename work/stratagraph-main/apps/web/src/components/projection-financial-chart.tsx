'use client';

import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@repo/ui';
import type { ProjectionProject } from '@repo/projections';

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function projectHistory(project: ProjectionProject) {
  return project.versions.map((v) => {
    const totalF = v.items.reduce((s, it) => s + it.F.cost, 0);
    const totalCTD = v.items.reduce((s, it) => s + it.CTD.cost, 0);
    const totalEst = v.items.reduce((s, it) => s + it.Est.cost, 0);
    const totalFQty = v.items.reduce((s, it) => s + it.F.qty, 0);
    const totalFHrs = v.items.reduce((s, it) => s + it.F.hours, 0);
    const totalCTDQty = v.items.reduce((s, it) => s + it.CTD.qty, 0);
    const totalCTDHrs = v.items.reduce((s, it) => s + it.CTD.hours, 0);
    return {
      label: v.label.replace(' Projection', '').replace(' projection', ''),
      fCost: totalF,
      ctdCost: totalCTD,
      estCost: totalEst,
      fUC: totalFQty > 0 ? totalF / totalFQty : 0,
      ctdUC: totalCTDQty > 0 ? totalCTD / totalCTDQty : 0,
      fMPU: totalFQty > 0 ? totalFHrs / totalFQty : 0,
      ctdMPU: totalCTDQty > 0 ? totalCTDHrs / totalCTDQty : 0,
      fUPM: totalFHrs > 0 ? totalFQty / totalFHrs : 0,
      ctdUPM: totalCTDHrs > 0 ? totalCTDQty / totalCTDHrs : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// SVG chart — same pattern as TrendChart in projection-trend-modal.tsx
// ---------------------------------------------------------------------------

interface ChartLine {
  values: (number | null)[];
  color: string;
  dash?: string;
  label: string;
}

interface SvgChartProps {
  history: { label: string }[];
  lines: ChartLine[];
  referenceLine?: number;
  width?: number;
  height?: number;
}

function SvgChart({
  history,
  lines,
  referenceLine,
  width = 480,
  height = 180,
}: SvgChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 64 };
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

  const fmtAxisLabel = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(v >= 10 ? 1 : 2);
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%' }}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Grid lines + y-axis labels */}
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
                {fmtAxisLabel(v)}
              </text>
            </g>
          );
        })}

        {/* Optional reference line (dashed amber) */}
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

        {/* Data point circles */}
        {lines.map((line) =>
          line.values.map((v, i) => {
            if (v === null || !isFinite(v)) return null;
            return (
              <circle
                key={`${line.label}-${i}`}
                cx={xScale(i)}
                cy={yScale(v)}
                r={3}
                fill={line.color}
                fillOpacity={0.85}
              />
            );
          })
        )}

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
            {p.label}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Legend row
// ---------------------------------------------------------------------------

function Legend({ items }: { items: { color: string; dash?: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.dash ? (
            <div
              className="h-0 w-4 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <div
              className="h-0.5 w-4 rounded"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface FinancialChartProps {
  project: ProjectionProject;
}

export function ProjectionFinancialChart({ project }: FinancialChartProps) {
  const data = useMemo(() => projectHistory(project), [project]);
  const xLabels = data.map((d) => ({ label: d.label }));

  if (data.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Need 2+ versions for charts
      </p>
    );
  }

  return (
    <Tabs defaultValue="cost">
      <TabsList variant="line" className="h-8">
        <TabsTrigger value="cost" className="text-xs px-3 py-1 flex-none">
          Cost
        </TabsTrigger>
        <TabsTrigger value="uc" className="text-xs px-3 py-1 flex-none">
          Unit Cost
        </TabsTrigger>
        <TabsTrigger value="mhu" className="text-xs px-3 py-1 flex-none">
          MH/Unit
        </TabsTrigger>
        <TabsTrigger value="umh" className="text-xs px-3 py-1 flex-none">
          Unit/MH
        </TabsTrigger>
      </TabsList>

      {/* Cost */}
      <TabsContent value="cost" className="pt-3 space-y-2">
        <SvgChart
          history={xLabels}
          lines={[
            { label: 'Forecast', values: data.map((d) => d.fCost), color: '#3b82f6' },
            { label: 'CTD', values: data.map((d) => d.ctdCost), color: '#10b981', dash: '4 2' },
            { label: 'Estimate', values: data.map((d) => d.estCost), color: '#f59e0b', dash: '6 3' },
          ]}
          width={480}
          height={180}
        />
        <Legend
          items={[
            { color: '#3b82f6', label: 'Forecast' },
            { color: '#10b981', dash: '4 2', label: 'CTD' },
            { color: '#f59e0b', dash: '6 3', label: 'Estimate' },
          ]}
        />
      </TabsContent>

      {/* Unit Cost */}
      <TabsContent value="uc" className="pt-3 space-y-2">
        <SvgChart
          history={xLabels}
          lines={[
            { label: 'Forecast UC', values: data.map((d) => d.fUC), color: '#3b82f6' },
            { label: 'CTD UC', values: data.map((d) => d.ctdUC), color: '#10b981', dash: '4 2' },
          ]}
          width={480}
          height={180}
        />
        <Legend
          items={[
            { color: '#3b82f6', label: 'Forecast UC' },
            { color: '#10b981', dash: '4 2', label: 'CTD UC' },
          ]}
        />
      </TabsContent>

      {/* MH/Unit */}
      <TabsContent value="mhu" className="pt-3 space-y-2">
        <SvgChart
          history={xLabels}
          lines={[
            { label: 'Forecast MPU', values: data.map((d) => d.fMPU), color: '#3b82f6' },
            { label: 'CTD MPU', values: data.map((d) => d.ctdMPU), color: '#10b981', dash: '4 2' },
          ]}
          width={480}
          height={180}
        />
        <Legend
          items={[
            { color: '#3b82f6', label: 'Forecast MH/Unit' },
            { color: '#10b981', dash: '4 2', label: 'CTD MH/Unit' },
          ]}
        />
      </TabsContent>

      {/* Unit/MH */}
      <TabsContent value="umh" className="pt-3 space-y-2">
        <SvgChart
          history={xLabels}
          lines={[
            { label: 'Forecast UPM', values: data.map((d) => d.fUPM), color: '#3b82f6' },
            { label: 'CTD UPM', values: data.map((d) => d.ctdUPM), color: '#10b981', dash: '4 2' },
          ]}
          width={480}
          height={180}
        />
        <Legend
          items={[
            { color: '#3b82f6', label: 'Forecast Unit/MH' },
            { color: '#10b981', dash: '4 2', label: 'CTD Unit/MH' },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
