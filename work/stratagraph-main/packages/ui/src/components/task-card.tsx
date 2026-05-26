/**
 * TaskCard component.
 *
 * Displays task information in card or compact row format.
 * Uses TaskStatusBadge, ExecutionTypeBadge, SiteBadge, DateBadge, and UserBadge.
 */

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { OverflowText } from '@/components/overflow-text';
import { TaskStatusBadge, type TaskStatus } from '@/components/task-status-badge';
import { ExecutionTypeBadge, type ExecutionType } from '@/components/execution-type-badge';
import { SiteBadge } from '@/components/site-badge';
import { DateBadge } from '@/components/date-badge';
import { UserBadge, type UserBadgeUser } from '@/components/user-badge';

export interface TaskCardProps {
  status: TaskStatus;
  due?: Date | string;
  execution: {
    title: string;
    type: ExecutionType;
  };
  executor: UserBadgeUser;
  executee: UserBadgeUser;
  site: {
    id: string;
    name: string;
  };
  compact?: boolean;
  bare?: boolean;
  className?: string;
}

export function TaskCard({
  status,
  due,
  execution,
  executor,
  executee,
  site,
  compact = false,
  bare = false,
  className,
}: TaskCardProps) {
  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-2 py-1.5 text-sm', className)}
        data-testid="task-card-compact"
      >
        <OverflowText className="font-medium">{execution.title}</OverflowText>
        <TaskStatusBadge status={status} />
        <ExecutionTypeBadge type={execution.type} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden sm:inline">
            <UserBadge user={executee} showAvatar={false} />
          </span>
          {due && (
            <span className="text-muted-foreground text-xs">
              <DateBadge date={due} format="relative" />
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
          <OverflowText className="font-medium">{execution.title}</OverflowText>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <TaskStatusBadge status={status} />
            <ExecutionTypeBadge type={execution.type} />
          </div>
        </div>
      </CardHeader>
      <CardContent className={bare ? 'px-0' : undefined}>
        <div className="flex items-center gap-1 text-sm">
          <UserBadge user={executor} />
          <span className="text-muted-foreground mx-1">&rarr;</span>
          <UserBadge user={executee} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <SiteBadge name={site.name} />
          {due && (
            <span className="text-muted-foreground text-xs">
              Due: <DateBadge date={due} format="relative" />
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
        data-slot="task-card-bare"
        data-testid="task-card-bare"
      >
        {content}
      </div>
    );
  }

  return (
    <Card size="sm" className={className} data-slot="task-card" data-testid="task-card">
      {content}
    </Card>
  );
}
