import { useState } from 'react';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { ChartContainer } from './chart-container';
import { paletteColor, chartColors } from './chart-colors';
import type { DonutChartProps, DonutDatum } from './chart-types';

const value = (d: DonutDatum) => d.value;

export function DonutChart({
  data,
  innerRadiusRatio = 0.6,
  showLabels = false,
  showLegend = false,
  colorPalette = chartColors,
  className,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) return <div className={className} />;

  const colorScale = scaleOrdinal({
    domain: data.map((d) => d.label),
    range: data.map((d, i) => d.color ?? paletteColor(i, colorPalette)),
  });

  const legendHeight = showLegend ? 32 : 0;

  return (
    <div className={className}>
      <ChartContainer height={showLegend ? 332 : 300}>
        {({ width, height: containerHeight }) => {
          const chartHeight = containerHeight - legendHeight;
          const radius = Math.min(width, chartHeight) / 2;
          const innerRadius = radius * innerRadiusRatio;
          const centerX = width / 2;
          const centerY = chartHeight / 2;

          return (
            <div>
              <svg
                width={width}
                height={chartHeight}
                role="img"
                aria-label={`Donut chart: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
              >
                <Group top={centerY} left={centerX}>
                  <Pie
                    data={data}
                    pieValue={value}
                    outerRadius={radius - 10}
                    innerRadius={innerRadius}
                    padAngle={0.02}
                    cornerRadius={3}
                  >
                    {(pie) =>
                      pie.arcs.map((arc, i) => {
                        const path = pie.path(arc);
                        const fill = colorScale(arc.data.label);
                        const isHovered = activeIndex === i;

                        // Label positioning
                        const [labelX, labelY] = pie.path.centroid(arc);

                        return (
                          <g
                            key={arc.data.label}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                            style={{ cursor: 'pointer' }}
                          >
                            <path
                              d={path ?? ''}
                              fill={fill}
                              opacity={activeIndex === null || isHovered ? 1 : 0.6}
                              style={{
                                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                transformOrigin: 'center',
                                transition: 'transform 0.15s ease, opacity 0.15s ease',
                              }}
                            />
                            {showLabels && arc.endAngle - arc.startAngle > 0.3 && (
                              <text
                                x={labelX}
                                y={labelY}
                                fill="white"
                                fontSize={12}
                                fontWeight={600}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ pointerEvents: 'none' }}
                              >
                                {arc.data.label}: {arc.data.value}
                              </text>
                            )}
                          </g>
                        );
                      })
                    }
                  </Pie>
                </Group>
              </svg>
              {showLegend && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  {data.map((d) => (
                    <div key={d.label} className="flex items-center gap-1.5 text-sm">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorScale(d.label) }}
                      />
                      <span className="text-muted-foreground">
                        {d.label}: {d.value}
                      </span>
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
