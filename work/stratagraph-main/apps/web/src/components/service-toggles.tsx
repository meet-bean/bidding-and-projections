import { useMemo, useState } from 'react';
import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui';
import { Plus } from 'lucide-react';
import { useStore } from '~/lib/store';
import { DAILY_CODE_META } from '~/data/service-catalog';
import type { DailyCode, Job } from '~/lib/types';

/**
 * Service toggles — plain section, no card wrapper.
 *  - Running services render as solid green pills with a small "ON" dot.
 *  - The trailing "+ Turn on service" outline pill opens a popover with
 *    inactive bid services. Newly-added services begin running today.
 *  - Modifiers (OBM etc.) get a subtler muted treatment.
 */
export function ServiceToggles({ job }: { job: Job }) {
  const bid = useStore((s) => s.getBid(job.bidId));
  const catalog = useStore((s) => s.serviceCatalog);
  const startService = useStore((s) => s.startService);
  const endService = useStore((s) => s.endService);
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isReadOnly = job.status === 'completed' || job.status === 'cancelled';

  const bidCodes = useMemo(() => {
    if (!bid) return [] as { code: DailyCode; name: string; kind: 'service' | 'modifier' }[];
    const out: { code: DailyCode; name: string; kind: 'service' | 'modifier' }[] = [];
    const seen = new Set<DailyCode>();
    for (const li of bid.services) {
      const c = catalog.find((x) => x.id === li.catalogItemId);
      if (!c?.dailyCode || c.billingUnit !== 'per_day') continue;
      if (seen.has(c.dailyCode)) continue;
      seen.add(c.dailyCode);
      const meta = DAILY_CODE_META.find((m) => m.code === c.dailyCode);
      if (!meta) continue;
      out.push({ code: c.dailyCode, name: meta.label, kind: meta.kind });
    }
    return out;
  }, [bid, catalog]);

  const runningCodes = useMemo(() => {
    const out = new Set<DailyCode>();
    for (const r of job.serviceRuns) {
      if (r.endDate && r.endDate < today) continue;
      out.add(r.code);
    }
    return out;
  }, [job.serviceRuns, today]);

  const running = bidCodes.filter((c) => runningCodes.has(c.code));
  const inactive = bidCodes.filter((c) => !runningCodes.has(c.code));

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Services</h2>
      <div className="flex flex-wrap items-center gap-2">
        {running.map((it) => (
          <button
            key={it.code}
            type="button"
            disabled={isReadOnly}
            onClick={() => endService(job.id, it.code, today)}
            aria-label={`Turn off ${it.name}`}
            className={cn(
              'group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              it.kind === 'modifier'
                ? 'bg-strat-gold/15 text-strat-gold border-strat-gold/40 border'
                : 'bg-strat-green text-white shadow-sm',
              'hover:opacity-90',
              isReadOnly && 'cursor-not-allowed opacity-60'
            )}
          >
            <span
              className={cn(
                'inline-block size-1.5 shrink-0 rounded-full',
                it.kind === 'modifier' ? 'bg-strat-gold' : 'bg-white/80'
              )}
              aria-hidden
            />
            <span className="font-mono text-[10px] font-bold tracking-wider">
              {it.code === 'GAS_M' ? 'GAS M' : it.code}
            </span>
            <span className="truncate">{it.name}</span>
            {!isReadOnly ? (
              <span
                className="ml-1 text-[10px] font-bold opacity-60 transition-opacity group-hover:opacity-100"
                aria-hidden
              >
                ✕
              </span>
            ) : null}
          </button>
        ))}

        {!isReadOnly && inactive.length > 0 ? (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <Plus className="size-3.5" />
                  Turn on service
                </button>
              }
            />
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search services…" className="h-9" />
                <CommandList>
                  <CommandEmpty>No more services on this bid.</CommandEmpty>
                  <CommandGroup heading="Available on this bid">
                    {inactive.map((it) => (
                      <CommandItem
                        key={it.code}
                        value={`${it.code} ${it.name}`}
                        onSelect={() => {
                          startService(job.id, it.code, today);
                          setPickerOpen(false);
                        }}
                        className="gap-2"
                      >
                        <span
                          className={cn(
                            'inline-flex h-5 min-w-[44px] items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
                            it.kind === 'modifier'
                              ? 'bg-strat-gold/15 text-strat-gold'
                              : 'bg-strat-green/15 text-strat-green'
                          )}
                        >
                          {it.code === 'GAS_M' ? 'GAS M' : it.code}
                        </span>
                        <span className="truncate text-xs">{it.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : null}

        {running.length === 0 && (isReadOnly || inactive.length === 0) ? (
          <span className="text-muted-foreground text-xs italic">
            No services running.
          </span>
        ) : null}
      </div>
    </section>
  );
}
