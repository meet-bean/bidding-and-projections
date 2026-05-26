/**
 * TaskStatusBadge component.
 *
 * @see Issue #370: AV-001: Create TaskStatusBadge component
 *
 * Displays task status with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskStatusBadgeProps extends Omit<
  StatusBadgeProps<TaskStatus>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The task status to display */
  status: TaskStatus;
}

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function TaskStatusBadge({ status, ...props }: TaskStatusBadgeProps) {
  return <StatusBadge value={status} classPrefix="task-status" labels={statusLabels} {...props} />;
}
