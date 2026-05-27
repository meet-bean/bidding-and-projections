'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Textarea,
  Badge,
} from '@repo/ui';
import { Send, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { ProjectionProject, ProjectionComment } from '@repo/projections';

interface ProjectionCommentsProps {
  project: ProjectionProject;
  lineKey: string | null;
  onAddComment: (lineKey: string, text: string) => void;
  onDeleteComment: (lineKey: string, commentId: string) => void;
  onClose: () => void;
}

export function ProjectionComments({
  project,
  lineKey,
  onAddComment,
  onDeleteComment,
  onClose,
}: ProjectionCommentsProps) {
  const [text, setText] = useState('');
  const [showPrevious, setShowPrevious] = useState(false);

  const comments: ProjectionComment[] = lineKey ? (project.comments[lineKey] ?? []) : [];
  // Get the service label for the header
  const currentVersion = project.draft ?? project.versions[project.versions.length - 1];
  const item =
    lineKey && currentVersion
      ? currentVersion.items.find((i) => i.lineKey === lineKey)
      : null;

  const currentLabel = (project.draft ?? project.versions.at(-1))?.label;
  const currentComments = comments.filter(
    (c) => c.versionLabel === currentLabel || !c.versionLabel,
  );
  const previousComments = comments.filter(
    (c) => c.versionLabel && c.versionLabel !== currentLabel,
  );

  const prevByVersion = new Map<string, ProjectionComment[]>();
  for (const c of previousComments) {
    const label = c.versionLabel ?? 'Unknown';
    if (!prevByVersion.has(label)) prevByVersion.set(label, []);
    prevByVersion.get(label)!.push(c);
  }

  const handleSubmit = () => {
    if (!lineKey || !text.trim()) return;
    onAddComment(lineKey, text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const handleCarryForward = (comment: ProjectionComment) => {
    if (!lineKey) return;
    onAddComment(lineKey, `[Carried forward from ${comment.versionLabel}] ${comment.text}`);
  };

  const handleCarryAllForward = () => {
    if (!lineKey) return;
    for (const c of previousComments) {
      onAddComment(lineKey, `[Carried forward from ${c.versionLabel}] ${c.text}`);
    }
  };

  return (
    <Sheet open={lineKey !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="flex w-[400px] flex-col gap-0 p-0 sm:w-[480px]">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base">
            {item ? (
              <span>
                {item.keyParts[0]} ·{' '}
                <span className="text-muted-foreground font-normal">{item.label}</span>
              </span>
            ) : (
              'Comments'
            )}
          </SheetTitle>
          {comments.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {comments.length} comment{comments.length !== 1 ? 's' : ''} · rolls over across
              versions
            </p>
          )}
        </SheetHeader>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Current cycle section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Current cycle
            </p>
            {currentComments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No comments this cycle</p>
            ) : (
              currentComments.map((c) => (
                <div key={c.id} className="group rounded-lg border bg-card p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium">{c.author}</span>
                      {c.versionLabel && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {c.versionLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => lineKey && onDeleteComment(lineKey, c.id)}
                        title="Delete comment"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm">{c.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Previous months section */}
          {previousComments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                  onClick={() => setShowPrevious((v) => !v)}
                >
                  {showPrevious ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Previous months ({previousComments.length})
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={handleCarryAllForward}
                >
                  <Copy className="mr-1 size-3" />
                  Carry all forward
                </Button>
              </div>

              {showPrevious && (
                <div className="space-y-4">
                  {Array.from(prevByVersion.entries()).map(([versionLabel, versionComments]) => (
                    <div key={versionLabel} className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">{versionLabel}</p>
                      {versionComments.map((c) => (
                        <div
                          key={c.id}
                          className="group rounded-lg border bg-card p-3 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-sm font-medium">{c.author}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => handleCarryForward(c)}
                                title="Carry forward to current cycle"
                              >
                                <Copy className="size-3" />
                              </button>
                              <button
                                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => lineKey && onDeleteComment(lineKey, c.id)}
                                title="Delete comment"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm">{c.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t px-6 py-4 space-y-2">
          <Textarea
            placeholder="Add a comment... (Ctrl+Enter to submit)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none text-sm"
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={!text.trim()}>
              <Send className="mr-1.5 size-3.5" />
              Add comment
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
