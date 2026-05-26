/**
 * TagBadge component — displays a tag with its category color.
 *
 * Supports two visual variants:
 * - `default` (outline): transparent tinted background with colored border and text
 * - `solid`: full-color background with contrasting text
 *
 * @see MEE-946: Align TagBadge default style with TagsBadgeList
 */

import * as React from 'react';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isLightColor } from '@/lib/color-utils';
import { cva, type VariantProps } from 'class-variance-authority';

/** Convert a string to PascalCase (e.g. "wrench" → "Wrench", "alert-triangle" → "AlertTriangle"). */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/** Check if a value is a valid React component (function or forwardRef object). */
function isReactComponent(value: unknown): value is React.ComponentType<{ className?: string }> {
  if (typeof value === 'function') return true;
  if (typeof value === 'object' && value !== null && '$$typeof' in value) return true;
  return false;
}

/** Resolve a lucide icon by name (case-insensitive), or return null if not found. */
function getLucideIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  const icons = LucideIcons as Record<string, unknown>;
  const icon = icons[iconName] ?? icons[toPascalCase(iconName)];
  if (isReactComponent(icon)) {
    return icon;
  }
  return null;
}

export const tagBadgeVariants = cva('gap-1', {
  variants: {
    variant: {
      default: 'min-w-0',
      solid: 'border-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface TagBadgeProps extends VariantProps<typeof tagBadgeVariants> {
  name: string;
  color: string;
  icon?: string;
  onRemove?: () => void;
  className?: string;
  showIcon?: boolean;
}

function TagIcon({ iconName }: { iconName: string }) {
  const Icon = getLucideIcon(iconName);
  if (Icon) {
    return <Icon className="size-3" data-tag-icon="" />;
  }
  return (
    <span className="text-[0.625rem] leading-none" data-tag-icon="">
      {iconName}
    </span>
  );
}

export function TagBadge({
  name,
  color,
  icon,
  variant = 'default',
  onRemove,
  className,
  showIcon = false,
}: TagBadgeProps) {
  const shouldShowIcon = showIcon && icon;

  const badgeVariant = variant === 'solid' ? undefined : ('outline' as const);
  const style: React.CSSProperties =
    variant === 'solid'
      ? { backgroundColor: color, color: isLightColor(color) ? '#171717' : '#ffffff' }
      : ({
          '--tag-color': color,
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
          color: color,
        } as React.CSSProperties);

  return (
    <Badge
      variant={badgeVariant}
      className={cn(tagBadgeVariants({ variant }), className)}
      style={style}
    >
      {shouldShowIcon && <TagIcon iconName={icon} />}
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
          aria-label={`Remove ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
