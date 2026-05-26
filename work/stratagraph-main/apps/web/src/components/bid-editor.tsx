import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from '@repo/ui';
import { Save, X, Lock } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '~/lib/store';
import { CATEGORY_LABELS, SERVICE_CATALOG } from '~/data/service-catalog';
import type {
  Bid,
  BidLineItem,
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
  /** Stable id when carried over from an existing line item. */
  lineItemId?: string;
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
    bid?.lineItems.forEach((li) => {
      out[li.catalogItemId] = {
        lineItemId: li.id,
        catalogItemId: li.catalogItemId,
        rate: li.rate,
      };
    });
    return out;
  });

  const itemsByCategory = useMemo(() => {
    const out: Record<ServiceCategory, ServiceCatalogItem[]> = {
      logging: [],
      xrf_ftir: [],
      real_time: [],
      cuttings: [],
      unmanned_gas: [],
    };
    SERVICE_CATALOG.forEach((item) => out[item.category].push(item));
    return out;
  }, []);

  const selectedCounts = useMemo(() => {
    const counts: Record<ServiceCategory, number> = {
      logging: 0,
      xrf_ftir: 0,
      real_time: 0,
      cuttings: 0,
      unmanned_gas: 0,
    };
    for (const cid of Object.keys(lines)) {
      const item = SERVICE_CATALOG.find((i) => i.id === cid);
      if (item) counts[item.category]++;
    }
    return counts;
  }, [lines]);

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
    if (totalSelected === 0) return 'Add at least one line item.';
    for (const l of Object.values(lines)) {
      if (l.rate == null || Number.isNaN(l.rate)) {
        const item = SERVICE_CATALOG.find((i) => i.id === l.catalogItemId);
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
    const lineItems: BidLineItem[] = Object.values(lines).map((l, i) => ({
      id: l.lineItemId ?? `li-${Date.now().toString(36)}-${i}`,
      catalogItemId: l.catalogItemId,
      rate: l.rate ?? 0,
    }));
    if (isEditing && bid) {
      updateBid(bid.id, {
        lineItems,
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
        lineItems,
        wellId: wellId || undefined,
      });
      navigate({ to: '/bids/$bidId', params: { bidId: id } });
    }
  };

  if (isLocked) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <Lock className="size-4" />
          This bid is accepted and locked. Create a revision to change rates.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Bid' : 'New Bid'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Customer
            </label>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                setWellId('');
              }}
              disabled={!!lockedCustomerId || isEditing}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Pick a customer">
                  {(v: string) => customers.find((c) => c.id === v)?.name ?? 'Pick a customer'}
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
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Well
            </label>
            <Select
              value={wellId}
              onValueChange={(v) => setWellId(v)}
              disabled={!customerId || wellsForCustomer.length === 0}
            >
              <SelectTrigger className="bg-background">
                <SelectValue
                  placeholder={
                    !customerId
                      ? 'Pick customer first'
                      : wellsForCustomer.length === 0
                        ? 'No wells on customer'
                        : 'Pick a well'
                  }
                >
                  {(v: string) =>
                    wellsForCustomer.find((w) => w.id === v)?.name ?? 'Pick a well'
                  }
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
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Salesperson
            </label>
            <Select value={salesperson} onValueChange={(v) => setSalesperson(v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Pick a salesperson">
                  {(v: string) =>
                    users.find((u) => u.name === v || u.id === v)?.name ?? v ?? 'Pick'
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
          <div className="space-y-1.5 sm:col-span-3">
            <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Negotiation notes, customer asks, etc."
            />
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Services</CardTitle>
          <div className="text-muted-foreground text-sm">
            <span className="text-foreground font-semibold">{totalSelected}</span> line item
            {totalSelected === 1 ? '' : 's'} selected
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={[]} className="w-full">
            {CATEGORY_ORDER.map((cat) => {
              const items = itemsByCategory[cat];
              const selected = selectedCounts[cat];
              return (
                <AccordionItem key={cat} value={cat}>
                  <AccordionTrigger>
                    <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <Badge variant={selected > 0 ? 'default' : 'outline'} className="text-xs">
                        {selected} / {items.length} selected
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CategoryTable
                      items={items}
                      lines={lines}
                      onToggle={toggleItem}
                      onRateChange={setLineRate}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
        <div className="text-sm">
          <span className="font-semibold">{totalSelected}</span>{' '}
          <span className="text-muted-foreground">line items selected</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate({ to: '/bids' })}>
            <X />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save />
            {isEditing ? 'Save bid' : 'Save bid'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryTable({
  items,
  lines,
  onToggle,
  onRateChange,
}: {
  items: ServiceCatalogItem[];
  lines: Record<string, DraftLine>;
  onToggle: (item: ServiceCatalogItem) => void;
  onRateChange: (catalogItemId: string, rate: number | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            <th className="w-10 p-2"></th>
            <th className="p-2 text-left">Service</th>
            <th className="w-28 p-2 text-right">Catalog rate</th>
            <th className="w-32 p-2 text-right">Bid rate</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = !!lines[item.id];
            const draft = lines[item.id];
            const hasNumericDefault = item.defaultRate != null;
            return (
              <tr
                key={item.id}
                className={cn(
                  'hover:bg-muted/30 border-b last:border-b-0',
                  selected && 'bg-primary/5'
                )}
              >
                <td className="p-2 align-top">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(item)}
                    aria-label={`Include ${item.name}`}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                </td>
                <td className="p-2 align-top text-sm">
                  <div className="leading-snug">{item.name}</div>
                </td>
                <td className="p-2 align-top text-right text-sm tabular-nums">
                  {hasNumericDefault ? (
                    <span className="text-muted-foreground">
                      $
                      {(item.defaultRate ?? 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">
                      {item.rateNote ?? '—'}
                    </span>
                  )}
                </td>
                <td className="p-2 align-top text-right">
                  {selected ? (
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={draft?.rate ?? ''}
                      onChange={(e) =>
                        onRateChange(
                          item.id,
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder={hasNumericDefault ? String(item.defaultRate) : 'Negotiated'}
                      className="h-8 w-28 text-right text-xs tabular-nums"
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
