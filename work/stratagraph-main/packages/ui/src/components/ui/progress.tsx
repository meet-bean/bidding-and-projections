/**
 * Progress bar component with size variants.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const progressVariants = cva('bg-primary/20 relative w-full overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type ProgressProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof progressVariants> & {
    /** Current progress value (0-100). Omit for indeterminate state. */
    value?: number;
    /** Custom class name for the indicator element. */
    indicatorClassName?: string;
  };

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, size = 'md', value, indicatorClassName, ...props }, ref) => {
    const clampedValue = typeof value === 'number' ? Math.min(100, Math.max(0, value)) : undefined;
    const isIndeterminate = clampedValue === undefined;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isIndeterminate ? undefined : clampedValue}
        data-slot="progress"
        className={cn(progressVariants({ size, className }))}
        {...props}
      >
        <div
          data-slot="progress-indicator"
          className={cn(
            'bg-primary h-full rounded-full transition-all duration-300',
            isIndeterminate && 'animate-indeterminate w-1/3',
            indicatorClassName
          )}
          style={isIndeterminate ? undefined : { width: `${clampedValue}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress, progressVariants };
