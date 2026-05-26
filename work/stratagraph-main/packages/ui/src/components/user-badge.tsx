/**
 * UserBadge component.
 *
 * @see Spec: UDC-002 — UserBadge component
 *
 * Renders a user's name with avatar. Uses a discriminated union for props:
 * - `{ user: UserBadgeUser }` renders the user immediately
 * - `{ user: string; status: 'loading' | 'error' }` renders a loading skeleton or error fallback
 *
 * When `user` is a string, `status` is required. On hover over a resolved
 * user, shows a HoverCard with expanded details (larger avatar, full name,
 * role, email).
 *
 * The component is a pure presentational component with no tRPC dependency.
 * For tRPC-based fetching, use a thin wrapper in apps/web/ that resolves
 * the user data and passes it as a UserBadgeUser object.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { OverflowText } from '@/components/overflow-text';
import { UserCardDisplay } from '@/components/user-card-display';
import type { UserRole } from '@/components/user-role-badge';

export interface UserBadgeUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  imageUrl?: string;
}

interface UserBadgeBaseProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Whether to show the avatar next to the name. Default: true */
  showAvatar?: boolean;
  /** Additional CSS class names */
  className?: string;
}

interface UserBadgeResolvedProps extends UserBadgeBaseProps {
  /** User object for immediate render. */
  user: UserBadgeUser;
  status?: never;
}

interface UserBadgeLoadingProps extends UserBadgeBaseProps {
  /** String user ID shown during loading. */
  user: string;
  /** Status: 'loading' shows skeleton, 'error' shows fallback. Required when user is a string. */
  status: 'loading' | 'error';
}

/**
 * Discriminated union: when `user` is a string, `status` is required.
 * When `user` is a UserBadgeUser object, `status` must not be provided.
 */
export type UserBadgeProps = UserBadgeResolvedProps | UserBadgeLoadingProps;

/** Extract initials from a user name (first letter of first and last name) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '';
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  if (!last) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function UserBadgeAvatar({
  user,
  size = 'sm',
}: {
  user: UserBadgeUser;
  size?: 'sm' | 'default' | 'lg';
}) {
  return (
    <Avatar size={size}>
      {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={user.name} /> : null}
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  );
}

function UserBadgeLoading({ showAvatar }: { showAvatar: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {showAvatar ? <Skeleton className="size-6 rounded-full" /> : null}
      <Skeleton className="h-4 w-20" />
    </span>
  );
}

function UserBadgeError({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} {...props}>
      <span className="text-muted-foreground text-sm italic">Unknown user</span>
    </span>
  );
}

function UserBadgeResolved({
  user,
  showAvatar,
  className,
  ...props
}: {
  user: UserBadgeUser;
  showAvatar: boolean;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <span
          className={cn('inline-flex min-w-0 cursor-default items-center gap-1.5', className)}
          {...props}
        >
          {showAvatar ? <UserBadgeAvatar user={user} /> : null}
          <OverflowText className="text-sm" title="">{user.name}</OverflowText>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="p-0">
        <UserCardDisplay
          name={user.name}
          email={user.email ?? ''}
          roleAssignments={user.role ? [{ id: 'role', role: user.role as UserRole }] : []}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

export function UserBadge({
  user,
  status,
  showAvatar = true,
  className,
  ...props
}: UserBadgeProps) {
  // String user ID requires status
  if (typeof user === 'string') {
    if (status === 'loading') {
      return <UserBadgeLoading showAvatar={showAvatar} />;
    }
    return <UserBadgeError className={className} {...props} />;
  }

  // Resolved user object
  return <UserBadgeResolved user={user} showAvatar={showAvatar} className={className} {...props} />;
}
