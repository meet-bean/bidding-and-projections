/**
 * ProcedureStatusBadge component.
 *
 * @see Issue #206: P16-011: Create ProcedureStatusBadge with CSS vars
 *
 * Displays procedure status with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type ProcedureStatus = 'draft' | 'pending' | 'published' | 'archived';

export interface ProcedureStatusBadgeProps extends Omit<
  StatusBadgeProps<ProcedureStatus>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The procedure status to display */
  status: ProcedureStatus;
}

const statusLabels: Record<ProcedureStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  published: 'Published',
  archived: 'Archived',
};

export function ProcedureStatusBadge({ status, ...props }: ProcedureStatusBadgeProps) {
  return <StatusBadge value={status} classPrefix="status" labels={statusLabels} {...props} />;
}
