import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { StateBadge } from '~/components/status-badges';
import { type Region, type CrewRole } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { TeamMemberDialog } from '~/components/entity-dialogs/team-member-dialog';
import { EntityDetailSheet } from '~/components/entity-detail-sheet';

export const Route = createFileRoute('/_dashboard/crew')({
  component: FieldCrewPage,
});

const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  day_logger: 'Day Logger',
  night_logger: 'Night Logger',
  sample_catcher: 'Sample Catcher',
  supervisor: 'Supervisor',
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
  const [detailRow, setDetailRow] = useState<CrewRow | null>(null);

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
          // Category, not status — plain text per the house style.
          return <span className="text-sm">{CREW_ROLE_LABELS[v]}</span>;
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
          const shown = row.certifications.slice(0, 4).join(', ');
          const extra = row.certifications.length - 4;
          return (
            <span className="text-muted-foreground text-xs" title={row.certifications.join(', ')}>
              {shown}
              {extra > 0 ? ` +${extra}` : ''}
            </span>
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
              <StateBadge tone="positive" className="text-[10px]">
                Available
              </StateBadge>
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
        countLabel="crew members"
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
        onRowClick={(row) => setDetailRow(row)}
        emptyMessage="No crew match your filters."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Add Crew Member
          </Button>
        }
      />
      <TeamMemberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EntityDetailSheet
        open={detailRow !== null}
        onOpenChange={(open) => !open && setDetailRow(null)}
        title={detailRow?.name ?? ''}
        subtitle={
          detailRow?.crewRole ? CREW_ROLE_LABELS[detailRow.crewRole] : undefined
        }
        badge={
          detailRow ? (
            detailRow.availability === 'available' ? (
              <StateBadge tone="positive">Available</StateBadge>
            ) : (
              <StateBadge tone="neutral">On Job</StateBadge>
            )
          ) : undefined
        }
        fields={
          detailRow
            ? [
                {
                  label: 'Shift Role',
                  value: detailRow.crewRole ? CREW_ROLE_LABELS[detailRow.crewRole] : '',
                },
                { label: 'Region', value: detailRow.regionLabel },
                {
                  label: 'Day Rate',
                  value: detailRow.dayRate ? `$${detailRow.dayRate}/day` : '',
                },
                {
                  label: 'Experience',
                  value: detailRow.yearsExperience
                    ? `${detailRow.yearsExperience}+ yrs`
                    : '',
                },
                {
                  label: 'Certifications',
                  value:
                    detailRow.certifications.length > 0
                      ? detailRow.certifications.join(', ')
                      : '',
                },
                { label: 'Assignment', value: detailRow.currentJobLabel },
                {
                  label: 'Status',
                  value: detailRow.active === 'yes' ? 'Active' : 'Inactive',
                },
              ]
            : []
        }
      />
    </>
  );
}
