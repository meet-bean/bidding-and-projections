import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import { Plus, Mail } from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { USER_ROLE_LABELS, type UserRole, type Region, type CrewRole } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { TeamMemberDialog } from '~/components/entity-dialogs/team-member-dialog';

export const Route = createFileRoute('/_dashboard/users')({
  component: UsersPage,
});

const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  day_logger: 'Day Logger',
  night_logger: 'Night Logger',
  sample_catcher: 'Sample Catcher',
  supervisor: 'Supervisor',
};

const ROLE_CLASSES: Record<UserRole, string> = {
  executive: 'bg-strat-indigo/15 text-strat-indigo border-strat-indigo/30',
  sales: 'bg-strat-cyan/15 text-strat-cyan border-strat-cyan/30',
  operations: 'bg-strat-green/15 text-strat-green border-strat-green/30',
  field_crew: 'bg-strat-orange/15 text-strat-orange border-strat-orange/30',
};

const CREW_ROLE_CLASSES: Record<CrewRole, string> = {
  day_logger: 'bg-strat-gold/20 text-strat-gold border-strat-gold/40',
  night_logger: 'bg-strat-indigo/15 text-strat-indigo border-strat-indigo/30',
  sample_catcher: 'bg-strat-cyan/15 text-strat-cyan border-strat-cyan/30',
  supervisor: 'bg-strat-mauve/20 text-strat-mauve border-strat-mauve/40',
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

interface CrewRow {
  id: string;
  name: string;
  crewRole: CrewRole | '';
  crewRoleLabel: string;
  region: Region | 'ALL';
  regionLabel: string;
  certifications: string[];
  certCount: number;
  dayRate: number;
  availability: 'available' | 'on_job';
  currentJobLabel: string;
  yearsExperience: number;
  active: 'yes' | 'no';
}

function UsersPage() {
  const users = useStore((s) => s.users);
  const jobs = useStore((s) => s.jobs);
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

  const crewRows: CrewRow[] = useMemo(
    () =>
      users
        .filter((u) => u.role === 'field_crew')
        .map((u) => {
          const job = u.currentJobId ? jobs.find((j) => j.id === u.currentJobId) : undefined;
          return {
            id: u.id,
            name: u.name,
            crewRole: u.crewRole ?? '',
            crewRoleLabel: u.crewRole ? CREW_ROLE_LABELS[u.crewRole] : '—',
            region: (u.region ?? 'ALL') as Region | 'ALL',
            regionLabel: u.region ? REGION_LABELS[u.region] : 'All Regions',
            certifications: u.certifications ?? [],
            certCount: u.certifications?.length ?? 0,
            dayRate: u.dayRate ?? 0,
            availability: job ? 'on_job' : 'available',
            currentJobLabel: job ? `${job.jobNumber} · ${job.wellName}` : '',
            yearsExperience: u.yearsExperience ?? 0,
            active: u.active ? 'yes' : 'no',
          };
        }),
    [users, jobs]
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

  const crewColumnHelper = createColumnHelper<CrewRow>();
  const crewColumns = useMemo(
    () => [
      crewColumnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Crew" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-medium">{info.getValue()}</div>
              {row.yearsExperience ? (
                <div className="text-muted-foreground text-xs">{row.yearsExperience}+ yrs</div>
              ) : null}
            </div>
          );
        },
      }),
      crewColumnHelper.accessor('crewRole', {
        id: 'crewRole',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Shift Role" />,
        cell: (info) => {
          const v = info.getValue();
          if (!v) return <span className="text-muted-foreground/40 text-xs">—</span>;
          return <Badge className={CREW_ROLE_CLASSES[v]}>{CREW_ROLE_LABELS[v]}</Badge>;
        },
        size: 150,
      }),
      crewColumnHelper.accessor('regionLabel', {
        id: 'region',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.getValue()}</span>
        ),
        size: 130,
      }),
      crewColumnHelper.accessor('certCount', {
        id: 'certifications',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Certifications" />,
        cell: (info) => {
          const row = info.row.original;
          if (row.certifications.length === 0) {
            return <span className="text-muted-foreground text-xs">None</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {row.certifications.slice(0, 4).map((c) => (
                <Badge key={c} variant="outline" className="text-[10px]">
                  {c}
                </Badge>
              ))}
              {row.certifications.length > 4 ? (
                <Badge variant="outline" className="text-[10px]">
                  +{row.certifications.length - 4}
                </Badge>
              ) : null}
            </div>
          );
        },
      }),
      crewColumnHelper.accessor('dayRate', {
        id: 'dayRate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Day Rate" />,
        cell: (info) =>
          info.getValue() ? (
            <span className="text-sm tabular-nums">${info.getValue()}/day</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        size: 110,
      }),
      crewColumnHelper.accessor('currentJobLabel', {
        id: 'assignment',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assignment" />,
        cell: (info) => {
          const row = info.row.original;
          if (!info.getValue()) {
            return (
              <Badge className="bg-strat-green/15 text-strat-green border-strat-green/30 text-[10px]">
                Available
              </Badge>
            );
          }
          return (
            <div className="text-foreground truncate text-xs">{info.getValue()}</div>
          );
        },
        size: 200,
      }),
    ],
    [crewColumnHelper]
  );

  const addTeamMemberButton = (
    <Button onClick={() => setDialogOpen(true)}>
      <Plus />
      Add Team Member
    </Button>
  );

  return (
    <>
      <Tabs defaultValue="internal">
        {/* Tabs alone above the table — the add-member CTA sits inline with
         * search + filter on the DataListShell toolbar (one row, one source of
         * truth), matching the pattern on every other index page. */}
        <TabsList>
          <TabsTrigger value="internal">
            Users
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {internalRows.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="crew">
            Field Crew
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {crewRows.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-4">
          <DataListShell
            data={internalRows}
            columns={internalColumns}
            searchPlaceholder="Search by name, email, title..."
            searchableKeys={['name', 'email', 'title']}
            filters={[
              {
                id: 'role',
                label: 'Role',
                options: (['executive', 'sales', 'operations'] as const).map((r) => ({
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
            emptyMessage="No internal users match your filters."
            actions={addTeamMemberButton}
          />
        </TabsContent>

        <TabsContent value="crew" className="mt-4">
          <DataListShell
            data={crewRows}
            columns={crewColumns}
            searchPlaceholder="Search by name, cert..."
            searchableKeys={['name']}
            filters={[
              {
                id: 'crewRole',
                label: 'Shift Role',
                options: Object.entries(CREW_ROLE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
              {
                id: 'region',
                label: 'Region',
                options: Object.entries(REGION_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
              {
                id: 'availability',
                label: 'Availability',
                options: [
                  { value: 'available', label: 'Available' },
                  { value: 'on_job', label: 'On Job' },
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
            emptyMessage="No crew match your filters."
            actions={addTeamMemberButton}
          />
        </TabsContent>
      </Tabs>

      <TeamMemberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
