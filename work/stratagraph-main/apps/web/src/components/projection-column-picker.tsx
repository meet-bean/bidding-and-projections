'use client';

import { useState, useEffect } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, Badge } from '@repo/ui';
import { Columns3 } from 'lucide-react';

const SLICES = ['CTP', 'CTD', 'CTC', 'F', 'Est'] as const;
const FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;
const FIELD_LABELS: Record<string, string> = {
  qty: 'Qty', hours: 'Hours', upm: 'U/MH', mpu: 'MH/U', uc: 'UC', cost: 'Cost',
};

export type ColumnVisibility = Record<string, boolean>;

const STORAGE_KEY = 'sc-visible-columns';

const DEFAULTS: ColumnVisibility = {
  'CTD-cost': true, 'CTD-hours': true, 'F-cost': true, 'F-qty': true, 'Est-cost': true,
};

function loadVisibility(): ColumnVisibility {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useColumnVisibility() {
  const [vis, setVis] = useState<ColumnVisibility>(loadVisibility);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
  }, [vis]);

  const toggle = (key: string) =>
    setVis((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleSlice = (slice: string) => {
    setVis((prev) => {
      const sliceKeys = FIELDS.map((f) => `${slice}-${f}`);
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
            const sliceKeys = FIELDS.map((f) => `${slice}-${f}`);
            const allOn = sliceKeys.every((k) => vis[k]);
            return (
              <div key={slice} className="space-y-1">
                <button
                  className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  onClick={() => onToggleSlice(slice)}
                >
                  <div className={`size-3 rounded-sm border ${allOn ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`} />
                  {slice}
                </button>
                <div className="ml-5 flex flex-wrap gap-1.5">
                  {FIELDS.map((field) => {
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
