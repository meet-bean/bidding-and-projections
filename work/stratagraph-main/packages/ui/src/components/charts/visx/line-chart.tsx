import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { curveLinear, curveMonotoneX, curveNatural, curveStep } from '@visx/curve';
import { ChartContainer } from './chart-container';
import { computeTooltipLeft } from './tooltip-flip';
import { defaultMargin } from './chart-types';
import type { LineChartProps, LinePoint, ChartMargin } from './chart-types';

const curveMap = {
  linear: curveLinear,
  monotone: curveMonotoneX,
  natural: curveNatural,
  step: curveStep,
} as const;

function isDate(val: unknown): val is Date {
  return val instanceof Date;
}

function getX(d: LinePoint): number {
  return isDate(d.x) ? d.x.getTime() : (d.x as number);
}

function formatMonth(val: Date | number): string {
  const d = typeof val === 'number' ? new Date(val) : val;
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export function LineChart({
  series,
  showGrid = true,
  showAxes = true,
  showLegend = true,
  curveType = 'monotone',
  margin: marginOverride,
  className,
}: LineChartProps) {
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    points: { label: string; color: string; y: number }[];
  } | null>(null);

  const [tooltipWidth, setTooltipWidth] = useState(0);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const next = tooltipRef.current.offsetWidth;
      if (next !== tooltipWidth) setTooltipWidth(next);
    }
  }, [tooltipData, tooltipWidth]);

  const margin: ChartMargin = useMemo(
    () => ({ ...defaultMargin, ...marginOverride }),
    [marginOverride]
  );
  const legendHeight = showLegend ? 32 : 0;
  const curve = curveMap[curveType];

  const allPoints = useMemo(() => series.flatMap((s) => s.data), [series]);
  const useTimeDomain = allPoints.length > 0 && isDate(allPoints[0]?.x);

  const xDomain = useMemo(() => {
    if (allPoints.length === 0) return [0, 1] as [number, number];
    const vals = allPoints.map(getX);
    return [Math.min(...vals), Math.max(...vals)] as [number, number];
  }, [allPoints]);

  const yDomain = useMemo(() => {
    if (allPoints.length === 0) return [0, 1] as [number, number];
    const vals = allPoints.map((d) => d.y);
    return [Math.min(0, Math.min(...vals)), Math.max(...vals) * 1.1] as [number, number];
  }, [allPoints]);

  // Store inverse mapping params to avoid passing visx scales through callbacks
  const inverseRef = useRef<{ domainMin: number; domainMax: number; rangeMax: number }>({
    domainMin: 0,
    domainMax: 1,
    rangeMax: 1,
  });

  function findNearestAndUpdate(mouseX: number) {
    // Linear interpolation from pixel to domain value
    const { domainMin, domainMax, rangeMax } = inverseRef.current;
    if (rangeMax === 0) return;
    const ratio = mouseX / rangeMax;
    const xVal = domainMin + ratio * (domainMax - domainMin);

    const points = series.map((s) => {
      let closest = s.data[0];
      let minDist = Infinity;
      for (const d of s.data) {
        const dist = Math.abs(getX(d) - xVal);
        if (dist < minDist) {
          minDist = dist;
          closest = d;
        }
      }
      const closestX = closest ? getX(closest) : 0;
      // Map back to pixel
      const pixelX =
        domainMax === domainMin ? 0 : ((closestX - domainMin) / (domainMax - domainMin)) * rangeMax;
      return { label: s.label, color: s.color, y: closest?.y ?? 0, px: pixelX };
    });

    if (points.length > 0 && points[0]) {
      setTooltipData({ x: points[0].px, points });
    }
  }

  return (
    <div className={className}>
      <ChartContainer height={showLegend ? 332 : 300}>
        {({ width, height: containerHeight }) => {
          const chartHeight = containerHeight - legendHeight;
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = chartHeight - margin.top - margin.bottom;

          if (innerWidth <= 0 || innerHeight <= 0) return null;

          // Update inverse ref for mouse handler
          inverseRef.current = {
            domainMin: xDomain[0],
            domainMax: xDomain[1],
            rangeMax: innerWidth,
          };

          const xScale = (useTimeDomain ? scaleTime : scaleLinear)<number>({
            domain: xDomain,
            range: [0, innerWidth],
          });

          const yScale = scaleLinear<number>({
            domain: yDomain,
            range: [innerHeight, 0],
            nice: true,
          });

          return (
            <div className="relative">
              <svg
                width={width}
                height={chartHeight}
                role="img"
                aria-label={`Line chart with ${series.length} series`}
              >
                <Group left={margin.left} top={margin.top}>
                  {showGrid && (
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      stroke="var(--color-border)"
                      strokeOpacity={0.5}
                      strokeDasharray="4,4"
                    />
                  )}

                  {series.map((s) => (
                    <LinePath
                      key={s.label}
                      data={s.data}
                      x={(d) => xScale(getX(d)) ?? 0}
                      y={(d) => yScale(d.y) ?? 0}
                      stroke={s.color}
                      strokeWidth={2}
                      curve={curve}
                    />
                  ))}

                  {series.map((s) =>
                    s.data.map((d, i) => (
                      <circle
                        key={`${s.label}-${i}`}
                        cx={xScale(getX(d))}
                        cy={yScale(d.y)}
                        r={3}
                        fill="white"
                        stroke={s.color}
                        strokeWidth={2}
                      />
                    ))
                  )}

                  {tooltipData && (
                    <>
                      <line
                        x1={tooltipData.x}
                        x2={tooltipData.x}
                        y1={0}
                        y2={innerHeight}
                        stroke="var(--color-border)"
                        strokeDasharray="4,4"
                        style={{ pointerEvents: 'none' }}
                      />
                      {tooltipData.points.map((p) => (
                        <circle
                          key={p.label}
                          cx={tooltipData.x}
                          cy={yScale(p.y)}
                          r={5}
                          fill={p.color}
                          stroke="white"
                          strokeWidth={2}
                          style={{ pointerEvents: 'none' }}
                        />
                      ))}
                    </>
                  )}

                  <rect
                    width={innerWidth}
                    height={innerHeight}
                    fill="transparent"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = e.clientX - rect.left;
                      findNearestAndUpdate(mouseX);
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                  />

                  {showAxes && (
                    <>
                      <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        numTicks={6}
                        tickFormat={(val) =>
                          useTimeDomain ? formatMonth(val as number) : String(val)
                        }
                        stroke="var(--color-border)"
                        tickStroke="var(--color-border)"
                        tickLabelProps={{
                          fill: 'var(--color-muted-foreground)',
                          fontSize: 11,
                          textAnchor: 'middle',
                        }}
                      />
                      <AxisLeft
                        scale={yScale}
                        numTicks={5}
                        stroke="var(--color-border)"
                        tickStroke="var(--color-border)"
                        tickLabelProps={{
                          fill: 'var(--color-muted-foreground)',
                          fontSize: 11,
                          textAnchor: 'end',
                          dx: -4,
                        }}
                      />
                    </>
                  )}
                </Group>
              </svg>

              {tooltipData && (
                <div
                  ref={tooltipRef}
                  className="bg-popover text-popover-foreground pointer-events-none absolute rounded-md border px-3 py-2 text-xs shadow-md"
                  style={{
                    left:
                      margin.left +
                      computeTooltipLeft({
                        cursorX: tooltipData.x,
                        tooltipWidth,
                        innerWidth: innerWidth,
                        gutter: 12,
                      }),
                    top: margin.top,
                  }}
                >
                  {tooltipData.points.map((p) => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>
                        {p.label}: {p.y}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showLegend && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  {series.map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5 text-sm">
                      <span
                        className="inline-block h-0.5 w-4"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </ChartContainer>
    </div>
  );
}
