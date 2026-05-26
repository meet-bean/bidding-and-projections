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
import { Send, Trash2 } from 'lucide-react';
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

  const comments: ProjectionComment[] = lineKey ? (project.comments[lineKey] ?? []) : [];
  // Get the line item label for the header
  const currentVersion = project.draft ?? project.versions[project.versions.length - 1];
  const item =
    lineKey && currentVersion
      ? currentVersion.items.find((i) => i.lineKey === lineKey)
      : null;

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
          {comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No comments yet. Comments persist across all versions.
            </p>
          ) : (
            comments.map((c) => (
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
