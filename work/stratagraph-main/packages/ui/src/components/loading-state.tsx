/**
 * LoadingState component for full loading displays.
 *
 * @see Issue #72: P10-003: Create atomic UI component library
 *
 * Usage:
 * ```tsx
 * import { LoadingState } from "@repo/ui";
 *
 * <LoadingState text="Loading data..." />
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Spinner, type SpinnerProps } from './ui/spinner.js';

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  spinnerSize?: SpinnerProps['size'];
}

/**
 * LoadingState component for full loading displays.
 */
const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ text = 'Loading...', spinnerSize = 'lg', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[200px] flex-col items-center justify-center space-y-3 p-8',
          className
        )}
        {...props}
      >
        <Spinner size={spinnerSize} />
        <p className="text-muted-foreground text-sm">{text}</p>
      </div>
    );
  }
);
LoadingState.displayName = 'LoadingState';

export { LoadingState };
