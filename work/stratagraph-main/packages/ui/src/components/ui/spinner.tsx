/**
 * Spinner component for loading indicators.
 *
 * A unified spinner using the SVG circle+arc pattern for consistent
 * loading states across the application.
 *
 * @example
 * ```tsx
 * import { Spinner } from "@repo/ui";
 *
 * // Default size (md)
 * <Spinner />
 *
 * // With size variant
 * <Spinner size="sm" />
 *
 * // In a button
 * <Button disabled><Spinner size="sm" className="mr-2" /> Saving...</Button>
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Size variant of the spinner.
   * - sm: 16px (h-4 w-4)
   * - md: 20px (h-5 w-5) - default
   * - lg: 24px (h-6 w-6)
   * - xl: 32px (h-8 w-8)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

/**
 * Spinner component for loading indicators.
 *
 * Uses an accessible wrapper with role="status" containing the spinning SVG
 * and screen reader text.
 */
const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        className={cn('inline-flex', sizeClasses[size], className)}
        {...props}
      >
        <svg
          className="text-muted-foreground h-full w-full animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </span>
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner };
