/**
 * ProcedureCard component.
 *
 * Displays procedure information in card or compact row format.
 * Uses ProcedureStatusBadge, SitesBadgeList, TagsBadgeList, and DateBadge.
 */

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { OverflowText } from '@/components/overflow-text';
import { ProcedureStatusBadge, type ProcedureStatus } from '@/components/procedure-status-badge';
import { VersionBadge } from '@/components/version-badge';
import { SitesBadgeList, type SitesBadgeListItem } from '@/components/sites-badge-list';
import { TagsBadgeList, type TagsBadgeListItem } from '@/components/tags-badge-list';
import { DateBadge } from '@/components/date-badge';

export interface ProcedureCardProps {
  title: string;
  status: ProcedureStatus;
  version?: number;
  description?: string;
  sites?: SitesBadgeListItem[];
  tags?: TagsBadgeListItem[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  compact?: boolean;
  bare?: boolean;
  className?: string;
}

export function ProcedureCard({
  title,
  status,
  version,
  description,
  sites = [],
  tags = [],
  createdAt,
  updatedAt,
  compact = false,
  bare = false,
  className,
}: ProcedureCardProps) {
  const displayDate = updatedAt ?? createdAt;

  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-2 py-1.5 text-sm', className)}
        data-testid="procedure-card-compact"
      >
        <OverflowText className="font-medium">{title}</OverflowText>
        <ProcedureStatusBadge status={status} />
        <VersionBadge version={version} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {displayDate && (
            <span className="text-muted-foreground text-xs">
              <DateBadge date={displayDate} format="relative" />
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
            <ProcedureStatusBadge status={status} />
            <VersionBadge version={version} />
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
        {displayDate && (
          <div className="text-muted-foreground mt-2 text-xs">
            <DateBadge date={displayDate} format="relative" />
          </div>
        )}
      </CardContent>
    </>
  );

  if (bare) {
    return (
      <div
        className={cn('flex flex-col', className)}
        data-slot="procedure-card-bare"
        data-testid="procedure-card-bare"
      >
        {content}
      </div>
    );
  }

  return (
    <Card size="sm" className={className} data-slot="procedure-card" data-testid="procedure-card">
      {content}
    </Card>
  );
}
