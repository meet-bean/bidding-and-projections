'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from './button';

// ============================================================================
// FloatingToolbar
// ============================================================================

interface FloatingToolbarProps extends React.ComponentProps<'div'> {
  /**
   * The number of currently selected items.
   * The toolbar is hidden when this value is 0.
   */
  selectedCount: number;
  /**
   * Called when the user clicks the Clear button.
   */
  onClear: () => void;
  /**
   * Entity-specific action buttons to render alongside the Clear button.
   * Examples: Bulk Edit, Delete.
   */
  children: React.ReactNode;
}

function FloatingToolbar({
  selectedCount,
  onClear,
  children,
  className,
  ...props
}: FloatingToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      data-slot="floating-toolbar"
      className={cn(
        // Positioning: sticky, centered horizontally, above the bottom edge
        'sticky inset-x-0 bottom-2 z-50 mx-auto w-fit',
        // Appearance
        'border-border bg-background flex items-center gap-2 rounded-lg border px-3 py-2 shadow-md',
        // Slide-up entrance animation (tw-animate-css compatible)
        'motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-200',
        className
      )}
      {...props}
    >
      <span className="text-foreground text-sm font-medium tabular-nums">
        {selectedCount} selected
      </span>

      <div aria-hidden="true" className="bg-border mx-1 h-4 w-px" />

      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>

      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

export { FloatingToolbar };
export type { FloatingToolbarProps };
