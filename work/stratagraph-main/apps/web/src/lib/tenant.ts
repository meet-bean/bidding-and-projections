import { vistaAdapter } from '@repo/projections';
import type { ProjectionAdapter } from '@repo/projections';
import type { NavItem } from '~/components/navigation/app-sidebar';

export type TenantId = 'stratagraph' | 'superior';

export interface TenantConfig {
  id: TenantId;
  name: string;
  shortName: string;
  features: {
    projections: boolean;
    operations: boolean;
  };
  projectionAdapter: ProjectionAdapter | null;
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  stratagraph: {
    id: 'stratagraph',
    name: 'Stratagraph',
    shortName: 'SG',
    features: { projections: false, operations: true },
    projectionAdapter: null,
  },
  superior: {
    id: 'superior',
    name: 'Superior Construction',
    shortName: 'SC',
    features: { projections: true, operations: true },
    projectionAdapter: vistaAdapter,
  },
};

const OPERATIONS_NAV: NavItem[] = [
  { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
  { id: 'bids', label: 'Bids', href: '/bids', icon: 'FileText' },
  { id: 'jobs', label: 'Jobs', href: '/jobs', icon: 'Briefcase' },
  { id: 'invoices', label: 'Invoices', href: '/invoices', icon: 'Receipt' },
  { id: 'reports', label: 'Reports', href: '/reports', icon: 'BarChart3' },
  {
    id: 'admin',
    label: 'Admin',
    href: '/customers',
    icon: 'Settings',
    defaultOpen: true,
    children: [
      { id: 'admin-org', label: 'Organization', href: '/admin/organization', icon: 'Building' },
      { id: 'admin-team', label: 'Team', href: '/users', icon: 'Users' },
      { id: 'admin-customers', label: 'Customers', href: '/customers', icon: 'Building2' },
      { id: 'admin-equipment', label: 'Equipment', href: '/equipment', icon: 'Truck' },
      { id: 'admin-services', label: 'Services', href: '/services', icon: 'Wrench' },
      { id: 'admin-yards', label: 'Yards', href: '/yards', icon: 'MapPin' },
      { id: 'admin-metrics', label: 'Metrics', href: '/admin/metrics', icon: 'Calculator' },
      { id: 'admin-registry', label: 'Line Items', href: '/admin/registry', icon: 'List' },
    ],
  },
];

const PROJECTIONS_NAV: NavItem[] = [
  { id: 'home', label: 'Dashboard', href: '/home', icon: 'Home' },
  { id: 'projections', label: 'Projections', href: '/projections', icon: 'BarChart3' },
  {
    id: 'admin',
    label: 'Admin',
    href: '/admin/metrics',
    icon: 'Settings',
    defaultOpen: true,
    children: [
      { id: 'admin-org', label: 'Organization', href: '/admin/organization', icon: 'Building' },
      { id: 'admin-metrics', label: 'Metrics', href: '/admin/metrics', icon: 'Calculator' },
      { id: 'admin-registry', label: 'Line Items', href: '/admin/registry', icon: 'List' },
    ],
  },
];

export function getNavItems(tenant: TenantConfig): NavItem[] {
  if (tenant.features.projections && tenant.features.operations) {
    const projItems = PROJECTIONS_NAV.filter((item) => item.id !== 'home' && item.id !== 'admin');
    const ticketsIdx = OPERATIONS_NAV.findIndex((item) => item.id === 'invoices');
    const merged = [...OPERATIONS_NAV];
    merged.splice(ticketsIdx, 0, ...projItems);
    return merged;
  }
  if (tenant.features.projections) return PROJECTIONS_NAV;
  return OPERATIONS_NAV;
}
