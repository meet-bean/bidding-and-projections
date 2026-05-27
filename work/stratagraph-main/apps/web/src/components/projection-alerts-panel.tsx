'use client';

import { useState } from 'react';
import { Button, Badge, Textarea } from '@repo/ui';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { computeAlerts, SEVERITY_TONE, ALERT_TYPE_LABEL } from '@repo/projections';
import type { ProjectionProject, ProjectionAlert } from '@repo/projections';

interface ProjectionAlertsPanelProps {
  project: ProjectionProject;
  onResolve: (alert: ProjectionAlert, text: string) => void;
  onReopen: (alertId: string) => void;
  onNavigateToItem: (lineKey: string) => void;
}

export function ProjectionAlertsPanel({
  project,
  onResolve,
  onReopen,
  onNavigateToItem,
}: ProjectionAlertsPanelProps) {
  const [resolveText, setResolveText] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showResolved, setShowResolved] = useState(false);

  const { open, resolved } = computeAlerts(project);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleResolve = (alert: ProjectionAlert) => {
    const text = resolveText[alert.id]?.trim();
    if (!text) return;
    onResolve(alert, text);
    setResolveText((prev) => {
      const next = { ...prev };
      delete next[alert.id];
      return next;
    });
  };

  const AlertCard = ({
    alert,
    resolved: isResolved,
  }: {
    alert: ProjectionAlert;
    resolved?: boolean;
  }) => {
    const tone = SEVERITY_TONE[alert.severity];
    const isExpanded = expanded[alert.id];
    return (
      <div className={`rounded-lg border ${tone.border} ${tone.soft} p-3 space-y-2`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`size-2 rounded-full ${tone.dot} shrink-0`} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${tone.text} truncate`}>{alert.title}</p>
              <p className="text-xs text-muted-foreground truncate">{alert.detail}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {ALERT_TYPE_LABEL[alert.type]}
            </Badge>
            <button
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors"
              onClick={() => toggleExpand(alert.id)}
            >
              {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>
        </div>

        {isExpanded && !isResolved && (
          <div className="space-y-2 pt-1">
            <button
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => onNavigateToItem(alert.key)}
            >
              Go to service ↗
            </button>
            <Textarea
              placeholder="Resolution note..."
              value={resolveText[alert.id] ?? ''}
              onChange={(e) =>
                setResolveText((prev) => ({ ...prev, [alert.id]: e.target.value }))
              }
              className="resize-none text-xs h-16"
            />
            <Button
              size="xs"
              variant="outline"
              disabled={!resolveText[alert.id]?.trim()}
              onClick={() => handleResolve(alert)}
            >
              <CheckCircle className="mr-1.5 size-3" /> Mark resolved
            </Button>
          </div>
        )}

        {isExpanded && isResolved && alert.resolution && (
          <div className="space-y-1 pt-1">
            <p className="text-xs text-muted-foreground">
              {alert.resolution.resolvedBy} ·{' '}
              {new Date(alert.resolution.resolvedAt).toLocaleDateString()}
            </p>
            <button
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => onReopen(alert.id)}
            >
              Reopen alert
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Alerts</span>
          {open.length > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5">
              {open.length}
            </Badge>
          )}
        </div>
        {resolved.length > 0 && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? 'Hide' : 'Show'} {resolved.length} resolved
          </button>
        )}
      </div>

      {open.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No open alerts</p>
      )}

      <div className="space-y-2">
        {open.map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>

      {showResolved && resolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Resolved</p>
          {resolved.map((a) => (
            <AlertCard key={a.id} alert={a} resolved />
          ))}
        </div>
      )}
    </div>
  );
}
