'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import type { FilterOption } from './filter-types';

export interface DynamicSetContentProps<T = unknown> {
  options: FilterOption<T>[];
  selectedValues: T[];
  onSelect: (values: T[]) => void;
  isLoading?: boolean;
  maxSelections?: number;
  searchPlaceholder?: string;
  /** Called when search input changes (for server-side search). */
  onSearchChange?: (search: string) => void;
}

function DynamicSetContent<T = unknown>({
  options,
  selectedValues,
  onSelect,
  isLoading = false,
  maxSelections,
  searchPlaceholder = 'Search\u2026',
  onSearchChange,
}: DynamicSetContentProps<T>) {
  const [search, setSearch] = React.useState('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const selectedSet = React.useMemo(() => {
    return new Set(selectedValues.map((v) => JSON.stringify(v)));
  }, [selectedValues]);

  const selectedOptions = React.useMemo(() => {
    return options
      .filter((opt) => selectedSet.has(JSON.stringify(opt.value)))
      .toSorted((a, b) => a.label.localeCompare(b.label));
  }, [options, selectedSet]);

  const unselectedOptions = React.useMemo(() => {
    return options
      .filter((opt) => !selectedSet.has(JSON.stringify(opt.value)))
      .toSorted((a, b) => a.label.localeCompare(b.label));
  }, [options, selectedSet]);

  // Selected values are always visible regardless of search query
  const filteredSelected = selectedOptions;

  const filteredUnselected = React.useMemo(() => {
    if (!search.trim()) return unselectedOptions;
    const query = search.toLowerCase();
    return unselectedOptions.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [unselectedOptions, search]);

  const handleSelect = (option: FilterOption<T>) => {
    const valueJson = JSON.stringify(option.value);
    if (selectedSet.has(valueJson)) {
      // Deselect
      onSelect(selectedValues.filter((v) => JSON.stringify(v) !== valueJson));
    } else {
      // Select — enforce maxSelections limit
      if (maxSelections === 1) {
        onSelect([option.value]);
      } else if (maxSelections !== undefined && selectedValues.length >= maxSelections) {
        // Already at max — ignore
        return;
      } else {
        onSelect([...selectedValues, option.value]);
      }
    }
  };

  return (
    <div data-slot="filter-menu-dynamic" className="flex max-h-[600px] flex-col overflow-hidden">
      {/* Search input */}
      <div className="flex items-center border-b px-2 py-1.5">
        <input
          type="text"
          aria-label="Search options"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={searchPlaceholder}
          className={cn(
            'flex h-7 w-full rounded-md bg-transparent py-1 text-sm outline-none',
            'placeholder:text-muted-foreground',
            'focus-visible:ring-ring/50 focus-visible:ring-2'
          )}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <>
          {/* Selected section — outside scroll container so it stays visible */}
          {filteredSelected.length > 0 && (
            <div className="shrink-0">
              <div className="text-muted-foreground px-2 py-1 text-xs font-medium">Selected</div>
              {filteredSelected.map((option, index) => (
                <OptionRow
                  key={index}
                  option={option}
                  isSelected={true}
                  onClick={() => handleSelect(option)}
                />
              ))}
              {filteredUnselected.length > 0 && (
                <div className="bg-border my-1 h-px" role="separator" />
              )}
            </div>
          )}

          {/* Unselected section — scrollable */}
          <div className="overflow-y-auto">
            {filteredUnselected.map((option, index) => (
              <OptionRow
                key={index}
                option={option}
                isSelected={false}
                onClick={() => handleSelect(option)}
              />
            ))}

            {filteredSelected.length === 0 && filteredUnselected.length === 0 && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                No results found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface OptionRowProps<T = unknown> {
  option: FilterOption<T>;
  isSelected: boolean;
  onClick: () => void;
}

function OptionRow<T = unknown>({ option, isSelected, onClick }: OptionRowProps<T>) {
  return (
    <button
      data-slot="filter-menu-dynamic-option"
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        'flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 pr-4 text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-2'
      )}
    >
      <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
      {option.icon && (
        <span className="shrink-0" aria-hidden="true">
          {option.icon}
        </span>
      )}
      <OptionLabel label={option.label} />
    </button>
  );
}

/**
 * Renders option label with bold prefix when it contains a colon separator.
 * e.g. "User: Created" renders "**User:** Created"
 */
function OptionLabel({ label }: { label: string }) {
  const colonIndex = label.indexOf(':');
  if (colonIndex < 0) return <span>{label}</span>;

  const prefix = label.slice(0, colonIndex + 1);
  const suffix = label.slice(colonIndex + 1);
  return (
    <span>
      <span className="font-semibold">{prefix}</span>
      {suffix}
    </span>
  );
}

DynamicSetContent.displayName = 'DynamicSetContent';

export { DynamicSetContent };
