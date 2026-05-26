/**
 * SiteBadge component.
 *
 * Displays a site name with a Building icon in a secondary badge.
 * Shows a SiteCardDisplay on hover by default.
 * Used within SitesBadgeList and entity cards.
 */

import { Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { SiteCardDisplay } from '@/components/site-card-display';
import { cn } from '@/lib/utils';
import { OverflowText } from '@/components/overflow-text';

export interface SiteBadgeProps {
  /** The site name to display */
  name: string;
  /** Optional site address for hover card */
  address?: string | null;
  /** Optional contact email for hover card */
  contactEmail?: string | null;
  /** Show SiteCardDisplay on hover (default: true) */
  showHoverCard?: boolean;
  /** Maximum width of the badge. Default: "300px" */
  maxWidth?: string;
  /** Additional CSS class names */
  className?: string;
}

export function SiteBadge({
  name,
  address,
  contactEmail,
  showHoverCard = true,
  maxWidth = '300px',
  className,
}: SiteBadgeProps) {
  const badge = (
    <Badge
      variant="secondary"
      appearance="light"
      size="sm"
      className={cn('min-w-0', showHoverCard && 'cursor-default', className)}
      style={{ maxWidth }}
    >
      <Building size={12} />
      <OverflowText title={showHoverCard ? '' : undefined}>{name}</OverflowText>
    </Badge>
  );

  if (!showHoverCard) {
    return badge;
  }

  return (
    <HoverCard>
      <HoverCardTrigger>{badge}</HoverCardTrigger>
      <HoverCardContent className="w-auto min-w-[12rem] p-0">
        <SiteCardDisplay name={name} address={address} contactEmail={contactEmail} />
      </HoverCardContent>
    </HoverCard>
  );
}
