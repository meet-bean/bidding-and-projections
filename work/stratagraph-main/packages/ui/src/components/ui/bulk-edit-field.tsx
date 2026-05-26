import * as React from 'react';
import { AlertTriangleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BulkEditFieldProps {
  label: string;
  aligned: boolean;
  children: React.ReactNode;
  className?: string;
}

function BulkEditField({ label, aligned, children, className }: BulkEditFieldProps) {
  const labelId = React.useId();

  return (
    <div data-slot="bulk-edit-field" className={cn('flex flex-col gap-1.5', className)}>
      <label
        id={labelId}
        data-slot="bulk-edit-field-label"
        className="text-sm font-medium leading-none"
      >
        {label}
      </label>
      {!aligned && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Selected items have different values. Saving will replace all.
        </div>
      )}
      <div role="group" aria-labelledby={labelId}>
        {children}
      </div>
    </div>
  );
}

export { BulkEditField };
export type { BulkEditFieldProps };
