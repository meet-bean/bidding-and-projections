/**
 * ExecutionStatusBadge component.
 *
 * Displays execution status with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type ExecutionStatus = 'draft' | 'active' | 'archived';

export interface ExecutionStatusBadgeProps extends Omit<
  StatusBadgeProps<ExecutionStatus>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The execution status to display */
  status: ExecutionStatus;
}

const statusLabels: Record<ExecutionStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

export function ExecutionStatusBadge({ status, ...props }: ExecutionStatusBadgeProps) {
  return <StatusBadge value={status} classPrefix="status" labels={statusLabels} {...props} />;
}
