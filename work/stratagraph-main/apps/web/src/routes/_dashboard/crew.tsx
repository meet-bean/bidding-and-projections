import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { type Region, type CrewRole } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { TeamMemberDialog } from '~/components/entity-dialogs/team-member-dialog';

export const Route = createFileRoute('/_dashboard/crew')({
  component: FieldCrewPage,
});

const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  day_logger: 'Day Logger',
  night_logger: 'Night Logger',
  sample_catcher: 'Sample Catcher',
  supervisor: 'Supervisor',
};

const CREW_ROLE_CLASSES: Record<CrewRole, string> = {
  day_logger: 'bg-strat-gold/20 text-strat-gold border-strat-gold/40',
  night_logger: 'bg-strat-indigo/15 text-strat-indigo border-strat-indigo/30',
  sample_catcher: 'bg-strat-cyan/15 text-strat-cyan border-strat-cyan/30',
  supervisor: 'bg-strat-mauve/20 text-strat-mauve border-strat-mauve/40',
};

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

function FieldCrewPage() {
  const users = useStore((s) => s.users);
  const jobs = useStore((s) => s.jobs);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const crewColumnHelper = createColumnHelper<CrewRow>();
  const crewColumns = useMemo(
    () => [
      crewColumnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Crew Member" />,
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

  return (
    <>
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
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Add Crew Member
          </Button>
        }
      />
      <TeamMemberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
