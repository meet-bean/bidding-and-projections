import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';
import { ArrowRight, ChevronDown, ChevronRight, Check, HardHat, Plus, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useStore } from '~/lib/store';
import { CATEGORY_LABELS, DAILY_CODE_META } from '~/data/service-catalog';
import type { DailyCode, Job, ServiceCategory } from '~/lib/types';

/**
 * One-job daily-tracking card. Header shows job summary + a services-running
 * count badge; expand to flip service toggles, set per-day crew + miles + notes,
 * and confirm the day.
 */
export function JobDayCard({
  job,
  date,
  open,
  onOpenChange,
  isActive = false,
  onConfirmAndNext,
}: {
  job: Job;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether this is the focused card in the queue (gets the ring + sticky-bar binding). */
  isActive?: boolean;
  /** When set + this card is active + unconfirmed, render a primary Confirm & next CTA at the card footer. */
  onConfirmAndNext?: () => void;
}) {
  const customer = useStore((s) => s.getCustomer(job.customerId));
  const bid = useStore((s) => s.getBid(job.bidId));
  const catalog = useStore((s) => s.serviceCatalog);
  const allUsers = useStore((s) => s.users);
  const employees = useMemo(() => allUsers.filter((u) => u.role === 'field_crew'), [allUsers]);

  const isCodeRunning = useStore((s) => s.isCodeRunning);
  const getDailyQuantity = useStore((s) => s.getDailyQuantity);
  const setDailyQuantity = useStore((s) => s.setDailyQuantity);
  const getCrewForDate = useStore((s) => s.getCrewForDate);
  const setCrewForDate = useStore((s) => s.setCrewForDate);
  const getMilesForDate = useStore((s) => s.getMilesForDate);
  const setMilesForDate = useStore((s) => s.setMilesForDate);
  const getDailyNote = useStore((s) => s.getDailyNote);
  const setDailyNote = useStore((s) => s.setDailyNote);
  const isDateConfirmed = useStore((s) => s.isDateConfirmed);

  // Flat list of daily-billable services available on this job's bid.
  // Each item has its catalog name + short label + category.
  const availableItems = useMemo(() => {
    const items: {
      catalogItemId: string;
      code: DailyCode;
      catalogName: string;
      shortLabel: string;
      kind: 'service' | 'modifier';
      category: ServiceCategory;
    }[] = [];
    const seenCodes = new Set<DailyCode>();
    if (bid) {
      for (const li of bid.lineItems) {
        const cat = catalog.find((c) => c.id === li.catalogItemId);
        if (!cat?.dailyCode || cat.billingUnit !== 'per_day') continue;
        if (seenCodes.has(cat.dailyCode)) continue;
        seenCodes.add(cat.dailyCode);
        const meta = DAILY_CODE_META.find((m) => m.code === cat.dailyCode);
        if (!meta) continue;
        items.push({
          catalogItemId: cat.id,
          code: cat.dailyCode,
          catalogName: cat.name,
          shortLabel: meta.label,
          kind: meta.kind,
          category: cat.category,
        });
      }
    }
    // Defensive fallback: surface activeCodes not on the bid.
    for (const code of job.activeCodes) {
      if (seenCodes.has(code)) continue;
      const meta = DAILY_CODE_META.find((m) => m.code === code);
      if (!meta) continue;
      items.push({
        catalogItemId: '',
        code,
        catalogName: meta.label,
        shortLabel: meta.label,
        kind: meta.kind,
        category: 'logging',
      });
    }
    return items;
  }, [bid, catalog, job.activeCodes]);

  // Don't memo — isCodeRunning reads through to the store on each call, so
  // the memo deps would miss store mutations. Cheap to recompute (n < 30).
  const running = availableItems.filter((it) => isCodeRunning(job.id, date, it.code));
  const inactive = availableItems.filter((it) => !isCodeRunning(job.id, date, it.code));
  const runningCount = running.length;

  const runningGroups = groupByCategory(running);
  const inactiveGroups = groupByCategory(inactive);

  const confirmed = isDateConfirmed(job.id, date);
  const needsConfirm = !confirmed && runningCount > 0;

  const dayCrew = getCrewForDate(job.id, date).dayLoggerId ?? job.dayLoggerId;
  const nightCrew = getCrewForDate(job.id, date).nightLoggerId ?? job.nightLoggerId;
  const dayCrewName = employees.find((e) => e.id === dayCrew)?.name;
  const nightCrewName = employees.find((e) => e.id === nightCrew)?.name;

  return (
    <div
      className={cn(
        'rounded-md border bg-background transition-all',
        'border-l-4',
        needsConfirm ? 'border-l-primary' : confirmed ? 'border-l-success/50' : 'border-l-muted',
        isActive && 'ring-primary/30 shadow-sm ring-2'
      )}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="hover:bg-muted/30 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <HardHat className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{customer?.name ?? '—'}</span>
              <span className="text-muted-foreground font-mono text-xs">{job.jobNumber}</span>
            </div>
            <div className="text-muted-foreground truncate text-xs">
              <Link
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                onClick={(e) => e.stopPropagation()}
                className="underline-offset-4 hover:underline"
              >
                {job.wellName}
              </Link>
              {!open && (dayCrewName || nightCrewName) ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span>
                    {dayCrewName ?? '—'}
                    {nightCrewName ? ` / ${nightCrewName}` : ''}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!open && running.length > 0 ? (
            <div className="hidden items-center gap-1 md:flex">
              {running.slice(0, 4).map((it) => (
                <span
                  key={it.code}
                  className={cn(
                    'inline-flex h-5 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
                    it.kind === 'modifier'
                      ? 'bg-warning/15 text-warning-foreground/80'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {it.code === 'GAS_M' ? 'GAS M' : it.code}
                </span>
              ))}
              {running.length > 4 ? (
                <span className="text-muted-foreground text-[10px] font-semibold">
                  +{running.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
          <Badge variant="outline" className="text-xs tabular-nums">
            {runningCount} of {availableItems.length}
          </Badge>
          {confirmed && runningCount > 0 ? (
            <Badge className="bg-success/15 text-success border-success/30 gap-1">
              <Check className="size-3" />
              Confirmed
            </Badge>
          ) : null}
          {open ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t p-4">
          {availableItems.length === 0 ? (
            <div className="text-muted-foreground text-xs italic">
              No daily services configured on this job's bid.
            </div>
          ) : (
            <div className="space-y-4">
              {runningGroups.map((group) => (
                <div key={group.category}>
                  <div className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
                    {CATEGORY_LABELS[group.category]}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.items.map((item) => {
                      const qty = getDailyQuantity(job.id, date, item.code);
                      return (
                        <div
                          key={item.code}
                          className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span
                            className={cn(
                              'inline-flex h-5 min-w-[44px] items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
                              item.kind === 'modifier'
                                ? 'bg-warning/15 text-warning-foreground/80'
                                : 'bg-primary/10 text-primary'
                            )}
                          >
                            {item.code === 'GAS_M' ? 'GAS M' : item.code}
                          </span>
                          <span className="flex-1 truncate text-xs leading-tight">
                            {item.catalogName}
                          </span>
                          <QtyInput
                            value={qty ?? 1}
                            onChange={(v) => setDailyQuantity(job.id, date, item.code, v)}
                          />
                          <button
                            type="button"
                            onClick={() => setDailyQuantity(job.id, date, item.code, null)}
                            aria-label={`Turn off ${item.shortLabel}`}
                            className="text-muted-foreground hover:bg-background hover:text-foreground inline-flex size-6 items-center justify-center rounded-sm"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {runningCount === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
                  No services running yet today.
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">
                  {runningCount} of {availableItems.length} services running
                </span>
                {inactive.length > 0 ? (
                  <AddServicePopover
                    inactiveGroups={inactiveGroups}
                    onAdd={(code) => setDailyQuantity(job.id, date, code, 1)}
                  />
                ) : null}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_1fr]">
            <CrewField
              label="Day Crew"
              value={getCrewForDate(job.id, date).dayLoggerId}
              jobDefault={job.dayLoggerId}
              employees={employees}
              onChange={(id) => setCrewForDate(job.id, date, 'day_logger', id)}
            />
            <MilesField
              label="Day Mi"
              value={getMilesForDate(job.id, date)?.dayLoggerMiles}
              onChange={(v) => setMilesForDate(job.id, date, 'dayLoggerMiles', v)}
            />
            <CrewField
              label="Night Crew"
              value={getCrewForDate(job.id, date).nightLoggerId}
              jobDefault={job.nightLoggerId}
              employees={employees}
              onChange={(id) => setCrewForDate(job.id, date, 'night_logger', id)}
            />
            <MilesField
              label="Night Mi"
              value={getMilesForDate(job.id, date)?.nightLoggerMiles}
              onChange={(v) => setMilesForDate(job.id, date, 'nightLoggerMiles', v)}
            />
          </div>
          <NotesField
            value={getDailyNote(job.id, date)}
            onChange={(v) => setDailyNote(job.id, date, v)}
          />

          {needsConfirm && onConfirmAndNext ? (
            <div className="bg-muted/30 -mx-4 -mb-4 mt-2 flex items-center justify-between gap-3 rounded-b-md border-t px-4 py-3">
              <span className="text-muted-foreground text-xs">
                Looks right? Confirm to lock it in and move on.
              </span>
              <Button size="default" onClick={onConfirmAndNext} className="gap-1.5">
                <Check className="size-4" />
                Confirm &amp; next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type AvailableItem = {
  catalogItemId: string;
  code: DailyCode;
  catalogName: string;
  shortLabel: string;
  kind: 'service' | 'modifier';
  category: ServiceCategory;
};

function groupByCategory(items: AvailableItem[]) {
  const order: ServiceCategory[] = [];
  const byCat = new Map<ServiceCategory, AvailableItem[]>();
  for (const it of items) {
    if (!byCat.has(it.category)) {
      byCat.set(it.category, []);
      order.push(it.category);
    }
    byCat.get(it.category)!.push(it);
  }
  return order.map((category) => ({ category, items: byCat.get(category)! }));
}

function AddServicePopover({
  inactiveGroups,
  onAdd,
}: {
  inactiveGroups: { category: ServiceCategory; items: AvailableItem[] }[];
  onAdd: (code: DailyCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const totalInactive = inactiveGroups.reduce((n, g) => n + g.items.length, 0);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            Add service
            <span className="text-muted-foreground ml-1 text-[11px] tabular-nums">
              {totalInactive}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search services…" className="h-9" />
          <CommandList>
            <CommandEmpty>No matching services.</CommandEmpty>
            {inactiveGroups.map((group) => (
              <CommandGroup key={group.category} heading={CATEGORY_LABELS[group.category]}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.code}
                    value={`${item.code} ${item.catalogName} ${item.shortLabel}`}
                    onSelect={() => onAdd(item.code)}
                    className="gap-2"
                  >
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-[44px] shrink-0 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
                        item.kind === 'modifier'
                          ? 'bg-warning/15 text-warning-foreground/80'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      {item.code === 'GAS_M' ? 'GAS M' : item.code}
                    </span>
                    <span className="truncate text-xs">{item.catalogName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function QtyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value);
  return (
    <input
      type="text"
      value={display}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft == null) return;
        const n = Number(draft.trim());
        if (Number.isFinite(n) && n > 0) onChange(n);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
      onFocus={(e) => e.target.select()}
      className="h-6 w-10 rounded border bg-background px-1 text-center text-xs font-semibold tabular-nums outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

function CrewField({
  label,
  value,
  jobDefault,
  employees,
  onChange,
}: {
  label: string;
  value?: string;
  jobDefault?: string;
  employees: { id: string; name: string; available?: boolean }[];
  onChange: (id: string | null) => void;
}) {
  const isOverride = value != null && value !== jobDefault;
  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </label>
      <Select
        value={value ?? ''}
        onValueChange={(v) => {
          if (v === '__default__') onChange(null);
          else onChange(v || null);
        }}
      >
        <SelectTrigger className={cn('h-9 w-full text-sm', isOverride && 'bg-strat-gold/5')}>
          <SelectValue placeholder="—">
            {(v: string) => employees.find((e) => e.id === v)?.name ?? '—'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {jobDefault ? (
            <SelectItem value="__default__">
              <span className="text-muted-foreground italic">Use job default</span>
            </SelectItem>
          ) : null}
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MilesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value != null ? String(value) : '');
  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </label>
      <Input
        type="number"
        min={0}
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft == null) return;
          const trimmed = draft.trim();
          if (trimmed === '') onChange(null);
          else {
            const n = Number(trimmed);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }
          setDraft(null);
        }}
        placeholder="0"
        className="h-9 tabular-nums"
      />
    </div>
  );
}

function NotesField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (text: string | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? value ?? '';
  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        Notes
      </label>
      <Input
        type="text"
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft == null) return;
          if (draft !== (value ?? '')) onChange(draft || null);
          setDraft(null);
        }}
        placeholder="Drilling progress, depth, milestones…"
        className="h-9"
      />
    </div>
  );
}
