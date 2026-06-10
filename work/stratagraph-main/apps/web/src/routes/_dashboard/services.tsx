import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useStore } from '~/lib/store';
import { toServiceRows, type ServiceRow } from '~/lib/service-rows';
import { ServicesTable } from '~/components/services-table';
import { ServiceDetailDrawer } from '~/components/service-detail-drawer';
import { ServiceReconcileDialog } from '~/components/service-reconcile-dialog';
import { COST_TYPE_COLOR, type CostType } from '~/lib/cost-types';

export const Route = createFileRoute('/_dashboard/services')({
  component: ServicesPage,
});

/** One Services screen for both tenants — same model, same columns. */
function ServicesPage() {
  const services = useStore((s) => s.services);
  const catalog = useStore((s) => s.metricsCatalog);
  const tenantId = useStore((s) => s.tenantId);
  const projectionProjects = useStore((s) => s.projectionProjects);
  const clearProjectionData = useStore((s) => s.clearProjectionData);
  const isSuperior = tenantId === 'superior';

  const rows = useMemo(() => toServiceRows(services, catalog), [services, catalog]);
  const [detailRow, setDetailRow] = useState<ServiceRow | null>(null);
  const [reconcileProjectId, setReconcileProjectId] = useState<string | null>(null);

  // Cost-type breakdown for the summary band (descending by count).
  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const headerActions = isSuperior ? (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={projectionProjects.length === 0}>
            Import &amp; reconcile
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {projectionProjects.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => setReconcileProjectId(p.id)}>
              {p.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="px-2" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (
                confirm('Delete all projection data, services, and metrics? This cannot be undone.')
              ) {
                clearProjectionData();
              }
            }}
          >
            <Trash2 className="size-4 mr-2" />
            Clear all data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary band — total + cost-type breakdown (matches projections totals bar) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-4 py-2 text-sm">
        <span className="font-medium tabular-nums">
          {rows.length} service{rows.length === 1 ? '' : 's'}
        </span>
        {typeBreakdown.map(([type, count]) => {
          const color = COST_TYPE_COLOR[type as CostType];
          return (
            <span key={type} className="flex items-center gap-1.5 text-muted-foreground">
              {color && (
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: color }}
                />
              )}
              <span className="tabular-nums text-foreground">{count}</span> {type}
            </span>
          );
        })}
      </div>

      <ServicesTable
        rows={rows}
        onRowClick={setDetailRow}
        onManage={setDetailRow}
        isSuperior={isSuperior}
        actions={headerActions}
      />
      <ServiceDetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />
      {isSuperior && (
        <ServiceReconcileDialog
          projectId={reconcileProjectId}
          onClose={() => setReconcileProjectId(null)}
        />
      )}
    </div>
  );
}
