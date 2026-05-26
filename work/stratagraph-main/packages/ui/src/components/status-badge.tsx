/**
 * StatusBadge — generic status/type badge wrapping the Badge primitive.
 *
 * Renders a Badge with a CSS class `${classPrefix}-${value}` so that
 * existing CSS custom-property rules (status-colors.css) keep working.
 */

import { cn } from '@/lib/utils';
import { Badge, type BadgeProps } from './ui/badge';

export interface StatusBadgeProps<T extends string> extends Omit<
  BadgeProps,
  'children' | 'variant' | 'size' | 'appearance'
> {
  /** The status/type value (e.g. "draft", "active") */
  value: T;
  /** CSS class prefix (e.g. "status" → "status-draft") */
  classPrefix: string;
  /** Map of value → display label */
  labels: Record<T, string>;
}

export function StatusBadge<T extends string>({
  value,
  classPrefix,
  labels,
  className,
  ...props
}: StatusBadgeProps<T>) {
  return (
    <Badge size="sm" className={cn(`${classPrefix}-${value}`, className)} {...props}>
      {labels[value]}
    </Badge>
  );
}
