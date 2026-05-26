import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { AlertCircle, CheckCircle2, MapPin, Plus } from 'lucide-react';
import { useStore, REGION_LABELS, TENANT_REGIONS } from '~/lib/store';
import type { Region, Yard } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { YardDialog } from '~/components/entity-dialogs/yard-dialog';

export const Route = createFileRoute('/_dashboard/yards')({
  component: YardsPage,
});

interface YardRow {
  id: string;
  name: string;
  city: string;
  state: string;
  region: Region;
  regionLabel: string;
  status: 'open' | 'closing' | 'closed';
  closingDate: string;
  unitCount: number;
  notes: string;
}

function YardsPage() {
  const yards = useStore((s) => s.yards);
  const units = useStore((s) => s.units);
  const tenantId = useStore((s) => s.tenantId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Yard | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (id: string) => {
    const y = yards.find((x) => x.id === id);
    if (!y) return;
    setEditing(y);
    setDialogOpen(true);
  };

  const rows: YardRow[] = useMemo(
    () =>
      yards.map((y) => ({
        id: y.id,
        name: y.name,
        city: y.city,
        state: y.state,
        region: y.region,
        regionLabel: REGION_LABELS[y.region],
        status: !y.isActive ? 'closed' : y.closingDate ? 'closing' : 'open',
        closingDate: y.closingDate ?? '',
        unitCount: units.filter((u) => u.yardId === y.id).length,
        notes: y.notes ?? '',
      })),
    [yards, units]
  );

  const columnHelper = createColumnHelper<YardRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Yard" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="text-muted-foreground size-3.5" />
                {info.getValue()}
              </div>
              <div className="text-muted-foreground text-xs">
                {row.city}, {row.state}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('region', {
        id: 'region',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.row.original.regionLabel}</span>
        ),
        size: 140,
      }),
      columnHelper.accessor('unitCount', {
        id: 'unitCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Units" />,
        cell: (info) => (
          <span className="text-sm tabular-nums">
            {info.getValue() === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              `${info.getValue()} unit${info.getValue() === 1 ? '' : 's'}`
            )}
          </span>
        ),
        size: 110,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: (info) => {
          const row = info.row.original;
          if (row.status === 'closed') {
            return (
              <Badge className="bg-strat-slate/15 text-strat-slate border-strat-slate/30">
                Closed
              </Badge>
            );
          }
          if (row.status === 'closing') {
            return (
              <Badge className="bg-strat-orange/15 text-strat-orange border-strat-orange/30 gap-1">
                <AlertCircle className="size-3" />
                Closing {row.closingDate}
              </Badge>
            );
          }
          return (
            <Badge className="bg-strat-green/15 text-strat-green border-strat-green/30 gap-1">
              <CheckCircle2 className="size-3" />
              Open
            </Badge>
          );
        },
        size: 200,
      }),
      columnHelper.accessor('notes', {
        id: 'notes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Notes" />,
        cell: (info) => (
          <span className="text-muted-foreground max-w-[360px] truncate text-xs">
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [columnHelper]
  );

  return (
    <>
      <DataListShell
        data={rows}
        columns={columns}
        searchPlaceholder="Search by name, city..."
        searchableKeys={['name', 'city', 'state']}
        filters={[
          {
            id: 'region',
            label: 'Region',
            options: (TENANT_REGIONS[tenantId] ?? TENANT_REGIONS.stratagraph).map((v) => ({
              value: v,
              label: REGION_LABELS[v],
            })),
          },
          {
            id: 'status',
            label: 'Status',
            options: [
              { value: 'open', label: 'Open' },
              { value: 'closing', label: 'Closing' },
              { value: 'closed', label: 'Closed' },
            ],
          },
        ]}
        onRowClick={(row) => openEdit(row.id)}
        emptyMessage="No yards configured."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New Yard
          </Button>
        }
      />
      <YardDialog open={dialogOpen} onOpenChange={setDialogOpen} yard={editing} />
    </>
  );
}
