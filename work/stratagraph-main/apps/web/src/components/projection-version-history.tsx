'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, Button, Badge } from '@repo/ui';
import { Clock, Upload } from 'lucide-react';
import type { ProjectionProject } from '@repo/projections';

interface VersionHistoryProps {
  project: ProjectionProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewingVersionId: string | null;
  onSelectVersion: (versionId: string | null) => void;
  onUploadNext: () => void;
}

export function ProjectionVersionHistory({
  project,
  open,
  onOpenChange,
  viewingVersionId,
  onSelectVersion,
  onUploadNext,
}: VersionHistoryProps) {
  const currentVersionId = (project.draft ?? project.versions.at(-1))?.id ?? null;
  const allVersions = [...project.versions].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={onUploadNext}>
            <Upload className="size-3.5" />
            Upload next cycle
          </Button>

          {viewingVersionId && viewingVersionId !== currentVersionId && (
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={() => onSelectVersion(null)}
            >
              Back to Current
            </Button>
          )}

          {project.draft && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{project.draft.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Draft · {project.draft.items.length} items
                  </p>
                </div>
                <Badge variant="outline" size="sm">Draft</Badge>
              </div>
            </div>
          )}

          {allVersions.map((v, i) => {
            const isCurrent = v.id === currentVersionId;
            const isViewing = v.id === viewingVersionId;
            return (
              <button
                key={v.id}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${isViewing ? 'border-warning bg-warning/5' : isCurrent ? 'border-success/30' : ''}`}
                onClick={() => onSelectVersion(isViewing ? null : v.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      V{String(allVersions.length - i).padStart(2, '0')} · {v.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' · '}
                      {v.items.length} items
                    </p>
                  </div>
                  {isCurrent && !isViewing && (
                    <Badge variant="secondary" size="sm">Current</Badge>
                  )}
                  {isViewing && (
                    <Badge variant="warning" appearance="light" size="sm">Viewing</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
