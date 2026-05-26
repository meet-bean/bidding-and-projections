import { useMemo } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ChartContainer } from './chart-container';
import { paletteColor, chartColors } from './chart-colors';
import { defaultMargin } from './chart-types';
import type { BarChartProps, BarDatum, ChartMargin } from './chart-types';

export function BarChart({
  data,
  orientation = 'vertical',
  variant = 'simple',
  showAxes = true,
  showValues = false,
  colorPalette = chartColors,
  barPadding = 0.3,
  margin: marginOverride,
  className,
}: BarChartProps) {
  const isHorizontal = orientation === 'horizontal';

  const margin: ChartMargin = useMemo(
    () => ({
      ...defaultMargin,
      left: isHorizontal ? 120 : defaultMargin.left,
      ...marginOverride,
    }),
    [isHorizontal, marginOverride]
  );

  // Get all unique keys across data
  const keys = useMemo(() => {
    const keySet = new Set<string>();
    for (const datum of data) {
      for (const v of datum.values) {
        keySet.add(v.key);
      }
    }
    return Array.from(keySet);
  }, [data]);

  const colorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: keys,
        range: keys.map((_, i) => paletteColor(i, colorPalette)),
      }),
    [keys, colorPalette]
  );

  const showMultiKeyLegend = keys.length > 1;
  const legendHeight = showMultiKeyLegend ? 32 : 0;

  if (data.length === 0) return <div className={className} />;

  return (
    <div className={className}>
      <ChartContainer height={showMultiKeyLegend ? 332 : 300}>
        {({ width, height: containerHeight }) => {
          const chartHeight = containerHeight - legendHeight;
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = chartHeight - margin.top - margin.bottom;

          if (innerWidth <= 0 || innerHeight <= 0) return null;

          const categoryScale = scaleBand<string>({
            domain: data.map((d) => d.label),
            range: isHorizontal ? [0, innerHeight] : [0, innerWidth],
            padding: barPadding,
          });

          const maxVal = getMaxValue(data, variant);
          const valueScale = scaleLinear<number>({
            domain: [0, maxVal * 1.1],
            range: isHorizontal ? [0, innerWidth] : [innerHeight, 0],
            nice: true,
          });

          return (
            <div>
              <svg
                width={width}
                height={chartHeight}
                role="img"
                aria-label={`Bar chart with ${data.length} ${data.length === 1 ? 'category' : 'categories'}`}
              >
                <Group left={margin.left} top={margin.top}>
                  {data.map((datum) => {
                    const bandPos = categoryScale(datum.label) ?? 0;
                    const bandwidth = categoryScale.bandwidth();

                    if (variant === 'stacked') {
                      return renderStacked(
                        datum,
                        bandPos,
                        bandwidth,
                        valueScale,
                        colorScale,
                        isHorizontal
                      );
                    }

                    if (variant === 'grouped' && datum.values.length > 1) {
                      return renderGrouped(
                        datum,
                        bandPos,
                        bandwidth,
                        valueScale,
                        colorScale,
                        isHorizontal,
                        innerHeight
                      );
                    }

                    // Simple: single bar
                    const val = datum.values[0]?.value ?? 0;
                    const fill = datum.values[0]?.color ?? colorScale(datum.values[0]?.key ?? '');

                    if (isHorizontal) {
                      const barWidth = valueScale(val) ?? 0;
                      return (
                        <g key={datum.label}>
                          <Bar
                            x={0}
                            y={bandPos}
                            width={barWidth}
                            height={bandwidth}
                            fill={fill}
                            rx={3}
                          />
                          {showValues && (
                            <text
                              x={barWidth + 4}
                              y={bandPos + bandwidth / 2}
                              fill="var(--color-foreground)"
                              fontSize={11}
                              dominantBaseline="middle"
                            >
                              {val}
                            </text>
                          )}
                        </g>
                      );
                    }

                    const barHeight = innerHeight - (valueScale(val) ?? 0);
                    const barY = valueScale(val) ?? 0;
                    return (
                      <g key={datum.label}>
                        <Bar
                          x={bandPos}
                          y={barY}
                          width={bandwidth}
                          height={barHeight}
                          fill={fill}
                          rx={3}
                        />
                        {showValues && (
                          <text
                            x={bandPos + bandwidth / 2}
                            y={barY - 4}
                            fill="var(--color-foreground)"
                            fontSize={11}
                            textAnchor="middle"
                          >
                            {val}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {showAxes && isHorizontal && (
                    <>
                      <AxisBottom
                        top={innerHeight}
                        scale={valueScale}
                        numTicks={5}
                        stroke="var(--color-border)"
                        tickStroke="var(--color-border)"
                        tickLabelProps={{
                          fill: 'var(--color-muted-foreground)',
                          fontSize: 11,
                          textAnchor: 'middle',
                        }}
                      />
                      <AxisLeft
                        scale={categoryScale}
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

                  {showAxes && !isHorizontal && (
                    <>
                      <AxisBottom
                        top={innerHeight}
                        scale={categoryScale}
                        stroke="var(--color-border)"
                        tickStroke="var(--color-border)"
                        tickLabelProps={{
                          fill: 'var(--color-muted-foreground)',
                          fontSize: 11,
                          textAnchor: 'middle',
                        }}
                      />
                      <AxisLeft
                        scale={valueScale}
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

              {showMultiKeyLegend && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  {keys.map((key) => (
                    <div key={key} className="flex items-center gap-1.5 text-sm">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: colorScale(key) }}
                      />
                      <span className="text-muted-foreground">{key}</span>
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

function getMaxValue(data: BarDatum[], variant: string): number {
  let max = 0;
  for (const datum of data) {
    if (variant === 'stacked') {
      const sum = datum.values.reduce((acc, v) => acc + v.value, 0);
      if (sum > max) max = sum;
    } else {
      for (const v of datum.values) {
        if (v.value > max) max = v.value;
      }
    }
  }
  return max || 1;
}

function renderStacked(
  datum: BarDatum,
  bandPos: number,
  bandwidth: number,
  valueScale: ReturnType<typeof scaleLinear<number>>,
  colorScale: ReturnType<typeof scaleOrdinal<string, string>>,
  isHorizontal: boolean
) {
  let cumulative = 0;

  return (
    <g key={datum.label}>
      {datum.values.map((v) => {
        const start = cumulative;
        cumulative += v.value;
        const fill = v.color ?? colorScale(v.key);

        if (isHorizontal) {
          const x0 = valueScale(start) ?? 0;
          const x1 = valueScale(cumulative) ?? 0;
          return (
            <Bar key={v.key} x={x0} y={bandPos} width={x1 - x0} height={bandwidth} fill={fill} />
          );
        }

        const y0 = valueScale(cumulative) ?? 0;
        const y1 = valueScale(start) ?? 0;
        return (
          <Bar key={v.key} x={bandPos} y={y0} width={bandwidth} height={y1 - y0} fill={fill} />
        );
      })}
    </g>
  );
}

function renderGrouped(
  datum: BarDatum,
  bandPos: number,
  bandwidth: number,
  valueScale: ReturnType<typeof scaleLinear<number>>,
  colorScale: ReturnType<typeof scaleOrdinal<string, string>>,
  isHorizontal: boolean,
  innerHeight: number
) {
  const n = datum.values.length;
  const groupPadding = 2;
  const barSize = (bandwidth - groupPadding * (n - 1)) / n;

  return (
    <g key={datum.label}>
      {datum.values.map((v, i) => {
        const fill = v.color ?? colorScale(v.key);
        const offset = i * (barSize + groupPadding);

        if (isHorizontal) {
          const barWidth = valueScale(v.value) ?? 0;
          return (
            <Bar
              key={v.key}
              x={0}
              y={bandPos + offset}
              width={barWidth}
              height={barSize}
              fill={fill}
              rx={2}
            />
          );
        }

        const barHeight = innerHeight - (valueScale(v.value) ?? 0);
        const barY = valueScale(v.value) ?? 0;
        return (
          <Bar
            key={v.key}
            x={bandPos + offset}
            y={barY}
            width={barSize}
            height={barHeight}
            fill={fill}
            rx={2}
          />
        );
      })}
    </g>
  );
}
