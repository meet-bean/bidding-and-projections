import { useMemo } from 'react';
import { Badge } from '@repo/ui';
import { useStore } from '~/lib/store';
import type { Service, ServiceSource } from '@repo/projections';
import { aggregateGroup, groupMetrics, formatMetric } from '~/lib/service-catalog-aggregate';
import { sourcesUomVaries } from '@repo/projections';

const GROUPS = ['OE', 'CTD', 'F'] as const;
const GROUP_LABELS: Record<string, string> = {
  OE: 'Original UC',
  CTD: 'Actual UC',
  F: 'Forecast UC',
};

/**
 * Per-project unit-cost breakdown for a Superior service — the rows that compose
 * the blended UC shown in the table. Rendered inline as the expanded row content.
 */
export function ServiceBreakdown({ service }: { service: Service }) {
  const projectionProjects = useStore((s) => s.projectionProjects);
  const catalog = useStore((s) => s.metricsCatalog);

  const getUC = useMemo(() => {
    return (groupId: string, sources: ServiceSource[]): string => {
      const ucMetric = groupMetrics(catalog, groupId).find((m) => m.field === 'uc');
      if (!ucMetric) return '—';
      const v = aggregateGroup(catalog, groupId, sources)[ucMetric.id];
      if (v == null || !Number.isFinite(v) || v === 0) return '—';
      return formatMetric(ucMetric, v);
    };
  }, [catalog]);

  if (service.sources.length === 0) {
    return (
      <div className="bg-muted/20 px-6 py-4">
        <p className="text-sm text-muted-foreground italic">No source lines for this service.</p>
      </div>
    );
  }

  const uomVaries = sourcesUomVaries(service.sources);

  return (
    <div className="bg-muted/20 px-6 py-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Per-project breakdown ({service.sources.length} project
        {service.sources.length === 1 ? '' : 's'})
      </p>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Phase
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Project
              </th>
              {GROUPS.map((g) => (
                <th
                  key={g}
                  className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-muted-foreground"
                >
                  {GROUP_LABELS[g]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {service.sources.map((src, i) => {
              const project = projectionProjects.find((p) => p.id === src.projectId);
              return (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2">
                    {src.phaseCode ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {src.phaseCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {project?.name ?? src.projectId}
                  </td>
                  {GROUPS.map((g) => (
                    <td key={g} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {getUC(g, [src])}
                    </td>
                  ))}
                </tr>
              );
            })}
            {/* Blended row — the weighted average shown in the table */}
            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td className="px-3 py-2 text-xs text-muted-foreground">All projects</td>
              <td className="px-3 py-2" />
              {GROUPS.map((g) => (
                <td key={g} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {uomVaries ? <span className="text-muted-foreground">—</span> : getUC(g, service.sources)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {uomVaries && (
        <p className="mt-2 text-xs text-amber-700">
          Projects use different units of measure — a blended unit cost isn't shown. Compare the
          per-project rates above instead.
        </p>
      )}
    </div>
  );
}
