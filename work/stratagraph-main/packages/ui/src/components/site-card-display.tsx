/**
 * SiteCardDisplay component.
 *
 * Data display card for site information (distinct from the app-level
 * selectable SiteCard used in pickers).
 * Shows site name with building icon, address, email, and tags.
 */

import { Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OverflowText } from '@/components/overflow-text';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { TagsBadgeList, type TagsBadgeListItem } from '@/components/tags-badge-list';

export interface SiteCardDisplayProps {
  name: string;
  address?: string | null;
  contactEmail?: string | null;
  tags?: TagsBadgeListItem[];
  compact?: boolean;
  bare?: boolean;
  className?: string;
}

export function SiteCardDisplay({
  name,
  address,
  contactEmail,
  tags = [],
  compact = false,
  bare = false,
  className,
}: SiteCardDisplayProps) {
  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-2 py-1.5 text-sm', className)}
        data-testid="site-card-display-compact"
      >
        <Building size={16} className="text-muted-foreground shrink-0" />
        <OverflowText className="font-medium">{name}</OverflowText>
        {address && (
          <span className="text-muted-foreground ml-auto hidden shrink-0 truncate sm:inline">
            {address}
          </span>
        )}
      </div>
    );
  }

  const content = (
    <>
      <CardHeader className={bare ? 'px-0' : undefined}>
        <div className="flex items-center gap-2">
          <Building size={16} className="text-muted-foreground shrink-0" />
          <OverflowText className="font-medium">{name}</OverflowText>
        </div>
      </CardHeader>
      <CardContent className={bare ? 'px-0' : undefined}>
        {address && <p className="text-muted-foreground hidden text-sm sm:block">{address}</p>}
        {contactEmail && (
          <p className="text-muted-foreground hidden text-sm sm:block">{contactEmail}</p>
        )}
        {tags.length > 0 && (
          <div className="mt-2 hidden md:block">
            <TagsBadgeList tags={tags} maxRows={1} />
          </div>
        )}
      </CardContent>
    </>
  );

  if (bare) {
    return (
      <div
        className={cn('flex flex-col', className)}
        data-slot="site-card-display-bare"
        data-testid="site-card-display-bare"
      >
        {content}
      </div>
    );
  }

  return (
    <Card
      size="sm"
      className={className}
      data-slot="site-card-display"
      data-testid="site-card-display"
    >
      {content}
    </Card>
  );
}
