/**
 * ApprovalTypeBadge component.
 *
 * Displays approval type with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type ApprovalType = 'approver' | 'acknowledger';

export interface ApprovalTypeBadgeProps extends Omit<
  StatusBadgeProps<ApprovalType>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The approval type to display */
  type: ApprovalType;
}

const typeLabels: Record<ApprovalType, string> = {
  approver: 'Approver',
  acknowledger: 'Acknowledger',
};

export function ApprovalTypeBadge({ type, ...props }: ApprovalTypeBadgeProps) {
  return <StatusBadge value={type} classPrefix="approval-type" labels={typeLabels} {...props} />;
}
