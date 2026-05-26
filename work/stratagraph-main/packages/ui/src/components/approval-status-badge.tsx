/**
 * ApprovalStatusBadge component.
 *
 * Displays approval status with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type ApprovalStatus = 'pending' | 'approved' | 'acknowledged' | 'rejected';

export interface ApprovalStatusBadgeProps extends Omit<
  StatusBadgeProps<ApprovalStatus>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The approval status to display */
  status: ApprovalStatus;
}

const statusLabels: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  acknowledged: 'Acknowledged',
  rejected: 'Rejected',
};

export function ApprovalStatusBadge({ status, ...props }: ApprovalStatusBadgeProps) {
  return (
    <StatusBadge value={status} classPrefix="approval-status" labels={statusLabels} {...props} />
  );
}
