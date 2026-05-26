/**
 * UserRoleBadge component.
 *
 * Displays user role with appropriate styling using CSS custom properties.
 */

import { StatusBadge, type StatusBadgeProps } from './status-badge';

export type UserRole = 'admin' | 'executive' | 'site_manager' | 'supervisor' | 'operator';

export interface UserRoleBadgeProps extends Omit<
  StatusBadgeProps<UserRole>,
  'value' | 'classPrefix' | 'labels'
> {
  /** The user role to display */
  role: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  executive: 'Executive',
  site_manager: 'Site Manager',
  supervisor: 'Supervisor',
  operator: 'Operator',
};

export function UserRoleBadge({ role, ...props }: UserRoleBadgeProps) {
  return <StatusBadge value={role} classPrefix="role" labels={roleLabels} {...props} />;
}
