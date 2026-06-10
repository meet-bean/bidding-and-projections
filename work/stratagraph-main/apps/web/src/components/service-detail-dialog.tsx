import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge,
  Button,
} from '@repo/ui';
import { useStore } from '~/lib/store';
import type { ServiceRow } from '~/lib/service-rows';
import { COST_TYPE_COLOR, costTypeLabel } from '~/lib/cost-types';
import { aggregateGroup, groupMetrics, formatMetric } from '~/lib/service-catalog-aggregate';

interface ServiceDetailDialogProps {
  row: ServiceRow | null;
  onClose: () => void;
}

export function ServiceDetailDialog({ row, onClose }: ServiceDetailDialogProps) {
  const projectionProjects = useStore((s) => s.projectionProjects);
  const catalog = useStore((s) => s.metricsCatalog);
  const editRegistryItemName = useStore((s) => s.editRegistryItemName);
  const setServiceItemUom = useStore((s) => s.setServiceItemUom);
  const separateRegistryAlias = useStore((s) => s.separateRegistryAlias);
  const removeRegistryItem = useStore((s) => s.removeRegistryItem);

  const [nameValue, setNameValue] = useState(row?.name ?? '');
  const [uomValue, setUomValue] = useState(row?.service.unitOfMeasure ?? '');

  // Sync local state when the selected row changes
  useEffect(() => {
    setNameValue(row?.name ?? '');
    setUomValue(row?.service.unitOfMeasure ?? '');
  }, [row?.id]);

  if (!row) return null;

  const svc = row.service;
  const isSuperior = svc.tenantId === 'superior';

  function commitName() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== row!.name) {
      editRegistryItemName(row!.id, trimmed);
    }
  }

  function commitUom() {
    const trimmed = uomValue.trim();
    if (trimmed && trimmed !== row!.service.unitOfMeasure) {
      setServiceItemUom(row!.id, trimmed);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  function handleUomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  // ── Header badge ────────────────────────────────────────────────────────────
  const headerBadge = isSuperior ? (() => {
    const label = costTypeLabel(svc.costType);
    const bg = COST_TYPE_COLOR[label] ?? '#bba199';
    return (
      <span
        className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
        style={{ background: bg }}
      >
        {label}
      </span>
    );
  })() : (
    <Badge variant="secondary" className="text-[11px]">
      {svc.costType}
    </Badge>
  );

  // ── Superior: per-source UC breakdown ───────────────────────────────────────
  const SuperiorBreakdown = useMemo(() => {
    if (!isSuperior) return null;

    const groups = ['OE', 'CTD', 'F'] as const;
    const groupLabels: Record<string, string> = { OE: 'Original UC', CTD: 'Actual UC', F: 'Forecast UC' };

    function getUC(groupId: string, sources: typeof svc.sources): string {
      const ucMetric = groupMetrics(catalog, groupId).find((m) => m.field === 'uc');
      if (!ucMetric) return '—';
      const vals = aggregateGroup(catalog, groupId, sources);
      const v = vals[ucMetric.id];
      if (v == null || !Number.isFinite(v) || v === 0) return '—';
      return formatMetric(ucMetric, v);
    }

    return (
      <div className="mt-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          OE / CTD / F breakdown ({svc.sources.length} source{svc.sources.length === 1 ? '' : 's'})
        </p>
        {svc.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No source lines.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Phase</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Project</th>
                  {groups.map((g) => (
                    <th key={g} className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {groupLabels[g]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {svc.sources.map((src, i) => {
                  const project = projectionProjects.find((p) => p.id === src.projectId);
                  const projectName = project?.name ?? src.projectId;
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {src.phaseCode ? (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {src.phaseCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{projectName}</td>
                      {groups.map((g) => (
                        <td key={g} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {getUC(g, [src])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {/* Totals row — aggregated across all sources */}
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-3 py-2 text-xs text-muted-foreground">All projects</td>
                  <td className="px-3 py-2"></td>
                  {groups.map((g) => (
                    <td key={g} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {getUC(g, svc.sources)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }, [isSuperior, svc.sources, catalog, projectionProjects]);

  // ── Stratagraph: identity block ──────────────────────────────────────────────
  const StratagraphIdentity = !isSuperior ? (() => {
    const rateDisplay = svc.recommendedRate != null
      ? '$' + svc.recommendedRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;
    return (
      <div className="mt-2 rounded-md border">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="px-3 py-2 text-xs font-medium text-muted-foreground w-36 whitespace-nowrap">Type</td>
              <td className="px-3 py-2">{svc.costType}</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Code</td>
              <td className="px-3 py-2">
                {svc.dailyCode ? (
                  <Badge variant="outline" className="font-mono text-[10px]">{svc.dailyCode}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Unit</td>
              <td className="px-3 py-2">{svc.unitOfMeasure || '—'}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Recommended Rate</td>
              <td className="px-3 py-2 tabular-nums">
                {rateDisplay != null ? (
                  <span className="font-semibold">{rateDisplay}</span>
                ) : (
                  <span className="text-muted-foreground italic text-xs">{svc.rateNote ?? '—'}</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  })() : null;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{row.name}</span>
            {headerBadge}
          </DialogTitle>
        </DialogHeader>

        {/* Editable fields (both tenants) */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Canonical name</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={handleNameKeyDown}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Unit of measure</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={uomValue}
              onChange={(e) => setUomValue(e.target.value)}
              onBlur={commitUom}
              onKeyDown={handleUomKeyDown}
            />
          </div>
        </div>

        {/* Tenant-specific section */}
        {isSuperior ? SuperiorBreakdown : StratagraphIdentity}

        {/* Aliases (both tenants when present) */}
        {svc.aliases.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Aliases ({svc.aliases.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {svc.aliases.map((alias) => (
                <div key={alias.raw} className="flex items-center justify-between gap-2 rounded border px-3 py-1.5">
                  <span className="text-sm">{alias.raw}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => separateRegistryAlias(row.id, alias.raw)}
                  >
                    Separate
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={() => {
              removeRegistryItem(row.id);
              onClose();
            }}
          >
            Remove from catalog
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
