'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Badge, Input } from '@repo/ui';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { BatchUploadResult } from '@repo/projections';

interface ImportReviewProps {
  open: boolean;
  preview: BatchUploadResult;
  onConfirm: (result: BatchUploadResult) => void;
  onCancel: () => void;
}

export function ProjectionImportReview({ open, preview, onConfirm, onCancel }: ImportReviewProps) {
  const [cycles, setCycles] = useState(preview.cycles);

  const updateLabel = (idx: number, label: string) => {
    setCycles((prev) => prev.map((c, i) => (i === idx ? { ...c, label } : c)));
  };

  const handleConfirm = () => {
    onConfirm({ ...preview, cycles });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Import</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {cycles.length} cycle{cycles.length !== 1 ? 's' : ''} detected. Review and adjust labels before importing.
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {preview.errors.length > 0 && (
            <div className="space-y-1">
              {preview.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="size-3 shrink-0" />
                  {err.file}: {err.message}
                </div>
              ))}
            </div>
          )}
          {cycles.map((cycle, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-success" />
                  <span className="text-sm font-medium">{cycle.file}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{cycle.rowCount} items</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Label:</span>
                <Input
                  className="h-7 text-sm"
                  value={cycle.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                />
              </div>
              {cycle.detectedDate && (
                <p className="text-xs text-muted-foreground">
                  Auto-detected date: {cycle.detectedDate.iso}
                </p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={cycles.length === 0}>
            Import {cycles.length} version{cycles.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
