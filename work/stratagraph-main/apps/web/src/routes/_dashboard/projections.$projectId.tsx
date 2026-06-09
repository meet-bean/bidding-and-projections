import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '~/lib/store';
import {
  updateForecast,
  addComment,
  deleteComment,
  resolveAlert,
  reopenAlert,
  ingestBatch,
  exportProjectionToVistaXLSX,
} from '@repo/projections';
import type { ProjectionAlert, BatchUploadResult } from '@repo/projections';
import { Button, Badge, Sheet, SheetContent, SheetHeader, SheetTitle, PageHeader, PageHeaderTitle, PageHeaderActions } from '@repo/ui';
import { AlertTriangle, Clock, Upload } from 'lucide-react';
import { ProjectionTable } from '~/components/projection-table';
import { ProjectionComments } from '~/components/projection-comments';
import { ProjectionTrendModal } from '~/components/projection-trend-modal';
import { ProjectionAlertsPanel } from '~/components/projection-alerts-panel';
import { ProjectionUpload } from '~/components/projection-upload';
import { ProjectionVersionHistory } from '~/components/projection-version-history';
import { MonthlyEntryForm } from '~/components/monthly-entry-form';
import { computeAlerts } from '@repo/projections';

export const Route = createFileRoute('/_dashboard/projections/$projectId')({
  component: ProjectionDetailPage,
});

function ProjectionDetailPage() {
  const { projectId } = Route.useParams();
  const project = useStore((s) =>
    s.projectionProjects.find((p) => p.id === projectId),
  );
  const updateActiveProjection = useStore((s) => s.updateActiveProjection);
  const setActiveProjection = useStore((s) => s.setActiveProjection);
  const tenantId = useStore((s) => s.tenantId);
  const submitForecast = useStore((s) => s.submitForecast);

  // Panel state
  const [trendLineKey, setTrendLineKey] = useState<string | null>(null);
  const [commentsLineKey, setCommentsLineKey] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Ensure this project is the active one whenever projectId changes
  useEffect(() => {
    if (project) setActiveProjection(projectId);
  }, [projectId, project, setActiveProjection]);

  // Read-only snapshot project for the table, memoized for a stable reference.
  // Declared *before* the early return below so the hook order stays constant
  // regardless of whether `project` is defined — otherwise the hook count
  // changes when `project` flips undefined<->defined (e.g. during a tenant /
  // demo re-seed) and React throws "Rendered more hooks than the previous
  // render". The stable ref also prevents ProjectionTable's infinite
  // re-render loop on non-'all' filters (see projection-table.tsx).
  const tableProject = useMemo(() => {
    if (!project) return null;
    const cv = project.draft ?? project.versions[project.versions.length - 1];
    const ev = viewingVersionId
      ? project.versions.find((v) => v.id === viewingVersionId) ?? cv
      : cv;
    const readOnly = viewingVersionId !== null && viewingVersionId !== cv?.id;
    return readOnly && ev ? { ...project, draft: ev } : project;
  }, [project, viewingVersionId]);

  if (!project) {
    return <div className="p-6 text-muted-foreground">Project not found.</div>;
  }

  const handleUpdateForecast = (
    lineKey: string,
    patch: { qty?: number; hours?: number; cost?: number },
  ) => {
    updateActiveProjection((p) => updateForecast(p, lineKey, patch));
  };

  const handleOpenTrend = (lineKey: string) => {
    setTrendLineKey(lineKey);
  };

  const handleOpenComments = (lineKey: string) => {
    setCommentsLineKey(lineKey);
  };

  const handleAddComment = (lineKey: string, text: string) => {
    updateActiveProjection((p) => addComment(p, lineKey, { author: 'PM', text }));
  };

  const handleDeleteComment = (lineKey: string, commentId: string) => {
    updateActiveProjection((p) => deleteComment(p, lineKey, commentId));
  };

  const handleResolveAlert = (alert: ProjectionAlert, text: string) => {
    updateActiveProjection((p) => resolveAlert(p, alert, { author: 'PM', text }));
  };

  const handleReopenAlert = (alertId: string) => {
    updateActiveProjection((p) => reopenAlert(p, alertId));
  };

  const handleNavigateToItem = (lineKey: string) => {
    setShowAlerts(false);
    setCommentsLineKey(lineKey);
  };

  const handleExport = async () => {
    if (!currentVersion) return;
    const blob = await exportProjectionToVistaXLSX(
      currentVersion.items,
      project.name,
      currentVersion.label,
      project,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.jobNumber}-${currentVersion.label}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchImport = (result: BatchUploadResult) => {
    updateActiveProjection((p) =>
      ingestBatch(
        p,
        result.cycles.map((c) => ({
          label: c.label,
          detectedDate: c.detectedDate,
          items: c.items,
          notes: c.notes,
        })),
        result.financials,
      ),
    );
  };

  const currentVersion =
    project.draft ?? project.versions[project.versions.length - 1];

  const effectiveVersion = viewingVersionId
    ? project.versions.find((v) => v.id === viewingVersionId) ?? currentVersion
    : currentVersion;
  const isReadOnly = viewingVersionId !== null && viewingVersionId !== currentVersion?.id;

  const { open: openAlerts } = computeAlerts(project);

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="space-y-1">
          <PageHeaderTitle>{project.name}</PageHeaderTitle>
          <p className="text-muted-foreground text-sm">
            {project.customer} · {project.versions.length} version
            {project.versions.length !== 1 ? 's' : ''}
            {project.draft ? ' + draft' : ''}
            {currentVersion && ` · ${currentVersion.label}`}
          </p>
        </div>
        <PageHeaderActions>
          {tenantId === 'superior' && currentVersion && (
            <Button
              onClick={() => submitForecast(project.id, currentVersion.id)}
              disabled={currentVersion.saved}
            >
              {currentVersion.saved ? 'Submitted' : 'Submit Forecast'}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            <Upload />
            Upload
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <Clock />
            History
            <Badge variant="secondary" size="sm" className="ml-1.5">
              {project.versions.length}
            </Badge>
          </Button>
          <Button
            variant={openAlerts.length > 0 ? 'destructive' : 'outline'}
            onClick={() => setShowAlerts(true)}
          >
            <AlertTriangle />
            Alerts
            {openAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                {openAlerts.length}
              </Badge>
            )}
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {isReadOnly && (
        <div className="rounded-lg border border-warning bg-warning/10 px-4 py-2 flex items-center justify-between">
          <span className="text-sm">
            Viewing read-only snapshot: {effectiveVersion?.label}
          </span>
          <Button size="sm" variant="outline" onClick={() => setViewingVersionId(null)}>
            Back to Current
          </Button>
        </div>
      )}

      <ProjectionTable
        project={tableProject!}
        onUpdateForecast={handleUpdateForecast}
        onOpenTrend={handleOpenTrend}
        onOpenComments={handleOpenComments}
        onExport={handleExport}
      />

      {tenantId === 'superior' && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Monthly Entry</h2>
          <MonthlyEntryForm projectId={projectId} />
        </section>
      )}

      {/* Comments sheet */}
      <ProjectionComments
        project={project}
        lineKey={commentsLineKey}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onClose={() => setCommentsLineKey(null)}
      />

      {/* Trend modal */}
      <ProjectionTrendModal
        project={project}
        lineKey={trendLineKey}
        onClose={() => setTrendLineKey(null)}
      />

      {/* Alerts sheet */}
      <Sheet open={showAlerts} onOpenChange={setShowAlerts}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Alerts</SheetTitle>
          </SheetHeader>
          <ProjectionAlertsPanel
            project={project}
            onResolve={handleResolveAlert}
            onReopen={handleReopenAlert}
            onNavigateToItem={handleNavigateToItem}
          />
        </SheetContent>
      </Sheet>

      {/* Upload modal */}
      <ProjectionUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onBatchImport={handleBatchImport}
      />

      {/* Version history sheet */}
      <ProjectionVersionHistory
        project={project}
        open={showHistory}
        onOpenChange={setShowHistory}
        viewingVersionId={viewingVersionId}
        onSelectVersion={(id) => {
          setViewingVersionId(id);
          setShowHistory(false);
        }}
        onUploadNext={() => {
          setShowHistory(false);
          setShowUpload(true);
        }}
      />
    </div>
  );
}
