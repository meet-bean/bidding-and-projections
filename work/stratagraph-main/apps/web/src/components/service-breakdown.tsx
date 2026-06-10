import { useMemo } from 'react';
import { useStore } from '~/lib/store';
import type { Service, ServiceSource } from '@repo/projections';
import { sourcesUomVaries } from '@repo/projections';
import { aggregateGroup, groupMetrics, formatMetric } from '~/lib/service-catalog-aggregate';

const GROUPS = ['OE', 'CTD', 'F'] as const;

// Column template mirrors the parent table's trailing columns so the per-project
// unit costs sit directly under Original / Actual / Forecast UC + Δ (the row,
// exploded into its parts). Leading 1fr absorbs the project name; the 48px tail
// lines up with the parent's ⋯ actions column.
const GRID = 'grid items-center gap-x-2 [grid-template-columns:minmax(0,1fr)_116px_116px_116px_96px_48px]';

/**
 * Per-project unit-cost breakdown for a Superior service — the rows that compose
 * the blended UC shown on the table. Rendered inline as the expanded row.
 */
export function ServiceBreakdown({ service }: { service: Service }) {
  const projectionProjects = useStore((s) => s.projectionProjects);
  const catalog = useStore((s) => s.metricsCatalog);

  const ucMetric = useMemo(
    () => Object.fromEntries(GROUPS.map((g) => [g, groupMetrics(catalog, g).find((m) => m.field === 'uc')])),
    [catalog],
  );

  function rawUC(groupId: (typeof GROUPS)[number], sources: ServiceSource[]): number | null {
    const m = ucMetric[groupId];
    if (!m) return null;
    const v = aggregateGroup(catalog, groupId, sources)[m.id];
    return v != null && Number.isFinite(v) && v > 0 ? v : null;
  }
  function fmtUC(groupId: (typeof GROUPS)[number], sources: ServiceSource[]): string {
    const m = ucMetric[groupId];
    const v = rawUC(groupId, sources);
    return m && v != null ? formatMetric(m, v) : '—';
  }

  if (service.sources.length === 0) {
    return (
      <div className="border-l-2 border-border bg-muted/20 px-6 py-3">
        <p className="text-sm italic text-muted-foreground">No source lines for this service.</p>
      </div>
    );
  }

  const uomVaries = sourcesUomVaries(service.sources);

  return (
    <div className="border-l-2 border-border bg-muted/20 px-6 py-3">
      <div className={`${GRID} px-2 pb-1.5 text-[11px] text-muted-foreground`}>
        <span>Per-project breakdown</span>
        <span className="text-right">Original UC</span>
        <span className="text-right">Actual UC</span>
        <span className="text-right">Forecast UC</span>
        <span className="text-right">Δ</span>
        <span />
      </div>
      {service.sources.map((src, i) => {
        const project = projectionProjects.find((p) => p.id === src.projectId);
        const orig = rawUC('OE', [src]);
        const fc = rawUC('F', [src]);
        const pct = orig != null && orig !== 0 && fc != null ? ((fc - orig) / orig) * 100 : null;
        return (
          <div
            key={i}
            className={`${GRID} border-t border-border/60 px-2 py-1.5 text-sm`}
          >
            <span className="flex min-w-0 items-baseline gap-1.5">
              {src.phaseCode && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {src.phaseCode}
                </span>
              )}
              <span className="truncate text-muted-foreground" title={project?.name ?? src.projectId}>
                {project?.name ?? src.projectId}
              </span>
            </span>
            <span className="text-right tabular-nums">{fmtUC('OE', [src])}</span>
            <span className="text-right tabular-nums">{fmtUC('CTD', [src])}</span>
            <span className="text-right tabular-nums">{fmtUC('F', [src])}</span>
            <span className="text-right">{varianceCell(pct)}</span>
            <span />
          </div>
        );
      })}
      {uomVaries && (
        <p className="mt-2 px-2 text-xs text-amber-700">
          Projects use different units of measure, so a blended unit cost isn't shown on the row
          above. Compare the per-project rates here instead.
        </p>
      )}
    </div>
  );
}

function varianceCell(pct: number | null) {
  if (pct == null) return <span className="text-muted-foreground">—</span>;
  const rounded = Math.round(pct);
  if (rounded === 0) return <span className="text-muted-foreground tabular-nums">0%</span>;
  const over = rounded > 0;
  return (
    <span className={`font-medium tabular-nums ${over ? 'text-destructive' : 'text-success'}`}>
      {over ? '+' : ''}
      {rounded}%
    </span>
  );
}
