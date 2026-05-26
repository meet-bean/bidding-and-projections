/**
 * VersionBadge component.
 *
 * Displays "Draft" or "v1", "v2", etc. Grey for draft, text-primary for versions.
 */

import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

export interface VersionBadgeProps {
  /** Version number, or undefined/null for draft */
  version?: number | null;
  /** Whether to render a "Draft" badge when version is null. Defaults to true. */
  renderAsDraft?: boolean;
  className?: string;
}

export function VersionBadge({ version, renderAsDraft = true, className }: VersionBadgeProps) {
  const isDraft = version == null;

  if (isDraft && !renderAsDraft) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      size="sm"
      className={cn(isDraft ? 'text-muted-foreground' : 'text-secondary-foreground', className)}
    >
      {isDraft ? 'Draft' : `v${version}`}
    </Badge>
  );
}
