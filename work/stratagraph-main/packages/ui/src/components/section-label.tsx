/**
 * SectionLabel - A small all-caps heading that precedes content sections.
 *
 * Extracted from apps/web/src/routes/_authenticated/_dashboard/reports/overview.tsx
 * so the same label style can be reused across all report pages.
 *
 * @see Linear MEE-1770: Extract SectionLabel to @repo/ui.
 *
 * @example
 * ```tsx
 * import { SectionLabel } from '@repo/ui';
 *
 * <section className="space-y-2">
 *   <SectionLabel>Period Summary</SectionLabel>
 *   <KpiCards ... />
 * </section>
 * ```
 */

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SectionLabelProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Additional class names merged onto the root element. */
  className?: string;
}

/**
 * Small all-caps section heading. Renders as an `<h2>` with muted text,
 * extra-small font size, semi-bold weight, and wide letter-spacing —
 * matching the visual rhythm used in the reports pages.
 */
export function SectionLabel({ children, className, ...props }: SectionLabelProps) {
  return (
    <h2
      data-slot="section-label"
      className={cn(
        'text-muted-foreground text-xs font-semibold uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}
