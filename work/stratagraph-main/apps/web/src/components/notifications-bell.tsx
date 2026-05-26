import { Link } from '@tanstack/react-router';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@repo/ui';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useStore } from '~/lib/store';
import type { Notification } from '~/lib/types';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

const KIND_ICON: Record<Notification['kind'], string> = {
  bid_accepted: 'check',
  ticket_signed: 'pen',
  ticket_paid: 'dollar',
  generic: 'dot',
};

export function NotificationsBell() {
  const notifications = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);

  const unread = notifications.filter((n) => !n.read);
  const unreadCount = unread.length;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'
            }
            className="relative"
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span
                className={cn(
                  'bg-strat-coral absolute -right-0.5 -top-0.5',
                  'flex h-4 min-w-4 items-center justify-center rounded-full',
                  'border-background border px-1 text-[10px] font-bold text-white tabular-nums'
                )}
                aria-hidden
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-muted-foreground text-xs">
              {notifications.length === 0
                ? 'Nothing yet.'
                : unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'}
            </div>
          </div>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="xs" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <CheckCircle2 className="text-success size-6" />
              <span>You're all caught up.</span>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'border-b last:border-b-0',
                    !n.read && 'bg-primary/[0.03]'
                  )}
                >
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
                        n.read ? 'bg-muted' : 'bg-primary'
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-tight">{n.title}</span>
                        <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.description ? (
                        <div className="text-muted-foreground mt-0.5 text-xs leading-snug">
                          {n.description}
                        </div>
                      ) : null}
                      {n.actionLabel && n.actionHref ? (
                        <div className="mt-2">
                          <Button
                            asChild
                            size="xs"
                            variant="outline"
                            onClick={() => markRead(n.id)}
                          >
                            <Link to={n.actionHref}>{n.actionLabel}</Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
