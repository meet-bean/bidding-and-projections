/**
 * UserCardDisplay component.
 *
 * Data display card for user information (distinct from the app-level
 * selectable UserCard used in pickers).
 * Shows avatar, name, email, role badges, and tags.
 */

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserRoleBadge, type UserRole } from '@/components/user-role-badge';
import { TagsBadgeList, type TagsBadgeListItem } from '@/components/tags-badge-list';

export interface UserCardDisplayProps {
  name: string;
  email: string;
  roleAssignments: Array<{
    id: string;
    role: UserRole;
  }>;
  tags?: TagsBadgeListItem[];
  compact?: boolean;
  bare?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '';
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  if (!last) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export function UserCardDisplay({
  name,
  email,
  roleAssignments,
  tags = [],
  compact = false,
  bare = false,
  className,
}: UserCardDisplayProps) {
  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-2 py-1.5 text-sm', className)}
        data-testid="user-card-display-compact"
      >
        <Avatar size="sm">
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{name}</span>
        {roleAssignments.length > 0 && (
          <div className="ml-auto flex shrink-0 gap-1">
            {roleAssignments.map((ra) => (
              <UserRoleBadge key={ra.id} role={ra.role} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <>
      <CardHeader className={bare ? 'px-0' : undefined}>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium">{name}</div>
            <div className="text-muted-foreground text-xs">{email}</div>
          </div>
          {roleAssignments.length > 0 && (
            <div className="ml-auto flex shrink-0 gap-1">
              {roleAssignments.map((ra) => (
                <UserRoleBadge key={ra.id} role={ra.role} />
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      {tags.length > 0 && (
        <CardContent className={bare ? 'px-0' : undefined}>
          <div className="hidden md:block">
            <TagsBadgeList tags={tags} maxRows={1} />
          </div>
        </CardContent>
      )}
    </>
  );

  if (bare) {
    return (
      <div
        className={cn('flex flex-col', className)}
        data-slot="user-card-display-bare"
        data-testid="user-card-display-bare"
      >
        {content}
      </div>
    );
  }

  return (
    <Card
      size="sm"
      className={className}
      data-slot="user-card-display"
      data-testid="user-card-display"
    >
      {content}
    </Card>
  );
}
