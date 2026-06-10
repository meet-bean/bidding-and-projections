import { useMemo } from 'react';
import { useStore } from '~/lib/store';
import type { Service, ServiceSource } from '@repo/projections';
import { sourcesUomVaries } from '@repo/projections';
import { aggregateGroup, groupMetrics, formatMetric } from '~/lib/service-catalog-aggregate';

const GROUPS = ['OE', 'CTD', 'F'] as const;

// fr units replicate the parent table's proportional column scaling exactly, so
// the per-project numbers land directly under Original / Actual / Forecast UC + Δ.
// 650 = the parent's name+type+unit+used-in columns combined; the rest mirror
// the parent's trailing column sizes (116/116/116/96 + 48 actions spacer).
const GRID = 'grid [grid-template-columns:650fr_116fr_116fr_116fr_96fr_48fr]';

/**
 * Per-project unit-cost breakdown for a Superior service, rendered inline as the
 * expanded row — indented child rows of the same table (no nested header, no
 * phase column), so it reads as the parent row exploded into its projects.
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
      <div className="bg-muted/20 py-2 pl-12 pr-4">
        <p className="text-sm italic text-muted-foreground">No source lines for this service.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/20">
      {service.sources.map((src, i) => {
        const project = projectionProjects.find((p) => p.id === src.projectId);
        const orig = rawUC('OE', [src]);
        const fc = rawUC('F', [src]);
        const pct = orig != null && orig !== 0 && fc != null ? ((fc - orig) / orig) * 100 : null;
        return (
          <div key={i} className={`${GRID} border-t border-border/50 text-sm`}>
            <span
              className="min-w-0 truncate py-2 pl-12 pr-4 text-muted-foreground"
              title={project?.name ?? src.projectId}
            >
              {project?.name ?? src.projectId}
            </span>
            <span className="px-4 py-2 text-right tabular-nums">{fmtUC('OE', [src])}</span>
            <span className="px-4 py-2 text-right tabular-nums">{fmtUC('CTD', [src])}</span>
            <span className="px-4 py-2 text-right tabular-nums">{fmtUC('F', [src])}</span>
            <span className="px-4 py-2 text-right">{varianceCell(pct)}</span>
            <span />
          </div>
        );
      })}
      {sourcesUomVaries(service.sources) && (
        <p className="border-t border-border/50 py-2 pl-12 pr-4 text-xs text-amber-700">
          Projects use different units of measure, so a blended unit cost isn't shown on the row
          above. Compare the per-project rates here.
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
