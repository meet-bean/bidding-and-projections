import type { ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';
import { AppLayout } from '@repo/ui';
import { AppSidebar } from '../navigation/app-sidebar';
import { Breadcrumb } from '../navigation/breadcrumb';
import { GlobalSearch } from '../global-search';
import { NotificationsBell } from '../notifications-bell';
import { useStore } from '~/lib/store';
import { getNavItems, TENANTS } from '~/lib/tenant';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const tenantId = useStore((s) => s.tenantId);
  const tenant = TENANTS[tenantId] ?? TENANTS.stratagraph;
  const navItems = getNavItems(tenant);
  return (
    <AppLayout
      sidebar={
        <AppSidebar
          navItems={navItems}
          currentPath={location.pathname}
          tenantName={tenant.name}
          tenantShortName={tenant.shortName}
        />
      }
      breadcrumbSlot={<Breadcrumb />}
      headerActions={
        <>
          <GlobalSearch />
          <NotificationsBell />
        </>
      }
    >
      {/*
       * min-w-0 lets this flex child shrink below its content's intrinsic
       * width, so wide content (Gantt board) engages its own overflow-x-auto
       * scroll instead of forcing the whole page to scroll horizontally
       * (which would un-stick the Gantt's sticky title column and let it
       * overlap the app sidebar).
       */}
      <div className="min-w-0 w-full px-6 py-4">{children}</div>
    </AppLayout>
  );
}
