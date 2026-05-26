/**
 * SitesBadgeList component.
 *
 * @see UDC-005: SitesBadgeList component
 *
 * Renders a list of sites as SiteBadge components within an OverflowBadgeList.
 * Each site displays as a SiteBadge with Building icon and site name.
 * Overflow hover card shows a vertical list of SiteCardDisplay components in compact mode.
 */

import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { OverflowBadgeList } from '@/components/overflow-badge-list';
import { SiteBadge } from '@/components/site-badge';
import { SiteCardDisplay } from '@/components/site-card-display';

export interface SitesBadgeListItem {
  id: string;
  name: string;
  address?: string | null;
  contactEmail?: string | null;
}

export interface SitesBadgeListProps {
  sites: SitesBadgeListItem[];
  maxRows?: number;
  /** Hard limit on visible items. First item truncates in tight containers. */
  maxItems?: number;
  className?: string;
}

function renderSiteItem(site: SitesBadgeListItem) {
  return (
    <SiteBadge
      name={site.name}
      address={site.address}
      contactEmail={site.contactEmail}
    />
  );
}

function renderSiteOverflow(overflowSites: SitesBadgeListItem[]) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge
          variant="secondary"
          appearance="light"
          size="sm"
          className="cursor-default"
          aria-label={`Show ${overflowSites.length} more sites`}
        >
          +{overflowSites.length}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto min-w-[14rem] max-w-[400px] p-2">
        <div className="flex flex-col divide-y">
          {overflowSites.map((site) => (
            <SiteCardDisplay
              key={site.id}
              name={site.name}
              address={site.address}
              contactEmail={site.contactEmail}
              compact
            />
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function SitesBadgeList({ sites, maxRows, maxItems, className }: SitesBadgeListProps) {
  if (sites.length === 0) {
    return null;
  }

  return (
    <OverflowBadgeList
      items={sites}
      renderItem={renderSiteItem}
      renderOverflow={renderSiteOverflow}
      maxRows={maxRows}
      maxItems={maxItems}
      className={className}
    />
  );
}
