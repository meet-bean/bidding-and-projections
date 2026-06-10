'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@repo/ui';
import { Columns3, Check, Minus } from 'lucide-react';
import type { MetricsCatalog } from '@repo/projections';
import { buildMetricColumns } from '@repo/projections';

/**
 * Drop the group's slice prefix so each pill shows just the field, e.g.
 * "CTP Cost" → "Cost" (the slice lives in the group header instead). Names
 * that don't carry the prefix (analytics, "Calc Hrs") are left untouched.
 */
function shortLabel(name: string, groupId: string): string {
  return groupId && name.startsWith(`${groupId} `) ? name.slice(groupId.length + 1) : name;
}

function GroupCheck({ state }: { state: 'all' | 'some' | 'none' }) {
  return (
    <span
      className={cn(
        'flex size-3.5 items-center justify-center rounded-[3px] border',
        state === 'all'
          ? 'border-primary bg-primary text-primary-foreground'
          : state === 'some'
            ? 'border-primary text-primary'
            : 'border-muted-foreground/40',
      )}
    >
      {state === 'all' ? <Check className="size-2.5" /> : state === 'some' ? <Minus className="size-2.5" /> : null}
    </span>
  );
}

export type ColumnVisibility = Record<string, boolean>;

const STORAGE_KEY = 'sc-visible-columns-v2'; // v2 = metric-id keys (old slice-field keys ignored)

// Default-visible metric ids (replicates the prior default layout).
const DEFAULT_VISIBLE = new Set([
  'ctd-cost', 'ctd-hrs', 'f-qty', 'f-hrs', 'f-uc', 'oe-cost', 'lmf',
]);

function defaultsFor(catalog: MetricsCatalog): ColumnVisibility {
  const vis: ColumnVisibility = {};
  for (const c of buildMetricColumns(catalog)) vis[c.id] = DEFAULT_VISIBLE.has(c.id);
  return vis;
}

export function useColumnVisibility(catalog: MetricsCatalog) {
  // Start from defaults so the first client render matches the server-rendered
  // HTML (localStorage is unavailable during SSR). The persisted layout is
  // loaded after mount, avoiding a hydration mismatch.
  const [vis, setVis] = useState<ColumnVisibility>(() => defaultsFor(catalog));
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const base = defaultsFor(catalog);
      setVis(stored ? { ...base, ...JSON.parse(stored) } : base);
    } catch {
      setVis(defaultsFor(catalog));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New metrics not yet in `vis` default to VISIBLE.
  useEffect(() => {
    setVis((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of buildMetricColumns(catalog)) {
        if (!(c.id in next)) {
          next[c.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [catalog]);

  useEffect(() => {
    // Skip the initial defaults render so we don't clobber the stored layout
    // before it has been loaded above.
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
  }, [vis]);

  const toggle = (id: string) => setVis((p) => ({ ...p, [id]: !p[id] }));
  // Set many columns to an explicit value at once (used by per-group select-all).
  const setVisible = (ids: string[], value: boolean) =>
    setVis((p) => {
      const next = { ...p };
      for (const id of ids) next[id] = value;
      return next;
    });
  const isVisible = (id: string) => vis[id] ?? true;
  const reset = () => setVis(defaultsFor(catalog));
  const activeCount = Object.values(vis).filter(Boolean).length;

  return { vis, toggle, setVisible, isVisible, reset, activeCount };
}

export function ColumnPicker({
  catalog,
  vis,
  onToggle,
  onSetGroup,
  onReset,
  activeCount,
}: {
  catalog: MetricsCatalog;
  vis: ColumnVisibility;
  onToggle: (id: string) => void;
  onSetGroup: (ids: string[], value: boolean) => void;
  onReset: () => void;
  activeCount: number;
}) {
  const cols = useMemo(() => buildMetricColumns(catalog), [catalog]);
  const groups = useMemo(
    () => [...catalog.groups, { id: '__null', name: 'Analytics', color: '#e5e5e5' }],
    [catalog.groups],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Same chip anatomy AND size as the Filter trigger (Button size=xs). */}
        <Button size="xs" variant="ghost" className="gap-0.5">
          <Columns3 className="size-3.5" /> Columns
          <span className="text-muted-foreground tabular-nums ml-1">{activeCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Visible columns
          </span>
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto pb-1">
          {groups.map((g) => {
            const groupCols = cols.filter((c) => (c.group ?? '__null') === g.id);
            if (groupCols.length === 0) return null;

            const ids = groupCols.map((c) => c.id);
            const onCount = groupCols.filter((c) => vis[c.id] ?? true).length;
            const state: 'all' | 'some' | 'none' =
              onCount === groupCols.length ? 'all' : onCount === 0 ? 'none' : 'some';

            return (
              <div key={g.id} className="border-t px-3 py-2">
                {/* Group row — tri-state checkbox + micro label + quiet count. */}
                <button
                  onClick={() => onSetGroup(ids, state !== 'all')}
                  className="mb-1 flex w-full items-center gap-2 text-left"
                  title={state === 'all' ? 'Hide all in group' : 'Show all in group'}
                >
                  <GroupCheck state={state} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: g.id === '__null' ? undefined : g.color }}
                  >
                    {g.name}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {onCount}/{groupCols.length}
                  </span>
                </button>
                {/* Field toggles — quiet text items: on = foreground + check,
                    off = dimmed. No fills, no pills. */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-[22px]">
                  {groupCols.map((c) => {
                    const on = vis[c.id] ?? true;
                    return (
                      <button
                        key={c.id}
                        onClick={() => onToggle(c.id)}
                        aria-pressed={on}
                        className={cn(
                          'flex items-center gap-1 py-0.5 text-xs whitespace-nowrap transition-colors',
                          on ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
                        )}
                      >
                        <Check className={cn('size-3', on ? 'opacity-100' : 'opacity-0')} />
                        {shortLabel(c.name, g.id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
