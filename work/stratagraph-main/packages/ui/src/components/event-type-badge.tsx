/**
 * EventTypeBadge component.
 *
 * Displays an activity log event type with contextual icons for both the
 * entity category and the action. Format: <CategoryIcon> **Category** | <ActionIcon> Action
 *
 * @see MEE-1476: Align activity-log layout and UI with other admin pages
 */

import type { LucideIcon } from 'lucide-react';
import {
  User,
  MapPin,
  FileText,
  Files,
  ClipboardCheck,
  ClipboardList,
  Tag,
  Tags,
  Blocks,
  Paperclip,
  MessageSquare,
  FlaskConical,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Archive,
  Send,
  CircleCheck,
  CircleX,
  UserPlus,
  UserMinus,
  CheckCircle,
  HelpCircle,
  Clock,
  Play,
  Ban,
  Reply,
  AtSign,
  Upload,
  MessageCircle,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, type BadgeProps } from './ui/badge';

export interface EventTypeBadgeProps extends Omit<BadgeProps, 'children' | 'variant'> {
  type: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  user: User,
  site: MapPin,
  procedure: FileText,
  procedure_series: Files,
  task: ClipboardCheck,
  execution: ClipboardList,
  tag: Tag,
  tag_category: Tags,
  bulk: Blocks,
  attachment: Paperclip,
  comment: MessageSquare,
  result: FlaskConical,
};

const categoryLabels: Record<string, string> = {
  procedure_series: 'Procedure Series',
  tag_category: 'Tag Category',
};

const actionIcons: Record<string, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  published: Globe,
  archived: Archive,
  submitted_for_review: Send,
  review_approved: CircleCheck,
  review_rejected: CircleX,
  approved: CircleCheck,
  rejected: CircleX,
  assigned: UserPlus,
  unassigned: UserMinus,
  completed: CheckCircle,
  invited: Send,
  role_changed: Star,
  started: Play,
  expired: Clock,
  cancelled: Ban,
  reply: Reply,
  mention: AtSign,
  resolve: CircleCheck,
  uploaded: Upload,
  submitted: Send,
  feedback_added: MessageCircle,
  feedback_acknowledged: CircleCheck,
};

function getEventTypeBadgeClass(eventType: string): string {
  const suffix = eventType.includes('.')
    ? eventType.slice(eventType.lastIndexOf('.') + 1)
    : eventType;

  if (
    [
      'submitted_for_review',
      'approved',
      'rejected',
      'review_approved',
      'review_rejected',
      'published',
      'archived',
    ].includes(suffix)
  ) {
    return 'event-workflow';
  }
  if (suffix === 'assigned' || suffix === 'unassigned') return 'event-assignment';
  if (suffix === 'created') return 'event-created';
  if (suffix === 'deleted') return 'event-deleted';
  if (suffix === 'updated') return 'event-updated';
  return 'event-default';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatAction(action: string): string {
  return action.split('_').map(capitalize).join(' ');
}

/**
 * Extract the category from an event type string.
 * Handles multi-segment categories like "procedure_series.created" and "tag_category.updated".
 */
function parseEventType(type: string): { category: string; action: string } {
  const dotIndex = type.lastIndexOf('.');
  if (dotIndex < 0) return { category: type, action: '' };
  return { category: type.slice(0, dotIndex), action: type.slice(dotIndex + 1) };
}

export function EventTypeBadge({ type, className, ...props }: EventTypeBadgeProps) {
  const { category, action } = parseEventType(type);

  const CategoryIcon = categoryIcons[category] ?? HelpCircle;
  const ActionIcon = action ? (actionIcons[action] ?? HelpCircle) : null;
  const categoryLabel = categoryLabels[category] ?? capitalize(category);

  return (
    <Badge
      variant="secondary"
      className={cn(getEventTypeBadgeClass(type), 'gap-1', className)}
      {...props}
    >
      <CategoryIcon size={14} />
      <span className="font-bold">{categoryLabel}</span>
      {action && (
        <>
          <span className="mx-0.75 inline-block h-full w-px bg-current opacity-25" />
          {ActionIcon && <ActionIcon size={14} />}
          <span>{formatAction(action)}</span>
        </>
      )}
    </Badge>
  );
}
