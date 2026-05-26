import type { GroupProps, PanelProps, SeparatorProps } from 'react-resizable-panels';
import {
  Group as ResizablePrimitiveGroup,
  Panel as ResizablePrimitivePanel,
  Separator as ResizablePrimitiveSeparator,
} from 'react-resizable-panels';

import { cn } from '@/lib/utils';

function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return (
    <ResizablePrimitiveGroup
      className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className)}
      {...props}
    />
  );
}

function ResizablePanel({
  className,
  overflowHidden = true,
  ...props
}: PanelProps & Partial<{ overflowHidden: boolean }>) {
  return (
    <ResizablePrimitivePanel
      className={cn(overflowHidden && 'overflow-hidden', className)}
      {...props}
    />
  );
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitiveSeparator
      className={cn(
        'bg-border focus-visible:ring-ring focus-visible:outline-hidden relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90',
        className
      )}
      {...props}
    >
      {withHandle && <div className="bg-border z-10 flex h-6 w-1 shrink-0 rounded-lg" />}
    </ResizablePrimitiveSeparator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
