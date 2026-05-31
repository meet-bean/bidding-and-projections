import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, useCallback } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';
import type { CustomRendererProps } from '@repo/ui';
import { Plus, Trash2, Pencil, Check, X, Info } from 'lucide-react';
import { useStore } from '~/lib/store';
import { uid } from '@repo/projections';
import type { Metric, MetricGroup, MetricType, MetricFallback } from '@repo/projections';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';

export const Route = createFileRoute('/_dashboard/admin/metrics')({
  component: MetricsPage,
});

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

const TYPE_OPTIONS: { value: MetricType; label: string }[] = [
  { value: 'vista-upload', label: 'Vista Upload' },
  { value: 'formula', label: 'Formula' },
  { value: 'carry-over', label: 'Carry-over' },
];

const TYPE_LABELS: Record<MetricType, string> = {
  'vista-upload': 'Vista Upload',
  'formula': 'Formula',
  'carry-over': 'Carry-over',
};

const PRESET_COLORS = [
  '#e8f0fe', '#fef7e0', '#e6f4ea', '#fce8e6', '#f3e8fd',
  '#e0f2f1', '#fff3e0', '#fce4ec', '#e8eaf6', '#f1f8e9',
];

function GroupFilterContent({ values, onChange }: CustomRendererProps<string>) {
  const catalog = useStore((s) => s.metricsCatalog);
  const addGroup = useStore((s) => s.addGroupToStore);
  const updateGroup = useStore((s) => s.updateGroupInStore);
  const removeGroup = useStore((s) => s.removeGroupFromStore);
  const [editing, setEditing] = useState<MetricGroup | null>(null);
  const [isNew, setIsNew] = useState(false);
  const selectedSet = useMemo(() => new Set(values), [values]);

  const toggle = (groupId: string) => {
    const next = new Set(selectedSet);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    onChange(Array.from(next));
  };

  const handleNew = () => {
    setEditing({ id: uid(), name: '', color: PRESET_COLORS[catalog.groups.length % PRESET_COLORS.length]! });
    setIsNew(true);
  };

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      addGroup(editing);
    } else {
      updateGroup(editing.id, { name: editing.name, color: editing.color });
    }
    setEditing(null);
  };

  const handleDelete = (groupId: string) => {
    const metricsInGroup = catalog.metrics.filter((m) => m.group === groupId);
    if (metricsInGroup.length > 0) {
      if (!confirm(`${metricsInGroup.length} metrics will be ungrouped. Continue?`)) return;
    }
    removeGroup(groupId);
  };

  return (
    <>
      <div className="flex max-h-[300px] flex-col overflow-hidden">
        {catalog.groups.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No groups yet.
          </div>
        ) : (
          <div className="overflow-y-auto py-1">
            {catalog.groups.map((g) => {
              const selected = selectedSet.has(g.id);
              const count = catalog.metrics.filter((m) => m.group === g.id).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-default select-none"
                  onClick={() => toggle(g.id)}
                >
                  <Checkbox checked={selected} tabIndex={-1} className="pointer-events-none" />
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="flex-1 text-left truncate">{g.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                  <span
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setEditing({ ...g }); setIsNew(false); }}
                  >
                    <Pencil className="size-3" />
                  </span>
                  <span
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    role="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                  >
                    <Trash2 className="size-3" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="border-t px-3 py-2">
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={handleNew}
          >
            + New Group
          </button>
        </div>
      </div>

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{isNew ? 'New Group' : 'Edit Group'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Forecast"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className="size-8 rounded-md border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: editing.color === c ? '#333' : c,
                        transform: editing.color === c ? 'scale(1.15)' : undefined,
                      }}
                      onClick={() => setEditing({ ...editing, color: c })}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    className="size-8 cursor-pointer rounded border-0 p-0"
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground font-mono">{editing.color}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="text-sm text-muted-foreground">Preview:</span>
                <div className="flex-1 rounded px-3 py-1 text-sm font-medium" style={{ backgroundColor: editing.color }}>
                  {editing.name || 'Group Name'}
                </div>
              </div>
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

function MetricsPage() {
  const catalog = useStore((s) => s.metricsCatalog);
  const addMetric = useStore((s) => s.addMetricToStore);
  const removeMetric = useStore((s) => s.removeMetricFromStore);
  const updateMetric = useStore((s) => s.updateMetricInStore);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Metric | null>(null);
  const [newMetric, setNewMetric] = useState<Metric | null>(null);

  const groupFilterRenderer = useMemo(
    () => (props: CustomRendererProps<string>) => <GroupFilterContent {...props} />,
    [],
  );

  const groupOptions = useMemo(() => [
    { value: '', label: 'None' },
    ...catalog.groups.map((g) => ({ value: g.id, label: g.name })),
  ], [catalog.groups]);

  const metricOptions = useMemo(() =>
    catalog.metrics.map((m) => ({ value: m.id, label: m.name })),
  [catalog.metrics]);

  const handleNew = () => {
    setNewMetric({
      id: uid(),
      name: '',
      aliases: [],
      group: null,
      field: 'qty',
      type: 'vista-upload',
      formula: null,
      formulaRefs: [],
    });
  };

  const handleNewSave = () => {
    if (!newMetric || !newMetric.name.trim()) return;
    addMetric(newMetric);
    setNewMetric(null);
  };

  const startEdit = useCallback((metric: Metric) => {
    setEditingId(metric.id);
    setDraft({ ...metric });
  }, []);

  const saveEdit = useCallback(() => {
    if (!draft || !draft.name.trim()) return;
    updateMetric(draft.id, draft);
    setEditingId(null);
    setDraft(null);
  }, [draft, updateMetric]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(null);
  }, []);

  const handleDelete = (id: string) => {
    const refs = catalog.metrics.filter((m) => m.formulaRefs.includes(id));
    if (refs.length > 0) {
      alert(`Cannot delete: referenced by ${refs.map((m) => m.name).join(', ')}`);
      return;
    }
    removeMetric(id);
    if (editingId === id) cancelEdit();
  };

  const inputClass = 'w-full rounded border px-2 py-0.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring';
  const selectClass = 'w-full rounded border px-1 py-0.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring';

  const columnHelper = createColumnHelper<Metric>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Metric" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            return (
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                autoFocus
              />
            );
          }
          return <span className="font-medium">{info.getValue()}</span>;
        },
      }),
      columnHelper.accessor('group', {
        id: 'group',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Group" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            return (
              <select
                className={selectClass}
                value={draft.group ?? ''}
                onChange={(e) => setDraft({ ...draft, group: e.target.value || null })}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
              >
                {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          }
          const v = info.getValue();
          if (!v) return <span className="text-muted-foreground">—</span>;
          const grp = catalog.groups.find((g) => g.id === v);
          return (
            <Badge variant="outline" style={grp ? { backgroundColor: grp.color, borderColor: grp.color } : undefined}>
              {grp?.name ?? v}
            </Badge>
          );
        },
        size: 140,
      }),
      columnHelper.accessor('aliases', {
        id: 'aliases',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Aliases" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            return (
              <input
                className={inputClass}
                value={draft.aliases.join(', ')}
                onChange={(e) => setDraft({ ...draft, aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                placeholder="comma-separated"
              />
            );
          }
          const aliases = info.getValue();
          if (!aliases.length) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {aliases.map((a) => (
                <Badge key={a} variant="outline" className="text-[10px] font-normal">{a}</Badge>
              ))}
            </div>
          );
        },
        size: 200,
      }),
      columnHelper.accessor('field', {
        id: 'field',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Field" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            return (
              <select
                className={selectClass}
                value={draft.field}
                onChange={(e) => setDraft({ ...draft, field: e.target.value as Metric['field'] })}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
              >
                {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          }
          return <span className="text-sm">{info.getValue()}</span>;
        },
        size: 140,
      }),
      columnHelper.accessor('type', {
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            return (
              <select
                className={selectClass}
                value={draft.type}
                onChange={(e) => {
                  const newType = e.target.value as MetricType;
                  const updates: Partial<Metric> = { type: newType };
                  if (newType !== 'carry-over') {
                    updates.carryOverSource = undefined;
                  }
                  if (newType !== 'formula') {
                    updates.formula = null;
                    updates.formulaRefs = [];
                  }
                  setDraft({ ...draft, ...updates });
                }}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          }
          const t = info.getValue();
          return (
            <Badge variant={t === 'formula' ? 'secondary' : t === 'carry-over' ? 'default' : 'outline'}>
              {TYPE_LABELS[t]}
            </Badge>
          );
        },
        size: 120,
      }),
      columnHelper.accessor('formula', {
        id: 'rule',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Rule" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            if (draft.type === 'formula') {
              return (
                <input
                  className={`${inputClass} font-mono`}
                  value={draft.formula ?? ''}
                  onChange={(e) => setDraft({ ...draft, formula: e.target.value || null })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  placeholder="= F.cost / F.qty"
                />
              );
            }
            if (draft.type === 'carry-over') {
              return (
                <select
                  className={selectClass}
                  value={draft.carryOverSource ?? ''}
                  onChange={(e) => setDraft({ ...draft, carryOverSource: e.target.value || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                >
                  <option value="">Select source...</option>
                  {metricOptions.filter((m) => m.value !== metric.id).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              );
            }
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          if (metric.type === 'formula' && metric.formula) {
            return <code className="text-xs bg-muted px-2 py-0.5 rounded">{metric.formula}</code>;
          }
          if (metric.type === 'carry-over' && metric.carryOverSource) {
            const source = catalog.metrics.find((m) => m.id === metric.carryOverSource);
            return (
              <span className="text-xs">
                <span className="text-muted-foreground">from prev </span>
                <Badge variant="outline" className="text-[10px]">{source?.name ?? metric.carryOverSource}</Badge>
              </span>
            );
          }
          return <span className="text-muted-foreground">—</span>;
        },
      }),
      columnHelper.display({
        id: 'fallback',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Fallback" />,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id && draft) {
            if (draft.type === 'vista-upload') {
              return <span className="text-muted-foreground text-xs">—</span>;
            }
            return (
              <select
                className={selectClass}
                value={draft.fallback?.type ?? ''}
                onChange={(e) => {
                  const fbType = e.target.value as MetricType | '';
                  setDraft({
                    ...draft,
                    fallback: fbType ? { type: fbType as MetricType } : undefined,
                  });
                }}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
              >
                <option value="">None</option>
                {TYPE_OPTIONS.filter((o) => o.value !== metric.type).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            );
          }
          if (!metric.fallback) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant="outline" className="text-[10px]">
              {TYPE_LABELS[metric.fallback.type]}
            </Badge>
          );
        },
        size: 120,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => null,
        cell: (info) => {
          const metric = info.row.original;
          if (editingId === metric.id) {
            return (
              <div className="flex gap-1">
                <button className="text-success hover:text-success/80 p-1" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>
                  <Check className="size-3.5" />
                </button>
                <button className="text-muted-foreground hover:text-foreground p-1" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>
                  <X className="size-3.5" />
                </button>
              </div>
            );
          }
          return (
            <div className="flex gap-1">
              <button className="text-muted-foreground hover:text-foreground p-1" onClick={(e) => { e.stopPropagation(); startEdit(metric); }}>
                <Pencil className="size-3.5" />
              </button>
              <button className="text-muted-foreground hover:text-destructive p-1" onClick={(e) => { e.stopPropagation(); handleDelete(metric.id); }}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        },
        size: 80,
      }),
    ],
    [columnHelper, catalog, editingId, draft, groupOptions, metricOptions, saveEdit, cancelEdit, startEdit],
  );

  return (
    <>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        <Info className="size-4 mt-0.5 shrink-0" />
        <div>
          <strong>Carry-over metrics</strong> auto-populate from the previous month's data.
          If a Vista upload has different values, those override the carry-forward.
          You can configure the source and fallback behavior per metric.
        </div>
      </div>

      <DataListShell
        data={catalog.metrics}
        columns={columns}
        searchPlaceholder="Search metrics..."
        searchableKeys={['name', 'field', 'formula']}
        filters={[
          {
            id: 'type',
            label: 'Type',
            options: TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          },
          {
            id: 'group',
            label: 'Group',
            options: catalog.groups.map((g) => ({
              value: g.id,
              label: g.name,
            })),
            customRenderer: groupFilterRenderer,
          },
        ]}
        onRowDoubleClick={startEdit}
        defaultPageSize={9999}
        emptyMessage="No metrics yet. They'll appear here as you upload spreadsheets, or you can create them manually."
        actions={
          <Button onClick={handleNew}>
            <Plus />
            New Metric
          </Button>
        }
      />

      {newMetric && (
        <Dialog open onOpenChange={(open) => !open && setNewMetric(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Metric</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={newMetric.name}
                  onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
                  placeholder="e.g. F Cost"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Aliases (comma-separated)</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={newMetric.aliases.join(', ')}
                  onChange={(e) => setNewMetric({ ...newMetric, aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Forecast Cost, Proj Cost"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Group</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={newMetric.group ?? ''}
                    onChange={(e) => setNewMetric({ ...newMetric, group: e.target.value || null })}
                  >
                    {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Field</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={newMetric.field}
                    onChange={(e) => setNewMetric({ ...newMetric, field: e.target.value as Metric['field'] })}
                  >
                    {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={newMetric.type}
                  onChange={(e) => {
                    const t = e.target.value as MetricType;
                    setNewMetric({
                      ...newMetric,
                      type: t,
                      formula: t === 'formula' ? newMetric.formula : null,
                      formulaRefs: t === 'formula' ? newMetric.formulaRefs : [],
                      carryOverSource: t === 'carry-over' ? newMetric.carryOverSource : undefined,
                    });
                  }}
                >
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {newMetric.type === 'formula' && (
                <div>
                  <label className="text-sm font-medium">Formula</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                    value={newMetric.formula ?? ''}
                    onChange={(e) => setNewMetric({ ...newMetric, formula: e.target.value || null })}
                    placeholder="= F.cost / F.qty"
                  />
                </div>
              )}
              {newMetric.type === 'carry-over' && (
                <div>
                  <label className="text-sm font-medium">Carry from (previous month)</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={newMetric.carryOverSource ?? ''}
                    onChange={(e) => setNewMetric({ ...newMetric, carryOverSource: e.target.value || undefined })}
                  >
                    <option value="">Select source metric...</option>
                    {metricOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              {newMetric.type !== 'vista-upload' && (
                <div>
                  <label className="text-sm font-medium">Fallback</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={newMetric.fallback?.type ?? ''}
                    onChange={(e) => {
                      const fbType = e.target.value as MetricType | '';
                      setNewMetric({
                        ...newMetric,
                        fallback: fbType ? { type: fbType as MetricType } : undefined,
                      });
                    }}
                  >
                    <option value="">None</option>
                    {TYPE_OPTIONS.filter((o) => o.value !== newMetric.type).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewMetric(null)}>Cancel</Button>
              <Button onClick={handleNewSave} disabled={!newMetric.name.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
