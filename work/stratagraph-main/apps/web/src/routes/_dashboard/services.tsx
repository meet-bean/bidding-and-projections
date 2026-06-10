import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button } from '@repo/ui';
import { Trash2 } from 'lucide-react';
import { useStore } from '~/lib/store';
import { toServiceRows, type ServiceRow } from '~/lib/service-rows';
import { ServicesTable } from '~/components/services-table';
import { ServiceDetailDialog } from '~/components/service-detail-dialog';
import { ServiceReconcileDialog } from '~/components/service-reconcile-dialog';

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

  const headerActions = isSuperior ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const first = projectionProjects[0];
          if (first) setReconcileProjectId(first.id);
        }}
        disabled={projectionProjects.length === 0}
      >
        Import &amp; reconcile
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
        onClick={() => {
          if (
            confirm('Delete all projection data, services, and metrics? This cannot be undone.')
          ) {
            clearProjectionData();
          }
        }}
      >
        <Trash2 className="size-4 mr-1.5" />
        Clear All Data
      </Button>
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <ServicesTable rows={rows} onRowClick={setDetailRow} actions={headerActions} />
      <ServiceDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
      {isSuperior && (
        <ServiceReconcileDialog
          projectId={reconcileProjectId}
          onClose={() => setReconcileProjectId(null)}
        />
      )}
    </div>
  );
}
