'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, Badge } from '@repo/ui';
import { Columns3 } from 'lucide-react';

const SLICES = ['CTP', 'CTD', 'CTC', 'F', 'Est'] as const;
const STD_FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;
const F_FIELDS = ['qty', 'hours', 'calcHrs', 'upm', 'mpu', 'uc'] as const;
const META_FIELDS = ['prevForecast'] as const;

const FIELD_LABELS: Record<string, string> = {
  qty: 'Qty', hours: 'Hours', calcHrs: 'Calc Hrs', upm: 'U/MH', mpu: 'MH/U', uc: 'UC', cost: 'Cost',
  prevForecast: 'Last Month FC',
};

export type ColumnVisibility = Record<string, boolean>;

const STORAGE_KEY = 'sc-visible-columns';

const DEFAULTS: ColumnVisibility = {
  'CTD-cost': true, 'CTD-hours': true, 'F-qty': true, 'F-hours': true, 'F-uc': true,
  'Est-cost': true, 'meta-prevForecast': true,
};

function loadVisibility(): ColumnVisibility {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function fieldsForSlice(slice: string): readonly string[] {
  return slice === 'F' ? F_FIELDS : STD_FIELDS;
}

export function useColumnVisibility() {
  // Start from DEFAULTS so the first client render matches the server-rendered
  // HTML (localStorage is unavailable during SSR). The persisted layout is
  // loaded after mount, avoiding a hydration mismatch.
  const [vis, setVis] = useState<ColumnVisibility>(() => ({ ...DEFAULTS }));
  const hydrated = useRef(false);

  useEffect(() => {
    setVis(loadVisibility());
  }, []);

  useEffect(() => {
    // Skip the initial DEFAULTS render so we don't clobber the stored layout
    // before it has been loaded above.
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
  }, [vis]);

  const toggle = (key: string) =>
    setVis((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleSlice = (slice: string) => {
    setVis((prev) => {
      const fields = fieldsForSlice(slice);
      const sliceKeys = fields.map((f) => `${slice}-${f}`);
      const allOn = sliceKeys.every((k) => prev[k]);
      const next = { ...prev };
      for (const k of sliceKeys) next[k] = !allOn;
      return next;
    });
  };

  const reset = () => setVis({ ...DEFAULTS });

  const isVisible = (slice: string, field: string) => vis[`${slice}-${field}`] ?? false;
  const activeCount = Object.values(vis).filter(Boolean).length;

  return { vis, toggle, toggleSlice, reset, isVisible, activeCount };
}

interface ColumnPickerProps {
  vis: ColumnVisibility;
  onToggle: (key: string) => void;
  onToggleSlice: (slice: string) => void;
  onReset: () => void;
  activeCount: number;
}

export function ColumnPicker({ vis, onToggle, onToggleSlice, onReset, activeCount }: ColumnPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Columns3 className="size-3.5" />
          Columns
          <Badge variant="secondary" className="ml-1 px-1.5 text-xs">{activeCount}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Visible Columns</span>
          <Button size="sm" variant="ghost" onClick={onReset} className="text-xs h-7">
            Reset
          </Button>
        </div>
        <div className="space-y-3">
          {SLICES.map((slice) => {
            const fields = fieldsForSlice(slice);
            const sliceKeys = fields.map((f) => `${slice}-${f}`);
            const allOn = sliceKeys.every((k) => vis[k]);
            return (
              <div key={slice} className="space-y-1">
                <button
                  className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  onClick={() => onToggleSlice(slice)}
                >
                  <div className={`size-3 rounded-sm border ${allOn ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`} />
                  {slice === 'Est' ? 'Original (OE)' : slice}
                </button>
                <div className="ml-5 flex flex-wrap gap-1.5">
                  {fields.map((field) => {
                    const key = `${slice}-${field}`;
                    const on = vis[key] ?? false;
                    return (
                      <button
                        key={key}
                        className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${on ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}
                        onClick={() => onToggle(key)}
                      >
                        {FIELD_LABELS[field]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Meta columns */}
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Other
            </span>
            <div className="ml-5 flex flex-wrap gap-1.5">
              {META_FIELDS.map((field) => {
                const key = `meta-${field}`;
                const on = vis[key] ?? false;
                return (
                  <button
                    key={key}
                    className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${on ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}
                    onClick={() => onToggle(key)}
                  >
                    {FIELD_LABELS[field]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
