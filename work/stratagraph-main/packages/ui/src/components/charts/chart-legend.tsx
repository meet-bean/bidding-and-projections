/**
 * ChartLegend - Atomic legend list extending the shadcn legend pattern.
 *
 * Renders one row per item with a color pip, label, optional count, and
 * optional percentage revealed on hover. Per-item descriptions are shown
 * via tooltip (hydration-guarded to avoid SSR mismatches).
 *
 * Lives at a deep import path (`@repo/ui/components/charts/chart-legend`)
 * to keep the package root barrel from colliding with shadcn chart's own
 * internal `ChartLegend` (a recharts `<Legend>` wrapper used only inside
 * the atomic chart components).
 *
 * @example
 * ```tsx
 * import { ChartLegend } from '@repo/ui/components/charts/chart-legend';
 *
 * <ChartLegend
 *   config={{
 *     pending: { label: 'Pending', color: 'var(--chart-1)' },
 *     overdue: { label: 'Overdue', color: 'var(--destructive)' },
 *   }}
 *   items={[
 *     { key: 'pending', count: 30 },
 *     { key: 'overdue', count: 70 },
 *   ]}
 *   showPercentage
 * />
 * ```
 */

import { useMemo, type Ref } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHydrated } from '@/hooks/use-hydrated';
import { cn } from '@/lib/utils';

export interface ChartLegendItem {
  /** Key matching a `ChartConfig` entry. Drives the pip color via `var(--color-<key>)` and the label. */
  key: string;
  /** Optional numeric count rendered alongside the label. */
  count?: number;
}

export interface ChartLegendProps {
  /** ChartConfig describing the labels/colors for each item key. */
  config: ChartConfig;
  /** Items to render, in order. Items whose `key` is missing from `config` are skipped. */
  items: ChartLegendItem[];
  /** Layout direction. Defaults to `'horizontal'`. */
  direction?: 'horizontal' | 'vertical';
  /** Reveal `count / total` as a percentage on row hover. */
  showPercentage?: boolean;
  /** Optional per-item description shown in a tooltip. Returning `undefined` skips the tooltip for that item. */
  itemDescription?: (key: string) => string | undefined;
  /** Additional class names merged onto the root element. */
  className?: string;
  /** Optional ref forwarded to the root element. */
  ref?: Ref<HTMLUListElement>;
}

export function ChartLegend({
  config,
  items,
  direction = 'horizontal',
  showPercentage,
  itemDescription,
  className,
  ref,
}: ChartLegendProps) {
  const isHydrated = useHydrated();
  // Filter to items that will actually render so the percentage denominator
  // matches the rows on screen — otherwise an unknown key inflates `total`
  // and visible rows show percentages against a hidden total.
  const visibleItems = useMemo(() => items.filter((it) => config[it.key]), [items, config]);
  const total = useMemo(
    () => visibleItems.reduce((s, it) => s + (it.count ?? 0), 0),
    [visibleItems]
  );

  const rows = visibleItems.map((it) => {
    const cfg = config[it.key];
    if (!cfg) return null;
    const desc = itemDescription?.(it.key);
    const pct =
      showPercentage && total > 0 && it.count != null ? Math.round((it.count / total) * 100) : null;

    const row = (
      <li key={it.key} className="group flex items-center gap-2 text-sm" data-slot="legend-row">
        <span
          aria-hidden
          data-slot="legend-pip"
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: `var(--color-${it.key})` }}
        />
        <span className="text-foreground">{cfg.label}</span>
        {it.count != null && <span className="text-muted-foreground tabular-nums">{it.count}</span>}
        {pct != null && (
          <span className="text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
            {pct}%
          </span>
        )}
      </li>
    );

    // Wrap unconditionally when a description exists so the fiber tree is
    // stable across hydration; only the popup content toggles in once hydrated.
    return desc ? (
      <Tooltip key={it.key}>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        {isHydrated ? <TooltipContent>{desc}</TooltipContent> : null}
      </Tooltip>
    ) : (
      row
    );
  });

  return (
    <TooltipProvider>
      <ul
        ref={ref}
        className={cn(
          'flex gap-3',
          direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
          className
        )}
        data-slot="chart-legend"
      >
        {rows}
      </ul>
    </TooltipProvider>
  );
}
