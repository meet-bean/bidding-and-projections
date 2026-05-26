import { createFileRoute } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from '@repo/ui';
import { Briefcase, FileText, Receipt, Users } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: DashboardHome,
});

const KPIS = [
  { label: 'Active Jobs', value: '12', icon: Briefcase, hint: 'across W TEX, S TEX, LA' },
  { label: 'Open Bids', value: '8', icon: FileText, hint: '3 pending sign-off' },
  { label: 'Crew Deployed', value: '24', icon: Users, hint: '12 day · 12 night' },
  { label: 'Tickets to Bill', value: '5', icon: Receipt, hint: '$214k awaiting' },
];

function DashboardHome() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <div>
          <PageHeaderTitle>Operations Overview</PageHeaderTitle>
          <PageHeaderDescription>
            Snapshot of active jobs, bids, crew deployment, and billable tickets.
          </PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {kpi.label}
                </CardTitle>
                <Icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
                <p className="text-muted-foreground mt-1 text-xs">{kpi.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Daily activity feed coming soon.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Sales pipeline feed coming soon.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
