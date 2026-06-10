import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  MinimalDataGrid,
  MINIMAL_GRID_HEADER_LABEL,
  DataGridColumnHeader,
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
} from '@repo/ui';
import { Save, X, Lock, Building2, MapPin, CircleUserRound } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '~/lib/store';
import { selectServiceCatalog } from '~/data/service-seed';
import { toServiceRows, type ServiceRow } from '~/lib/service-rows';
import { CHIP_CLASS } from '~/lib/composer';
import { formatCurrencyExact } from '~/lib/format';
import { CATEGORY_LABELS } from '~/data/service-catalog';
import { costTypeLabel } from '~/lib/cost-types';
import type {
  Bid,
  BidService,
  BidStatus,
  ServiceCategory,
  ServiceCatalogItem,
} from '~/lib/types';

const CATEGORY_ORDER: ServiceCategory[] = [
  'logging',
  'xrf_ftir',
  'real_time',
  'cuttings',
  'unmanned_gas',
];

type DraftLine = {
  /** Stable id when carried over from an existing service. */
  serviceId?: string;
  catalogItemId: string;
  rate: number | null;
};

interface Props {
  /** When set, the editor is editing this bid. Otherwise it's creating new. */
  bid?: Bid;
  /** When creating, the customer can be locked (e.g. from a customer page launch). */
  lockedCustomerId?: string;
}

export function BidEditor({ bid, lockedCustomerId }: Props) {
  const navigate = useNavigate();
  const customers = useStore((s) => s.customers);
  const users = useStore((s) => s.users);
  const services = useStore((s) => s.services);
  const metricsCatalog = useStore((s) => s.metricsCatalog);
  const catalog = selectServiceCatalog(services);
  // Same economics the admin Services screen shows (Original/Actual/Forecast UC,
  // Δ vs Bid), keyed by service id so each picker row can render them.
  const rowsById = useMemo(
    () => new Map(toServiceRows(services, metricsCatalog).map((r) => [r.id, r])),
    [services, metricsCatalog]
  );
  const createBid = useStore((s) => s.createBid);
  const updateBid = useStore((s) => s.updateBid);
  const isEditing = !!bid;
  const isLocked = bid?.status === 'accepted';

  const initialCustomerId = bid?.customerId ?? lockedCustomerId ?? '';
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [wellId, setWellId] = useState<string>(bid?.wellId ?? '');
  const [salesperson, setSalesperson] = useState(bid?.salesperson ?? '');
  const [notes, setNotes] = useState(bid?.notes ?? '');
  // Default new bids to 'sent' (labeled "Pending" in the UI). We're intentionally
  // skipping a separate "draft" stage on save — too speculative for the demo,
  // and we don't yet know the customer's delivery channel.
  const initialStatus: BidStatus = bid?.status ?? 'sent';

  const allWells = useStore((s) => s.wells);
  const wellsForCustomer = useMemo(
    () => allWells.filter((w) => w.customerId === customerId),
    [allWells, customerId]
  );

  // Lines keyed by catalog item id for quick toggle/lookup.
  const [lines, setLines] = useState<Record<string, DraftLine>>(() => {
    const out: Record<string, DraftLine> = {};
    bid?.services.forEach((li) => {
      out[li.catalogItemId] = {
        serviceId: li.id,
        catalogItemId: li.catalogItemId,
        rate: li.rate,
      };
    });
    return out;
  });

  // Group services by whatever categories actually exist in the catalog —
  // Stratagraph's known categories first (in their canonical order), then any
  // other category (e.g. Superior cost types) in catalog order. This keeps the
  // picker tenant-agnostic: it renders whatever the unified services hold.
  const itemsByCategory = useMemo(() => {
    const out = new Map<string, ServiceCatalogItem[]>();
    for (const cat of CATEGORY_ORDER) {
      if (catalog.some((i) => i.category === cat)) out.set(cat, []);
    }
    for (const item of catalog) {
      if (!out.has(item.category)) out.set(item.category, []);
      out.get(item.category)!.push(item);
    }
    return out;
  }, [catalog]);

  const selectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cid of Object.keys(lines)) {
      const item = catalog.find((i) => i.id === cid);
      if (item) counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [lines, catalog]);

  const totalSelected = Object.values(selectedCounts).reduce((s, n) => s + n, 0);

  const toggleItem = (item: ServiceCatalogItem) => {
    setLines((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = {
          catalogItemId: item.id,
          rate: item.defaultRate, // pre-fill with catalog default
        };
      }
      return next;
    });
  };

  const setLineRate = (catalogItemId: string, rate: number | null) => {
    setLines((prev) => {
      if (!prev[catalogItemId]) return prev;
      return { ...prev, [catalogItemId]: { ...prev[catalogItemId]!, rate } };
    });
  };

  const validate = (): string | null => {
    if (!customerId) return 'Pick a customer.';
    if (!salesperson) return 'Pick a salesperson.';
    if (totalSelected === 0) return 'Add at least one service.';
    for (const l of Object.values(lines)) {
      if (l.rate == null || Number.isNaN(l.rate)) {
        const item = catalog.find((i) => i.id === l.catalogItemId);
        return `Set a rate for "${item?.name ?? l.catalogItemId}".`;
      }
    }
    return null;
  };

  const handleSave = () => {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }
    const services: BidService[] = Object.values(lines).map((l, i) => ({
      id: l.serviceId ?? `li-${Date.now().toString(36)}-${i}`,
      catalogItemId: l.catalogItemId,
      rate: l.rate ?? 0,
    }));
    if (isEditing && bid) {
      updateBid(bid.id, {
        services: services,
        salesperson,
        notes,
        status: initialStatus,
        wellId: wellId || undefined,
      });
      navigate({ to: '/bids/$bidId', params: { bidId: bid.id } });
    } else {
      const id = createBid({
        customerId,
        salesperson,
        notes,
        status: initialStatus,
        services: services,
        wellId: wellId || undefined,
      });
      navigate({ to: '/bids/$bidId', params: { bidId: id } });
    }
  };

  if (isLocked) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
        <Lock className="size-4" />
        This bid is accepted and locked. Create a revision to change rates.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Linear-style composer: chromeless header — large quiet title, a row of
       * compact property chips, then a ghost notes field. No boxed form. */}
      <div className="space-y-4 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditing ? 'Edit Bid' : 'New Bid'}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={customerId}
            onValueChange={(v) => {
              setCustomerId(v);
              setWellId('');
            }}
            disabled={!!lockedCustomerId || isEditing}
          >
            <SelectTrigger className={CHIP_CLASS} aria-label="Customer">
              <Building2 className="text-muted-foreground" />
              <SelectValue placeholder="Customer">
                {(v: string) => customers.find((c) => c.id === v)?.name ?? 'Customer'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={wellId}
            onValueChange={(v) => setWellId(v)}
            disabled={!customerId || wellsForCustomer.length === 0}
          >
            <SelectTrigger className={CHIP_CLASS} aria-label="Project">
              <MapPin className="text-muted-foreground" />
              <SelectValue
                placeholder={
                  !customerId
                    ? 'Project'
                    : wellsForCustomer.length === 0
                      ? 'No projects'
                      : 'Project'
                }
              >
                {(v: string) => wellsForCustomer.find((w) => w.id === v)?.name ?? 'Project'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {wellsForCustomer.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                  {w.county ? ` · ${w.county}, ${w.state ?? ''}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={salesperson} onValueChange={(v) => setSalesperson(v)}>
            <SelectTrigger className={CHIP_CLASS} aria-label="Salesperson">
              <CircleUserRound className="text-muted-foreground" />
              <SelectValue placeholder="Salesperson">
                {(v: string) =>
                  users.find((u) => u.name === v || u.id === v)?.name ?? (v || 'Salesperson')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {users
                .filter((u) => u.role !== 'field_crew')
                .map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add notes — negotiation context, customer asks…"
          className="min-h-14 resize-none rounded-none border-none bg-transparent px-0 py-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="border-border/60 border-b" />
      </div>


      {/* De-carded Services section: micro section label + muted count, then flat
       * accordion rows (row borders only) — same quiet language as the rest of
       * the platform. Counts are muted text, never badges. */}
      <div>
        <div className="flex items-baseline justify-between pb-1">
          <h2 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            Services
          </h2>
          <div className="text-muted-foreground text-xs tabular-nums">
            <span className="text-foreground font-medium">{totalSelected}</span> selected
          </div>
        </div>
        <Accordion type="multiple" defaultValue={[]} className="w-full">
          {[...itemsByCategory.entries()].map(([cat, items]) => {
            const selected = selectedCounts[cat] ?? 0;
            // Known Stratagraph categories have canonical labels; raw Vista cost
            // type codes (e.g. "2Labor") get humanized, keeping the code as a
            // muted suffix so same-label groups (3Material/8Parts) stay distinct.
            const canonical = (CATEGORY_LABELS as Record<string, string>)[cat];
            const label = canonical ?? costTypeLabel(cat);
            return (
              <AccordionItem key={cat} value={cat}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pr-3">
                    <span className="flex items-baseline gap-2">
                      <span>{label}</span>
                      {!canonical && (
                        <span className="text-muted-foreground text-[11px] font-normal">
                          {cat}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-normal tabular-nums',
                        selected > 0 ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {selected}/{items.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CategoryTable
                    items={items}
                    lines={lines}
                    rowsById={rowsById}
                    onToggle={toggleItem}
                    onRateChange={setLineRate}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Quiet sticky action strip — no floating card, just a hairline + blur. */}
      <div className="border-border/60 bg-background/80 sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t py-3 backdrop-blur">
        <Button variant="ghost" onClick={() => navigate({ to: '/bids' })}>
          <X />
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save />
          {isEditing ? 'Save changes' : 'Save bid'}
        </Button>
      </div>
    </div>
  );
}

/** $-formatted unit cost, "—" when not available (matches the Services screen). */
function ucCell(value: number | null, uomVaries: boolean) {
  if (uomVaries)
    return <span className="text-muted-foreground text-xs italic">mixed</span>;
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="text-muted-foreground tabular-nums">
      {formatCurrencyExact(value)}
    </span>
  );
}

/** Forecast-vs-Original variance: over-bid runs warm (red), under runs cool (green). */
function varianceCell(pct: number | null) {
  if (pct == null) return <span className="text-muted-foreground text-xs">—</span>;
  const rounded = Math.round(pct);
  // Small deltas stay quiet so only real outliers pop.
  if (Math.abs(rounded) < 5)
    return (
      <span className="text-muted-foreground tabular-nums">
        {rounded > 0 ? '+' : ''}
        {rounded}%
      </span>
    );
  const over = rounded > 0;
  return (
    <span
      className={cn('font-medium tabular-nums', over ? 'text-destructive' : 'text-success')}
    >
      {over ? '+' : ''}
      {rounded}%
    </span>
  );
}

const catHelper = createColumnHelper<ServiceCatalogItem>();

/** Right-aligned micro header for numeric columns. */
function NumHeader<TData, TValue>({
  column,
  title,
}: {
  column: React.ComponentProps<typeof DataGridColumnHeader<TData, TValue>>['column'];
  title: string;
}) {
  return (
    <div className="flex w-full justify-end">
      <DataGridColumnHeader column={column} title={title} className={MINIMAL_GRID_HEADER_LABEL} />
    </div>
  );
}

/**
 * Per-category service picker, rendered on the shared MinimalDataGrid shell —
 * the exact same component the projections table uses, so the two tables are
 * literally built from one shell (spacing, typography, hover, row borders).
 * Converting to the shell also picked up column sorting for free.
 */
function CategoryTable({
  items,
  lines,
  rowsById,
  onToggle,
  onRateChange,
}: {
  items: ServiceCatalogItem[];
  lines: Record<string, DraftLine>;
  rowsById: Map<string, ServiceRow>;
  onToggle: (item: ServiceCatalogItem) => void;
  onRateChange: (catalogItemId: string, rate: number | null) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Mirror the draft lines into TanStack row-selection so the shell's
  // data-[state=selected] row styling applies.
  const rowSelection = useMemo(() => {
    const sel: Record<string, boolean> = {};
    for (const it of items) if (lines[it.id]) sel[it.id] = true;
    return sel;
  }, [items, lines]);

  const columns = useMemo(
    () => [
      catHelper.display({
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={!!lines[row.original.id]}
            onChange={() => onToggle(row.original)}
            aria-label={`Include ${row.original.name}`}
            className="h-4 w-4 cursor-pointer accent-primary"
          />
        ),
        size: 36,
      }),
      catHelper.accessor('name', {
        id: 'service',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Service" className={MINIMAL_GRID_HEADER_LABEL} />
        ),
        cell: ({ getValue }) => <span className="text-sm leading-snug">{getValue()}</span>,
        size: 320,
      }),
      catHelper.accessor((it) => rowsById.get(it.id)?.originalUC ?? null, {
        id: 'originalUC',
        header: ({ column }) => <NumHeader column={column} title="Original UC" />,
        cell: ({ row }) => {
          const r = rowsById.get(row.original.id);
          return <div className="text-right text-sm">{ucCell(r?.originalUC ?? null, r?.uomVaries ?? false)}</div>;
        },
        size: 96,
      }),
      catHelper.accessor((it) => rowsById.get(it.id)?.actualUC ?? null, {
        id: 'actualUC',
        header: ({ column }) => <NumHeader column={column} title="Actual UC" />,
        cell: ({ row }) => {
          const r = rowsById.get(row.original.id);
          return <div className="text-right text-sm">{ucCell(r?.actualUC ?? null, r?.uomVaries ?? false)}</div>;
        },
        size: 96,
      }),
      catHelper.accessor((it) => rowsById.get(it.id)?.forecastUC ?? null, {
        id: 'forecastUC',
        header: ({ column }) => <NumHeader column={column} title="Forecast UC" />,
        cell: ({ row }) => {
          const r = rowsById.get(row.original.id);
          return <div className="text-right text-sm">{ucCell(r?.forecastUC ?? null, r?.uomVaries ?? false)}</div>;
        },
        size: 96,
      }),
      catHelper.accessor((it) => rowsById.get(it.id)?.variancePct ?? null, {
        id: 'variance',
        header: ({ column }) => <NumHeader column={column} title="Δ vs Bid" />,
        cell: ({ row }) => (
          <div className="text-right text-sm">{varianceCell(rowsById.get(row.original.id)?.variancePct ?? null)}</div>
        ),
        size: 80,
      }),
      catHelper.accessor((it) => it.defaultRate ?? null, {
        id: 'catalogRate',
        header: ({ column }) => <NumHeader column={column} title="Catalog rate" />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-right text-sm tabular-nums">
              {item.defaultRate != null ? (
                <span className="text-muted-foreground">
                  {formatCurrencyExact(item.defaultRate)}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs italic">{item.rateNote ?? '—'}</span>
              )}
            </div>
          );
        },
        size: 112,
      }),
      catHelper.display({
        id: 'bidRate',
        header: ({ column }) => <NumHeader column={column} title="Bid rate" />,
        cell: ({ row }) => {
          const item = row.original;
          const draft = lines[item.id];
          if (!draft) return <div className="text-right text-muted-foreground text-xs">—</div>;
          return (
            <div className="flex justify-end">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={draft.rate ?? ''}
                onChange={(e) =>
                  onRateChange(item.id, e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder={item.defaultRate != null ? String(item.defaultRate) : 'Negotiated'}
                className="h-7 w-28 text-right text-xs tabular-nums"
              />
            </div>
          );
        },
        size: 128,
      }),
    ],
    [lines, rowsById, onToggle, onRateChange],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
    enableRowSelection: true,
  });

  return (
    <MinimalDataGrid
      table={table}
      recordCount={items.length}
      tableLayout={{ headerSticky: false }}
      tableClassNames={{ bodyRow: 'data-[state=selected]:bg-primary/5' }}
    />
  );
}
