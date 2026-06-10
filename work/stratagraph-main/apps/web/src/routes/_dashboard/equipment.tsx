import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { useStore, REGION_LABELS, TENANT_REGIONS } from '~/lib/store';
import type { Region, Unit, UnitStatus } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { UnitAvailabilityBadge } from '~/components/status-badges';
import { UnitDialog } from '~/components/entity-dialogs/unit-dialog';

export const Route = createFileRoute('/_dashboard/equipment')({
  component: EquipmentPage,
});

interface UnitRow {
  id: string;
  code: string;
  type: string;
  typeLabel: string;
  yard: string;
  region: Region;
  regionLabel: string;
  status: UnitStatus;
  availability: 'deployed' | 'available';
  currentJobLabel: string;
  notes: string;
}

function EquipmentPage() {
  const units = useStore((s) => s.units);
  const jobs = useStore((s) => s.jobs);
  const yards = useStore((s) => s.yards);
  const tenantId = useStore((s) => s.tenantId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (id: string) => {
    const u = units.find((x) => x.id === id);
    if (!u) return;
    setEditing(u);
    setDialogOpen(true);
  };

  const rows: UnitRow[] = useMemo(
    () =>
      units.map((u) => {
        const job = u.currentJobId ? jobs.find((j) => j.id === u.currentJobId) : undefined;
        return {
          id: u.id,
          code: u.code,
          type: u.type,
          typeLabel: u.type.replace('_', ' '),
          yard: yards.find((y) => y.id === u.yardId)?.name ?? '—',
          region: u.region,
          regionLabel: REGION_LABELS[u.region],
          status: u.status,
          availability: job ? 'deployed' : 'available',
          currentJobLabel: job ? `${job.jobNumber} · ${job.wellName}` : '',
          notes: u.notes ?? '',
        };
      }),
    [units, jobs, yards]
  );

  const columnHelper = createColumnHelper<UnitRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        id: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Unit" />,
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
        ),
        size: 90,
      }),
      columnHelper.accessor('type', {
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: (info) => (
          <span className="text-sm capitalize">{info.row.original.typeLabel}</span>
        ),
        size: 130,
      }),
      columnHelper.accessor('yard', {
        id: 'yard',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Yard" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
        size: 120,
      }),
      columnHelper.accessor('region', {
        id: 'region',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.row.original.regionLabel}</span>
        ),
        size: 130,
      }),
      columnHelper.accessor('availability', {
        id: 'availability',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: (info) => {
          const u = units.find((x) => x.id === info.row.original.id);
          return u ? <UnitAvailabilityBadge unit={u} /> : null;
        },
        size: 130,
      }),
      columnHelper.accessor('currentJobLabel', {
        id: 'currentJob',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Current Job" />,
        cell: (info) =>
          info.getValue() ? (
            <span className="block max-w-[180px] truncate text-sm font-medium">{info.getValue()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 200,
      }),
      columnHelper.accessor('notes', {
        id: 'notes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Notes" />,
        cell: (info) => (
          <span className="text-muted-foreground block max-w-[240px] truncate text-xs">
            {info.getValue()}
          </span>
        ),
        size: 260,
      }),
    ],
    [columnHelper]
  );

  return (
    <>
      <DataListShell
        data={rows}
        columns={columns}
        searchPlaceholder="Search by unit, yard..."
        countLabel="units"
        searchableKeys={['code', 'yard']}
        filters={[
          {
            id: 'availability',
            label: 'Status',
            options: [
              { value: 'deployed', label: 'Deployed' },
              { value: 'available', label: 'Available' },
            ],
          },
          {
            id: 'region',
            label: 'Region',
            options: (TENANT_REGIONS[tenantId] ?? TENANT_REGIONS.stratagraph).map((v) => ({
              value: v,
              label: REGION_LABELS[v],
            })),
          },
        ]}
        onRowClick={(row) => openEdit(row.id)}
        emptyMessage="No equipment matches your filters."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New Unit
          </Button>
        }
      />
      <UnitDialog open={dialogOpen} onOpenChange={setDialogOpen} unit={editing} />
    </>
  );
}
