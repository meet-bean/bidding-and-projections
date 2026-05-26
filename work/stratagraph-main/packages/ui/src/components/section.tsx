/**
 * Section component for content organization.
 *
 * @see Issue #72: P10-003: Create atomic UI component library
 *
 * Usage:
 * ```tsx
 * import { Section, SectionHeader, SectionTitle, SectionDescription, SectionContent } from "@repo/ui";
 *
 * <Section>
 *   <SectionHeader>
 *     <SectionTitle>General Settings</SectionTitle>
 *     <SectionDescription>Configure your account preferences.</SectionDescription>
 *   </SectionHeader>
 *   <SectionContent>
 *     Form content goes here
 *   </SectionContent>
 * </Section>
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Section container.
 */
const Section = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return <section ref={ref} className={cn('space-y-4', className)} {...props} />;
  }
);
Section.displayName = 'Section';

/**
 * SectionHeader for title and description.
 */
const SectionHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('space-y-1', className)} {...props} />;
  }
);
SectionHeader.displayName = 'SectionHeader';

/**
 * SectionTitle for the section heading.
 */
const SectionTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h2 ref={ref} className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
    );
  }
);
SectionTitle.displayName = 'SectionTitle';

/**
 * SectionDescription for subtext.
 */
const SectionDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return <p ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />;
});
SectionDescription.displayName = 'SectionDescription';

/**
 * SectionContent for the main content.
 */
const SectionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('pt-2', className)} {...props} />;
  }
);
SectionContent.displayName = 'SectionContent';

export { Section, SectionHeader, SectionTitle, SectionDescription, SectionContent };
