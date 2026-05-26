/**
 * ExecutionTypeBadge component.
 *
 * Displays execution type (training, observation, certification) with appropriate styling
 * using CSS custom properties. Includes an icon per type.
 */

import { Award, Eye, GraduationCap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, type BadgeProps } from './ui/badge';

export type ExecutionType = 'training' | 'observation' | 'certification';

export interface ExecutionTypeBadgeProps extends Omit<
  BadgeProps,
  'children' | 'variant' | 'size' | 'appearance'
> {
  /** The execution type to display */
  type: ExecutionType;
}

const typeLabels: Record<ExecutionType, string> = {
  training: 'Training',
  observation: 'Observation',
  certification: 'Certification',
};

const typeIcons: Record<ExecutionType, LucideIcon> = {
  training: GraduationCap,
  observation: Eye,
  certification: Award,
};

export function ExecutionTypeBadge({ type, className, ...props }: ExecutionTypeBadgeProps) {
  const Icon = typeIcons[type];
  return (
    <Badge size="sm" className={cn(`type-${type}`, className)} {...props}>
      <Icon size={14} />
      {typeLabels[type]}
    </Badge>
  );
}
