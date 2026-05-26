/**
 * PageHeader component for consistent page layouts.
 *
 * @see Issue #72: P10-003: Create atomic UI component library
 *
 * Usage:
 * ```tsx
 * import { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions } from "@repo/ui";
 *
 * <PageHeader>
 *   <div>
 *     <PageHeaderTitle>Users</PageHeaderTitle>
 *     <PageHeaderDescription>Manage user accounts and permissions.</PageHeaderDescription>
 *   </div>
 *   <PageHeaderActions>
 *     <Button>Add User</Button>
 *   </PageHeaderActions>
 * </PageHeader>
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader container with flex layout.
 */
const PageHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between md:pb-6',
          className
        )}
        {...props}
      />
    );
  }
);
PageHeader.displayName = 'PageHeader';

/**
 * PageHeaderTitle for the main heading.
 */
const PageHeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h1
      ref={ref}
      className={cn('text-2xl font-bold tracking-tight md:text-3xl', className)}
      {...props}
    />
  );
});
PageHeaderTitle.displayName = 'PageHeaderTitle';

/**
 * PageHeaderDescription for subtext.
 */
const PageHeaderDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return <p ref={ref} className={cn('text-muted-foreground', className)} {...props} />;
});
PageHeaderDescription.displayName = 'PageHeaderDescription';

/**
 * PageHeaderActions for action buttons.
 */
const PageHeaderActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-shrink-0 items-center gap-2', className)}
        {...props}
      />
    );
  }
);
PageHeaderActions.displayName = 'PageHeaderActions';

export { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions };
