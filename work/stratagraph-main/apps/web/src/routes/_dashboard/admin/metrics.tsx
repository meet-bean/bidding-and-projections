import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useStore } from '~/lib/store';
import { uid } from '@repo/projections';
import type { Metric } from '@repo/projections';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';

export const Route = createFileRoute('/_dashboard/admin/metrics')({
  component: MetricsPage,
});

const SLICE_OPTIONS = [
  { value: '', label: 'None (identifier)' },
  { value: 'CTP', label: 'CTP' },
  { value: 'CTD', label: 'CTD' },
  { value: 'CTC', label: 'CTC' },
  { value: 'F', label: 'Forecast' },
  { value: 'Est', label: 'Estimate' },
];

const FIELD_OPTIONS = [
  { value: 'qty', label: 'Quantity' },
  { value: 'hours', label: 'Hours' },
  { value: 'cost', label: 'Cost' },
  { value: 'uc', label: 'Unit Cost' },
  { value: 'mpu', label: 'Man-Per-Unit' },
  { value: 'upm', label: 'Units-Per-Man' },
  { value: 'service', label: 'Service ID' },
  { value: 'costType', label: 'Cost Type' },
  { value: 'description', label: 'Description' },
  { value: 'unitOfMeasure', label: 'Unit of Measure' },
];

function MetricsPage() {
  const catalog = useStore((s) => s.metricsCatalog);
  const addMetric = useStore((s) => s.addMetricToStore);
  const removeMetric = useStore((s) => s.removeMetricFromStore);
  const updateMetric = useStore((s) => s.updateMetricInStore);
  const [editing, setEditing] = useState<Metric | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleNew = () => {
    setEditing({
      id: uid(),
      name: '',
      aliases: [],
      sliceGroup: null,
      field: 'qty',
      kind: 'raw',
      formula: null,
      formulaRefs: [],
    });
    setIsNew(true);
  };

  const handleEdit = (metric: Metric) => {
    setEditing({ ...metric });
    setIsNew(false);
  };

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      addMetric(editing);
    } else {
      updateMetric(editing.id, editing);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    const refs = catalog.metrics.filter((m) => m.formulaRefs.includes(id));
    if (refs.length > 0) {
      alert(`Cannot delete: referenced by ${refs.map((m) => m.name).join(', ')}`);
      return;
    }
    removeMetric(id);
  };

  const columnHelper = createColumnHelper<Metric>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Metric" />,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('sliceGroup', {
        id: 'sliceGroup',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Slice" />,
        cell: (info) => {
          const v = info.getValue();
          return v ? <Badge variant="outline">{v}</Badge> : <span className="text-muted-foreground">—</span>;
        },
        size: 100,
      }),
      columnHelper.accessor('field', {
        id: 'field',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Field" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
        size: 140,
      }),
      columnHelper.accessor('kind', {
        id: 'kind',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Kind" />,
        cell: (info) => (
          <Badge variant={info.getValue() === 'formula' ? 'secondary' : 'outline'}>
            {info.getValue()}
          </Badge>
        ),
        size: 100,
      }),
      columnHelper.accessor('formula', {
        id: 'formula',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Formula" />,
        cell: (info) => {
          const v = info.getValue();
          return v
            ? <code className="text-xs bg-muted px-2 py-0.5 rounded">{v}</code>
            : <span className="text-muted-foreground">—</span>;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => null,
        cell: (info) => {
          const metric = info.row.original;
          return (
            <div className="flex gap-1">
              <button className="text-muted-foreground hover:text-foreground p-1" onClick={(e) => { e.stopPropagation(); handleEdit(metric); }}>
                <Pencil className="size-3.5" />
              </button>
              <button className="text-muted-foreground hover:text-destructive p-1" onClick={(e) => { e.stopPropagation(); handleDelete(metric.id); }}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        },
        size: 70,
      }),
    ],
    [columnHelper],
  );

  return (
    <>
      <DataListShell
        data={catalog.metrics}
        columns={columns}
        searchPlaceholder="Search metrics..."
        searchableKeys={['name', 'field', 'formula']}
        filters={[
          {
            id: 'kind',
            label: 'Kind',
            options: [
              { value: 'raw', label: 'Raw' },
              { value: 'formula', label: 'Formula' },
            ],
          },
          {
            id: 'sliceGroup',
            label: 'Slice',
            options: SLICE_OPTIONS.filter((o) => o.value).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          },
        ]}
        emptyMessage="No metrics yet. They'll appear here as you upload spreadsheets, or you can create them manually."
        actions={
          <Button onClick={handleNew}>
            <Plus />
            New Metric
          </Button>
        }
      />

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isNew ? 'New Metric' : 'Edit Metric'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. F Cost"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Aliases (comma-separated)</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.aliases.join(', ')}
                  onChange={(e) => setEditing({ ...editing, aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Forecast Cost, Proj Cost"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Slice Group</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={editing.sliceGroup ?? ''}
                    onChange={(e) => setEditing({ ...editing, sliceGroup: (e.target.value || null) as Metric['sliceGroup'] })}
                  >
                    {SLICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Field</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={editing.field}
                    onChange={(e) => setEditing({ ...editing, field: e.target.value as Metric['field'] })}
                  >
                    {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Kind</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as 'raw' | 'formula' })}
                >
                  <option value="raw">Raw data</option>
                  <option value="formula">Formula</option>
                </select>
              </div>
              {editing.kind === 'formula' && (
                <div>
                  <label className="text-sm font-medium">Formula</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                    value={editing.formula ?? ''}
                    onChange={(e) => setEditing({ ...editing, formula: e.target.value || null })}
                    placeholder="= F Cost / F Qty"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!editing.name.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
