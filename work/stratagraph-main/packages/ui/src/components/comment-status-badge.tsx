/**
 * CommentStatusBadge component.
 *
 * Displays comment status with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type CommentStatus = 'active' | 'resolved';

export interface CommentStatusBadgeProps extends Omit<
  StatusBadgeProps<CommentStatus>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The comment status to display */
  status: CommentStatus;
}

const statusLabels: Record<CommentStatus, string> = {
  active: 'Active',
  resolved: 'Resolved',
};

export function CommentStatusBadge({ status, ...props }: CommentStatusBadgeProps) {
  return (
    <StatusBadge value={status} classPrefix="comment-status" labels={statusLabels} {...props} />
  );
}
