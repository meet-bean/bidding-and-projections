import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@repo/ui';
import { formatCurrency } from '@repo/projections';
import type { FinancialSummaryMonth } from '@repo/projections';
import { COST_TYPES } from '~/lib/pnl';
import type {
  BidVsActualByType,
  CostCompositionPoint,
  CostType,
  PnlProject,
  WaterfallStep,
} from '~/lib/pnl';

// ── Brand palette (Stratagraph swatches, see styles/app.css) ────────────────
const C = {
  green: '#69aa82', // revenue / profit / beating bid
  coral: '#dc5858', // cost / overrun / below bid
  steel: '#8fa1b2', // bid / estimate reference
  grid: 'currentColor',
} as const;

const COST_TYPE_COLOR: Record<CostType, string> = {
  Labor: '#536ed7', // indigo
  Material: '#53a9c4', // cyan
  Equipment: '#e7c341', // gold
  Subcontract: '#dc8c46', // orange
  Other: '#bba199', // mauve
};

// ── Formatters ──────────────────────────────────────────────────────────────
function formatCompact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

const formatPct = (v: number) => `${v.toFixed(0)}%`;

// ── Shared chrome ─────────────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-muted-foreground/80">{subtitle}</div>
          ) : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: number;
  color?: string;
  dataKey?: string | number;
}

function TooltipBox({
  label,
  rows,
}: {
  label?: React.ReactNode;
  rows: { key: string; swatch?: string; label: string; value: string }[];
}) {
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      {label != null ? <div className="mb-1 font-medium text-foreground">{label}</div> : null}
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.swatch ? (
                <span className="inline-block size-2 rounded-sm" style={{ background: r.swatch }} />
              ) : null}
              {r.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const axisTick = { fontSize: 11, fill: 'currentColor', opacity: 0.55 } as const;

// ════════════════════════════════════════════════════════════════════════════
// 1. Revenue vs Cost trend (recharts re-skin of the original SVG line chart)
// ════════════════════════════════════════════════════════════════════════════
export function RevenueCostChart({ months }: { months: FinancialSummaryMonth[] }) {
  if (months.length < 2) {
    return (
      <ChartCard title="Revenue vs Cost">
        <EmptyState message="Need at least 2 months for a trend chart." />
      </ChartCard>
    );
  }
  const data = months.map((m) => ({
    month: new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }),
    revenue: m.revenue,
    cost: m.cost,
  }));

  return (
    <ChartCard title="Revenue vs Cost" subtitle="Monthly totals across the portfolio">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={C.grid} strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: C.grid, strokeOpacity: 0.2 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={label}
                  rows={(payload as unknown as TooltipEntry[]).map((p) => ({
                    key: String(p.dataKey),
                    swatch: p.color,
                    label: p.dataKey === 'revenue' ? 'Revenue' : 'Cost',
                    value: formatCurrency(p.value ?? 0),
                  }))}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={C.green}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke={C.coral}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <Legend2 items={[{ color: C.green, label: 'Revenue' }, { color: C.coral, label: 'Cost', dashed: true }]} />
    </ChartCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Margin % trend with bid reference line
// ════════════════════════════════════════════════════════════════════════════
export function MarginTrendChart({
  months,
  bidGpPct,
}: {
  months: FinancialSummaryMonth[];
  bidGpPct?: number | null;
}) {
  if (months.length < 2) {
    return (
      <ChartCard title="Gross Margin Trend">
        <EmptyState message="Need at least 2 months for a margin trend." />
      </ChartCard>
    );
  }
  const data = months.map((m) => ({
    month: new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }),
    gpPct: Number(m.gpPct.toFixed(2)),
  }));

  return (
    <ChartCard
      title="Gross Margin Trend"
      subtitle={
        bidGpPct != null
          ? 'GP% by month — dashed line is the original bid target'
          : 'GP% by month'
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={C.grid} strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={formatPct}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: C.grid, strokeOpacity: 0.2 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={label}
                  rows={[
                    {
                      key: 'gp',
                      swatch: C.green,
                      label: 'GP%',
                      value: `${(payload[0] as TooltipEntry).value?.toFixed(1)}%`,
                    },
                    ...(bidGpPct != null
                      ? [{ key: 'bid', swatch: C.steel, label: 'Bid GP%', value: `${bidGpPct.toFixed(1)}%` }]
                      : []),
                  ]}
                />
              ) : null
            }
          />
          {bidGpPct != null ? (
            <ReferenceLine
              y={bidGpPct}
              stroke={C.steel}
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: 'Bid', position: 'right', fill: C.steel, fontSize: 10 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="gpPct"
            stroke={C.green}
            strokeWidth={2.5}
            dot={{ r: 3, fill: C.green }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Bid vs Actual GP% by project (horizontal grouped bars, sorted by variance)
// ════════════════════════════════════════════════════════════════════════════
export function BidVsActualGpChart({ projects }: { projects: PnlProject[] }) {
  const data = projects
    .filter((p) => p.originalBid)
    .map((p) => ({
      name: p.name,
      actual: Number(p.totals.gpPct.toFixed(2)),
      bid: Number(p.originalBid!.gpPct.toFixed(2)),
      variance: p.totals.gpPct - p.originalBid!.gpPct,
    }))
    .sort((a, b) => a.variance - b.variance); // worst (most below bid) first

  if (data.length === 0) {
    return (
      <ChartCard title="Bid vs Actual GP% by Project">
        <EmptyState message="No bid data to compare against." />
      </ChartCard>
    );
  }

  const height = Math.max(120, data.length * 46 + 24);

  return (
    <ChartCard
      title="Bid vs Actual GP% by Project"
      subtitle="Sorted worst-first — green beats the bid, coral falls short"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 40, bottom: 0, left: 8 }}
          barGap={2}
        >
          <CartesianGrid stroke={C.grid} strokeOpacity={0.08} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatPct}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            cursor={{ fill: C.grid, fillOpacity: 0.05 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={label}
                  rows={[
                    {
                      key: 'actual',
                      swatch: C.green,
                      label: 'Actual GP%',
                      value: `${(payload.find((p) => (p as TooltipEntry).dataKey === 'actual') as TooltipEntry)?.value?.toFixed(1)}%`,
                    },
                    {
                      key: 'bid',
                      swatch: C.steel,
                      label: 'Bid GP%',
                      value: `${(payload.find((p) => (p as TooltipEntry).dataKey === 'bid') as TooltipEntry)?.value?.toFixed(1)}%`,
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="bid" fill={C.steel} radius={[0, 3, 3, 0]} barSize={12} name="Bid">
            {data.map((d) => (
              <Cell key={`bid-${d.name}`} fill={C.steel} />
            ))}
          </Bar>
          <Bar dataKey="actual" radius={[0, 3, 3, 0]} barSize={12} name="Actual">
            {data.map((d) => (
              <Cell key={`act-${d.name}`} fill={d.variance >= 0 ? C.green : C.coral} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Legend2
        items={[
          { color: C.green, label: 'Actual (≥ bid)' },
          { color: C.coral, label: 'Actual (< bid)' },
          { color: C.steel, label: 'Bid target' },
        ]}
      />
    </ChartCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Cost composition over time (stacked area)
// ════════════════════════════════════════════════════════════════════════════
export function CostCompositionChart({
  data,
  title = 'Cost Composition Over Time',
  subtitle = 'Cumulative cost-to-date by type at each projection',
}: {
  data: CostCompositionPoint[];
  title?: string;
  subtitle?: string;
}) {
  if (data.length < 2) {
    return (
      <ChartCard title={title}>
        <EmptyState message="Need at least 2 projections for a composition trend." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={C.grid} strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: C.grid, strokeOpacity: 0.2 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={label}
                  rows={(payload as unknown as TooltipEntry[])
                    .slice()
                    .reverse()
                    .filter((p) => (p.value ?? 0) > 0)
                    .map((p) => ({
                      key: String(p.dataKey),
                      swatch: p.color,
                      label: String(p.dataKey),
                      value: formatCurrency(p.value ?? 0),
                    }))}
                />
              ) : null
            }
          />
          {COST_TYPES.map((t) => (
            <Area
              key={t}
              type="monotone"
              dataKey={t}
              stackId="1"
              stroke={COST_TYPE_COLOR[t]}
              fill={COST_TYPE_COLOR[t]}
              fillOpacity={0.85}
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <Legend2 items={COST_TYPES.map((t) => ({ color: COST_TYPE_COLOR[t], label: t }))} />
    </ChartCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 5. Profit waterfall (revenue → cost types → profit)
// ════════════════════════════════════════════════════════════════════════════
export function ProfitWaterfallChart({ steps }: { steps: WaterfallStep[] }) {
  if (steps.length === 0) {
    return (
      <ChartCard title="Profit Waterfall">
        <EmptyState message="No cost-type data available." />
      </ChartCard>
    );
  }

  const stepColor = (s: WaterfallStep) =>
    s.kind === 'cost' ? C.coral : s.amount >= 0 ? C.green : C.coral;

  return (
    <ChartCard title="Profit Waterfall" subtitle="Revenue, less each cost type, down to profit">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={steps} margin={{ top: 20, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={C.grid} strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: C.grid, fillOpacity: 0.05 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={label}
                  rows={[
                    {
                      key: 'amt',
                      label: 'Amount',
                      value: formatCurrency((payload[0]?.payload as WaterfallStep)?.amount ?? 0),
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="span" stackId="w" radius={[3, 3, 0, 0]}>
            {steps.map((s) => (
              <Cell key={s.name} fill={stepColor(s)} />
            ))}
            <LabelList
              dataKey="amount"
              position="top"
              formatter={(v) => formatCompact(Number(v))}
              style={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 6. Bid vs Actual by cost type (grouped bars)
// ════════════════════════════════════════════════════════════════════════════
export function BidVsActualByTypeChart({ data }: { data: BidVsActualByType[] }) {
  if (data.length === 0) {
    return (
      <ChartCard title="Bid vs Actual by Cost Type">
        <EmptyState message="No bid estimate to compare against." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Bid vs Actual by Cost Type"
      subtitle="Original estimate vs current forecast — where the job moved"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={4}>
          <CartesianGrid stroke={C.grid} strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="type" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: C.grid, fillOpacity: 0.05 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={label}
                  rows={(payload as unknown as TooltipEntry[]).map((p) => ({
                    key: String(p.dataKey),
                    swatch: p.color,
                    label: p.dataKey === 'bid' ? 'Bid' : 'Forecast',
                    value: formatCurrency(p.value ?? 0),
                  }))}
                />
              ) : null
            }
          />
          <Bar dataKey="bid" fill={C.steel} radius={[3, 3, 0, 0]} name="Bid" />
          <Bar dataKey="actual" radius={[3, 3, 0, 0]} name="Forecast">
            {data.map((d) => (
              <Cell key={d.type} fill={d.actual > d.bid ? C.coral : C.green} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Legend2
        items={[
          { color: C.steel, label: 'Bid estimate' },
          { color: C.green, label: 'Forecast (≤ bid)' },
          { color: C.coral, label: 'Forecast (over bid)' },
        ]}
      />
    </ChartCard>
  );
}

// ── Tiny legend (matches the original SVG chart's legend styling) ─────────────
function Legend2({
  items,
}: {
  items: { color: string; label: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-3.5 rounded-sm"
            style={{
              background: it.dashed
                ? `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)`
                : it.color,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
