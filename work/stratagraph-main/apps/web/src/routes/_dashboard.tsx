import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DashboardLayout } from '~/components/layout/dashboard-layout';

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayoutWrapper,
});

function DashboardLayoutWrapper() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
