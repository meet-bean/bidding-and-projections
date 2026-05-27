import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { Plus, Mail } from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { USER_ROLE_LABELS, type UserRole, type Region } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { TeamMemberDialog } from '~/components/entity-dialogs/team-member-dialog';

export const Route = createFileRoute('/_dashboard/users')({
  component: UsersPage,
});

const ROLE_CLASSES: Record<Exclude<UserRole, 'field_crew'>, string> = {
  executive: 'bg-strat-indigo/15 text-strat-indigo border-strat-indigo/30',
  sales: 'bg-strat-cyan/15 text-strat-cyan border-strat-cyan/30',
  operations: 'bg-strat-green/15 text-strat-green border-strat-green/30',
  project_manager: 'bg-strat-mauve/20 text-strat-mauve border-strat-mauve/40',
};

interface InternalRow {
  id: string;
  name: string;
  title: string;
  email: string;
  role: Exclude<UserRole, 'field_crew'>;
  region: Region | 'ALL';
  regionLabel: string;
  active: 'yes' | 'no';
}

function UsersPage() {
  const users = useStore((s) => s.users);
  const [dialogOpen, setDialogOpen] = useState(false);

  const internalRows: InternalRow[] = useMemo(
    () =>
      users
        .filter((u) => u.role !== 'field_crew')
        .map((u) => ({
          id: u.id,
          name: u.name,
          title: u.title && u.title !== USER_ROLE_LABELS[u.role] ? u.title : '',
          email: u.email,
          role: u.role as Exclude<UserRole, 'field_crew'>,
          region: (u.region ?? 'ALL') as Region | 'ALL',
          regionLabel: u.region ? REGION_LABELS[u.region] : 'All Regions',
          active: u.active ? 'yes' : 'no',
        })),
    [users]
  );

  const internalColumnHelper = createColumnHelper<InternalRow>();
  const internalColumns = useMemo(
    () => [
      internalColumnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="User" />,
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      }),
      internalColumnHelper.accessor('email', {
        id: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: (info) => (
          <a
            href={`mailto:${info.getValue()}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate text-sm"
          >
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{info.getValue()}</span>
          </a>
        ),
      }),
      internalColumnHelper.accessor('role', {
        id: 'role',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
        cell: (info) => {
          const v = info.getValue();
          return <Badge className={ROLE_CLASSES[v]}>{USER_ROLE_LABELS[v]}</Badge>;
        },
        size: 130,
      }),
      internalColumnHelper.accessor('regionLabel', {
        id: 'region',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.getValue()}</span>
        ),
        size: 140,
      }),
      internalColumnHelper.accessor('active', {
        id: 'active',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: (info) =>
          info.getValue() === 'yes' ? (
            <Badge className="bg-strat-green/15 text-strat-green border-strat-green/30">
              Active
            </Badge>
          ) : (
            <Badge className="bg-strat-slate/15 text-strat-slate border-strat-slate/30">
              Inactive
            </Badge>
          ),
        size: 110,
      }),
    ],
    [internalColumnHelper]
  );

  return (
    <>
      <DataListShell
        data={internalRows}
        columns={internalColumns}
        searchPlaceholder="Search by name, email, title..."
        searchableKeys={['name', 'email', 'title']}
        filters={[
          {
            id: 'role',
            label: 'Role',
            options: (['executive', 'sales', 'operations', 'project_manager'] as const).map((r) => ({
              value: r,
              label: USER_ROLE_LABELS[r],
            })),
          },
          {
            id: 'region',
            label: 'Region',
            options: [
              { value: 'ALL', label: 'All Regions' },
              ...Object.entries(REGION_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ],
          },
          {
            id: 'active',
            label: 'Status',
            options: [
              { value: 'yes', label: 'Active' },
              { value: 'no', label: 'Inactive' },
            ],
          },
        ]}
        emptyMessage="No team members match your filters."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Add Team Member
          </Button>
        }
      />
      <TeamMemberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
