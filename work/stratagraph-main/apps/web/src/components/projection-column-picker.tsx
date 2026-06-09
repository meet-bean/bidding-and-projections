'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, Badge } from '@repo/ui';
import { Columns3 } from 'lucide-react';
import type { MetricsCatalog } from '@repo/projections';
import { buildMetricColumns } from '@repo/projections';

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
  const isVisible = (id: string) => vis[id] ?? true;
  const reset = () => setVis(defaultsFor(catalog));
  const activeCount = Object.values(vis).filter(Boolean).length;

  return { vis, toggle, isVisible, reset, activeCount };
}

export function ColumnPicker({
  catalog,
  vis,
  onToggle,
  onReset,
  activeCount,
}: {
  catalog: MetricsCatalog;
  vis: ColumnVisibility;
  onToggle: (id: string) => void;
  onReset: () => void;
  activeCount: number;
}) {
  const cols = buildMetricColumns(catalog);
  const groups = [...catalog.groups, { id: '__null', name: 'Analytics', color: '#e5e5e5' }];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Columns3 className="size-3.5" /> Columns
          <Badge variant="secondary" className="ml-1 px-1.5 text-xs">{activeCount}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 max-h-[70vh] overflow-auto">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Visible Columns</span>
          <Button size="sm" variant="ghost" onClick={onReset} className="text-xs h-7">
            Reset
          </Button>
        </div>
        <div className="space-y-3">
          {groups.map((g) => {
            const groupCols = cols.filter((c) => (c.group ?? '__null') === g.id);
            if (groupCols.length === 0) return null;
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="size-3 rounded-sm" style={{ background: g.color }} />
                  {g.name}
                </div>
                <div className="ml-5 flex flex-wrap gap-1.5">
                  {groupCols.map((c) => {
                    const on = vis[c.id] ?? true;
                    return (
                      <button
                        key={c.id}
                        onClick={() => onToggle(c.id)}
                        className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${on ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}
                      >
                        {c.name}
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
