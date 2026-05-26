/**
 * TagsBadgeList component.
 *
 * @see Spec: UDC-006 — TagsBadgeList component
 *
 * Renders a list of tags as category-colored Badge components within an
 * OverflowBadgeList. Each tag displays with its category color and icon.
 * Overflow hover card shows the full list of tags with colors.
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { OverflowBadgeList } from '@/components/overflow-badge-list';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { OverflowText } from '@/components/overflow-text';
import { TagBadge } from '@/components/tag-badge';

export interface TagsBadgeListItem {
  id: string;
  name: string;
  category: {
    name: string;
    color: string;
    icon: string;
  };
}

export interface TagsBadgeListProps {
  tags: TagsBadgeListItem[];
  maxRows?: number;
  /** Hard limit on visible items. First item truncates in tight containers. */
  maxItems?: number;
  className?: string;
}

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
  // Try exact match first, then PascalCase conversion
  const icon = icons[iconName] ?? icons[toPascalCase(iconName)];
  if (isReactComponent(icon)) {
    return icon;
  }
  return null;
}

function OverflowTagsList({ tags }: { tags: TagsBadgeListItem[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {tags.map((tag) => {
        const Icon = getLucideIcon(tag.category.icon);
        return (
          <div key={tag.id} className="flex min-w-0 items-center gap-1.5">
            {Icon ? (
              <span className="shrink-0" style={{ color: tag.category.color }}>
                <Icon className="size-3" />
              </span>
            ) : (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.category.color }}
              />
            )}
            <OverflowText className="text-sm" style={{ color: tag.category.color }}>
              {tag.name}
            </OverflowText>
            <span className="text-muted-foreground shrink-0 text-xs">({tag.category.name})</span>
          </div>
        );
      })}
    </div>
  );
}

export function TagsBadgeList({ tags, maxRows, maxItems, className }: TagsBadgeListProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <OverflowBadgeList
      items={tags}
      renderItem={(tag) => (
        <TagBadge
          name={tag.name}
          color={tag.category.color}
          icon={tag.category.icon}
          showIcon
          className="min-w-0"
        />
      )}
      maxItems={maxItems}
      renderOverflow={(overflowTags) => (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Badge
              variant="secondary"
              size="sm"
              aria-label={`Show ${overflowTags.length} more tags`}
            >
              +{overflowTags.length}
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto min-w-[14rem] max-w-[400px] p-2">
            <OverflowTagsList tags={overflowTags} />
          </HoverCardContent>
        </HoverCard>
      )}
      maxRows={maxRows}
      className={cn('leading-3', className)}
    />
  );
}
