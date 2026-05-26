/**
 * ExecutionCard component.
 *
 * Displays execution information in card or compact row format.
 * Uses ExecutionTypeBadge, ExecutionStatusBadge, SitesBadgeList, TagsBadgeList,
 * DateBadge, and UserBadge.
 */

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { OverflowText } from '@/components/overflow-text';
import { ExecutionTypeBadge, type ExecutionType } from '@/components/execution-type-badge';
import { ExecutionStatusBadge, type ExecutionStatus } from '@/components/execution-status-badge';
import { SitesBadgeList, type SitesBadgeListItem } from '@/components/sites-badge-list';
import { TagsBadgeList, type TagsBadgeListItem } from '@/components/tags-badge-list';
import { DateBadge } from '@/components/date-badge';
import { UserBadge, type UserBadgeUser } from '@/components/user-badge';

export interface ExecutionCardProps {
  title: string;
  type: ExecutionType;
  status: ExecutionStatus;
  description?: string;
  sites?: SitesBadgeListItem[];
  tags?: TagsBadgeListItem[];
  createdBy?: UserBadgeUser;
  createdAt?: Date | string;
  compact?: boolean;
  bare?: boolean;
  className?: string;
}

export function ExecutionCard({
  title,
  type,
  status,
  description,
  sites = [],
  tags = [],
  createdBy,
  createdAt,
  compact = false,
  bare = false,
  className,
}: ExecutionCardProps) {
  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-2 py-1.5 text-sm', className)}
        data-testid="execution-card-compact"
      >
        <OverflowText className="font-medium">{title}</OverflowText>
        <ExecutionTypeBadge type={type} />
        <ExecutionStatusBadge status={status} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {createdAt && (
            <span className="text-muted-foreground text-xs">
              <DateBadge date={createdAt} format="relative" />
            </span>
          )}
        </div>
      </div>
    );
  }

  const content = (
    <>
      <CardHeader className={bare ? 'px-0' : undefined}>
        <div className="flex items-center gap-2 overflow-hidden">
          <OverflowText className="font-medium">{title}</OverflowText>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ExecutionTypeBadge type={type} />
            <ExecutionStatusBadge status={status} />
          </div>
        </div>
        {description && (
          <p className="text-muted-foreground mt-0.5 hidden text-sm sm:block">{description}</p>
        )}
      </CardHeader>
      <CardContent className={bare ? 'px-0' : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          {sites.length > 0 && <SitesBadgeList sites={sites} maxItems={1} />}
          {tags.length > 0 && (
            <div className="hidden md:block">
              <TagsBadgeList tags={tags} maxItems={1} />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          {createdBy && (
            <div className="hidden md:block">
              <UserBadge user={createdBy} />
            </div>
          )}
          {createdAt && (
            <span className="text-muted-foreground text-xs">
              <DateBadge date={createdAt} format="relative" />
            </span>
          )}
        </div>
      </CardContent>
    </>
  );

  if (bare) {
    return (
      <div
        className={cn('flex flex-col', className)}
        data-slot="execution-card-bare"
        data-testid="execution-card-bare"
      >
        {content}
      </div>
    );
  }

  return (
    <Card size="sm" className={className} data-slot="execution-card" data-testid="execution-card">
      {content}
    </Card>
  );
}
