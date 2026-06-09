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
import type { ServiceCatalogRow } from '~/lib/service-catalog-rows';
import { COST_TYPE_COLOR } from '~/lib/cost-types';
import { ctdMetrics, resolveCtd, aggregateCtd, formatMetric } from '~/lib/service-catalog-aggregate';

interface ServiceDetailDialogProps {
  row: ServiceCatalogRow | null;
  onClose: () => void;
}

export function ServiceDetailDialog({ row, onClose }: ServiceDetailDialogProps) {
  const projectionProjects = useStore((s) => s.projectionProjects);
  const catalog = useStore((s) => s.metricsCatalog);
  const editRegistryItemName = useStore((s) => s.editRegistryItemName);
  const setServiceItemUom = useStore((s) => s.setServiceItemUom);
  const separateRegistryAlias = useStore((s) => s.separateRegistryAlias);
  const removeRegistryItem = useStore((s) => s.removeRegistryItem);

  const ctdCols = useMemo(() => ctdMetrics(catalog), [catalog]);

  const [nameValue, setNameValue] = useState(row?.name ?? '');
  const [uomValue, setUomValue] = useState(row?.uom ?? '');

  // Sync local state when the selected row changes
  useEffect(() => {
    setNameValue(row?.name ?? '');
    setUomValue(row?.uom ?? '');
  }, [row?.id]);

  if (!row) return null;

  function commitName() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== row!.name) {
      editRegistryItemName(row!.id, trimmed);
    }
  }

  function commitUom() {
    const trimmed = uomValue.trim();
    if (trimmed && trimmed !== row!.uom) {
      setServiceItemUom(row!.id, trimmed);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  function handleUomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  const badgeColor = COST_TYPE_COLOR[row.costType] ?? '#bba199';

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
            <span
              className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ background: badgeColor }}
            >
              {row.costType}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Editable fields */}
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

        {/* CTD breakdown table */}
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            CTD breakdown ({row.item.sources.length} source{row.item.sources.length === 1 ? '' : 's'})
          </p>
          {row.item.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No source lines.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Phase</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Project</th>
                    {ctdCols.map((m) => (
                      <th key={m.id} className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {row.item.sources.map((src, i) => {
                    const project = projectionProjects.find((p) => p.id === src.projectId);
                    const projectName = project?.name ?? src.projectId;
                    const vals = resolveCtd(catalog, { qty: src.ctd.qty, hours: src.ctd.hours, cost: src.ctd.cost });
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
                        {ctdCols.map((m) => (
                          <td key={m.id} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {formatMetric(m, vals[m.id] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  {(() => {
                    const totals = aggregateCtd(catalog, row.item.sources);
                    return (
                      <tr className="border-t-2 bg-muted/30 font-semibold">
                        <td className="px-3 py-2 text-xs text-muted-foreground">All projects</td>
                        <td className="px-3 py-2"></td>
                        {ctdCols.map((m) => (
                          <td key={m.id} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {formatMetric(m, totals[m.id] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Aliases */}
        {row.item.aliases.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Aliases ({row.item.aliases.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {row.item.aliases.map((alias) => (
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
