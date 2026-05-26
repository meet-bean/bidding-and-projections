/**
 * UsersBadgeList component.
 *
 * @see UDC-010: UsersBadgeList component
 *
 * Renders a list of users as UserBadge components within an OverflowBadgeList.
 * Accepts an array of UserBadgeUser objects or string user IDs. Overflow
 * hover card shows UserBadge for each hidden user.
 */

import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { OverflowBadgeList } from '@/components/overflow-badge-list';
import { UserBadge } from '@/components/user-badge';
import type { UserBadgeUser } from '@/components/user-badge';
import { UserCardDisplay } from '@/components/user-card-display';
import type { UserRole } from '@/components/user-role-badge';

export interface UsersBadgeListProps {
  users: (string | UserBadgeUser)[];
  maxRows?: number;
  className?: string;
}

function renderUserItem(user: string | UserBadgeUser) {
  if (typeof user === 'string') {
    return <UserBadge user={user} status="loading" />;
  }
  return <UserBadge user={user} />;
}

function renderUserOverflow(overflowUsers: (string | UserBadgeUser)[]) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge variant="secondary" appearance="light" size="sm" className="cursor-default">
          +{overflowUsers.length}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto min-w-[14rem] max-w-[400px] p-2">
        <div className="flex flex-col divide-y">
          {overflowUsers.map((user, index) => {
            if (typeof user === 'string') {
              const key = `${user}-${String(index)}`;
              return (
                <div key={key} className="py-1.5">
                  <UserBadge user={user} status="loading" />
                </div>
              );
            }
            return (
              <UserCardDisplay
                key={user.id}
                name={user.name}
                email={user.email ?? ''}
                roleAssignments={user.role ? [{ id: 'role', role: user.role as UserRole }] : []}
                compact
              />
            );
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function UsersBadgeList({ users, maxRows, className }: UsersBadgeListProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <OverflowBadgeList
      gap={3}
      items={users}
      renderItem={renderUserItem}
      renderOverflow={renderUserOverflow}
      maxRows={maxRows}
      className={className}
    />
  );
}
