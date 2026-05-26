'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { FilterOption } from './filter-types';

export interface ExclusiveSetContentProps<T = unknown> {
  options: FilterOption<T>[];
  selectedValue: T | undefined;
  onSelect: (value: T | undefined) => void;
}

function ExclusiveSetContent<T = unknown>({
  options,
  selectedValue,
  onSelect,
}: ExclusiveSetContentProps<T>) {
  return (
    <div
      data-slot="filter-menu-exclusive"
      className="flex max-h-[300px] flex-col gap-0.5 overflow-y-auto p-1"
    >
      {options.map((option) => {
        const isSelected =
          selectedValue !== undefined &&
          JSON.stringify(option.value) === JSON.stringify(selectedValue);

        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={isSelected}
            onClick={() => {
              onSelect(isSelected ? undefined : option.value);
            }}
            className={cn(
              'flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-2',
              isSelected && 'bg-accent/50'
            )}
          >
            <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
            {option.icon && (
              <span className="shrink-0" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

ExclusiveSetContent.displayName = 'ExclusiveSetContent';

export { ExclusiveSetContent };
