import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@repo/ui';
import { useStore } from '~/lib/store';
import { classifyImport } from '@repo/projections';
import type { ImportLine, ClassifiedLine } from '@repo/projections';
import { COST_TYPE_COLOR, costTypeLabel } from '~/lib/cost-types';

interface ServiceReconcileDialogProps {
  projectId: string | null;
  onClose: () => void;
}

type Decision =
  | { line: ImportLine; action: 'match'; targetId: string }
  | { line: ImportLine; action: 'new' };

export function ServiceReconcileDialog({ projectId, onClose }: ServiceReconcileDialogProps) {
  const projectionProjects = useStore((s) => s.projectionProjects);
  const serviceRegistry = useStore((s) => s.serviceRegistry);
  const applyReconciliation = useStore((s) => s.applyReconciliation);

  const project = projectId ? projectionProjects.find((p) => p.id === projectId) : null;

  const lines = useMemo<ImportLine[]>(() => {
    if (!project || project.versions.length === 0) return [];
    const latest = project.versions[project.versions.length - 1]!;
    return latest.items.map((item) => ({
      name: item.label,
      unitOfMeasure: item.unitOfMeasure,
      costType: item.keyParts[1] ?? '',
      lineKey: item.lineKey,
      phaseCode: item.keyParts[0] ?? '',
      qty: item.CTD.qty,
      hours: item.CTD.hours,
      cost: item.CTD.cost,
      date: latest.createdAt,
      projectId: project.id,
    }));
  }, [project]);

  const classified = useMemo<ClassifiedLine[]>(() => {
    if (lines.length === 0) return [];
    return classifyImport(serviceRegistry, lines);
  }, [serviceRegistry, lines]);

  // Build default decisions
  const defaultDecisions = useMemo<Record<string, Decision>>(() => {
    const map: Record<string, Decision> = {};
    for (const c of classified) {
      if ((c.bucket === 'auto' || c.bucket === 'review') && c.suggestion) {
        map[c.line.lineKey] = { line: c.line, action: 'match', targetId: c.suggestion.id };
      } else {
        map[c.line.lineKey] = { line: c.line, action: 'new' };
      }
    }
    return map;
  }, [classified]);

  const [overrides, setOverrides] = useState<Record<string, Decision>>({});
  const decisions = useMemo(() => ({ ...defaultDecisions, ...overrides }), [defaultDecisions, overrides]);

  const auto = classified.filter((c) => c.bucket === 'auto');
  const review = classified.filter((c) => c.bucket === 'review');
  const newLines = classified.filter((c) => c.bucket === 'new');

  const [autoExpanded, setAutoExpanded] = useState(false);

  function setDecision(lineKey: string, decision: Decision) {
    setOverrides((prev) => ({ ...prev, [lineKey]: decision }));
  }

  function handleApply() {
    applyReconciliation(Object.values(decisions));
    onClose();
  }

  const matchCount = Object.values(decisions).filter((d) => d.action === 'match').length;
  const newCount = Object.values(decisions).filter((d) => d.action === 'new').length;

  if (!projectId) return null;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import &amp; reconcile
            {project && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — {project.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No projection items found for this project.
          </p>
        ) : (
          <div className="flex flex-col gap-6 py-2">
            {/* Auto-matched section */}
            {auto.length > 0 && (
              <section>
                <button
                  className="flex items-center gap-2 text-sm font-medium text-left w-full"
                  onClick={() => setAutoExpanded((v) => !v)}
                >
                  <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                    Auto-matched ({auto.length})
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {autoExpanded ? '▲ hide' : '▼ show'}
                  </span>
                </button>
                {autoExpanded && (
                  <div className="mt-2 rounded-md border divide-y">
                    {auto.map((c) => (
                      <div key={c.line.lineKey} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CostTypeBadge costType={c.line.costType} />
                          <span className="text-sm truncate">{c.line.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                          <span>→ {c.suggestion?.canonicalName ?? '—'}</span>
                          <span className="text-green-600 font-medium">
                            {Math.round(c.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Needs review section */}
            {review.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">
                    Needs review ({review.length})
                  </span>
                </div>
                <div className="rounded-md border divide-y">
                  {review.map((c) => {
                    const dec = decisions[c.line.lineKey];
                    const isMatch = dec?.action === 'match';
                    return (
                      <div key={c.line.lineKey} className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <CostTypeBadge costType={c.line.costType} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{c.line.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.line.phaseCode && (
                                  <span className="font-mono mr-1">{c.line.phaseCode}</span>
                                )}
                                {c.line.unitOfMeasure} &middot;{' '}
                                CTD cost ${c.line.cost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant={isMatch ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => {
                                if (c.suggestion) {
                                  setDecision(c.line.lineKey, {
                                    line: c.line,
                                    action: 'match',
                                    targetId: c.suggestion.id,
                                  });
                                }
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant={!isMatch ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() =>
                                setDecision(c.line.lineKey, { line: c.line, action: 'new' })
                              }
                            >
                              New
                            </Button>
                          </div>
                        </div>
                        {c.suggestion && (
                          <p className="text-xs text-muted-foreground mt-1 ml-7">
                            Suggested: <span className="font-medium">{c.suggestion.canonicalName}</span>
                            {' '}· {costTypeLabel(c.suggestion.costType)}
                            {' '}·{' '}
                            <span className={c.confidence >= 0.8 ? 'text-amber-600' : 'text-muted-foreground'}>
                              {Math.round(c.confidence * 100)}% match
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* New to catalog section */}
            {newLines.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-semibold">
                    New to catalog ({newLines.length})
                  </span>
                </div>
                <div className="rounded-md border divide-y">
                  {newLines.map((c) => (
                    <div key={c.line.lineKey} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CostTypeBadge costType={c.line.costType} />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{c.line.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.line.unitOfMeasure} &middot;{' '}
                            CTD cost ${c.line.cost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">Will be added</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground order-2 sm:order-1">
            {matchCount} matched · {newCount} new entries
          </p>
          <div className="flex gap-2 order-1 sm:order-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} disabled={lines.length === 0}>
              Add to catalog
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CostTypeBadge({ costType }: { costType: string }) {
  const label = costTypeLabel(costType);
  const color = COST_TYPE_COLOR[label] ?? '#bba199';
  return (
    <span
      className="inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
      style={{ background: color }}
    >
      {label}
    </span>
  );
}
