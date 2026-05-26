'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  entityLabel: string;
  onSave: () => void;
  isPending: boolean;
  hasChanges: boolean;
  children: React.ReactNode;
  className?: string;
}

function BulkEditDialog({
  open,
  onOpenChange,
  selectedCount,
  entityLabel,
  onSave,
  isPending,
  hasChanges,
  children,
  className,
}: BulkEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="bulk-edit-dialog"
        className={cn('sm:max-w-lg', className)}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{`Edit ${selectedCount} ${entityLabel}`}</DialogTitle>
        </DialogHeader>

        <div data-slot="bulk-edit-dialog-body" className="flex flex-col gap-4">
          {children}
        </div>

        <DialogFooter>
          <DialogPrimitive.Close render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogPrimitive.Close>
          <Button
            type="button"
            onClick={onSave}
            disabled={!hasChanges || isPending}
            aria-busy={isPending}
            aria-label={isPending ? 'Saving changes' : 'Save changes'}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { BulkEditDialog };
