'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import type { DateRange } from 'react-day-picker';
import type { Filter, FilterFieldConfig, FilterOperator } from './filter-types';
import { parseISO, formatISO } from 'date-fns';
import { getSubmenuType, isStandaloneOperator, isStandaloneOperatorValue } from './filter-utils';
import { FilterChip } from './filter-chip';
import { ExclusiveSetContent } from './filter-menu-exclusive';
import { DynamicSetContent } from './filter-menu-dynamic';
import { OperatorDynamicSetContent } from './filter-menu-tags';

export interface FilterChipPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>;
  filter: Filter<T>;
  onFilterChange: (updatedFilter: Filter<T>) => void;
  onRemove: () => void;
}

/**
 * FilterChipPopover — wraps FilterChip in a Popover (or DropdownMenu for dates).
 *
 * When the chip body is clicked, opens the appropriate content for editing
 * the active filter. Date filters use a DropdownMenu with native submenus
 * so the calendar opens as a nested submenu (matching the main FilterMenu).
 */
function FilterChipPopover<T = unknown>({
  field,
  filter,
  onFilterChange,
  onRemove,
}: FilterChipPopoverProps<T>) {
  const submenuType = getSubmenuType(field);

  if (submenuType === 'date') {
    return (
      <DateChipDropdown
        field={field}
        filter={filter}
        onFilterChange={onFilterChange}
        onRemove={onRemove}
      />
    );
  }

  return (
    <NonDateChipPopover
      field={field}
      filter={filter}
      onFilterChange={onFilterChange}
      onRemove={onRemove}
    />
  );
}

/**
 * DateChipDropdown — date filter chip using a DropdownMenu with native
 * submenus for calendar pickers. Mirrors the FilterMenu date submenu
 * structure exactly.
 */
function DateChipDropdown<T = unknown>({
  field,
  filter,
  onFilterChange,
  onRemove,
}: FilterChipPopoverProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(undefined);
  const operators = field.operators ?? [];

  const standaloneOps = operators.filter((op) => isStandaloneOperator(op));
  const valueOps = operators.filter((op) => !isStandaloneOperator(op));
  const isRangeOp = (op: FilterOperator) => op.value === 'between' || op.value === 'not_between';

  const closeMenu = () => setOpen(false);

  const parseSelectedDate = (): Date | undefined => {
    const vals = (filter.values ?? []) as string[];
    if (vals[0]) {
      const d = parseISO(vals[0]);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };

  const parseSelectedRange = (): DateRange | undefined => {
    const vals = (filter.values ?? []) as string[];
    const from = vals[0] ? parseISO(vals[0]) : undefined;
    const to = vals[1] ? parseISO(vals[1]) : undefined;
    if (!from || isNaN(from.getTime())) return undefined;
    return { from, to: to && !isNaN(to.getTime()) ? to : undefined };
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <FilterChip
          field={field as FilterFieldConfig}
          filter={filter as Filter}
          onRemove={onRemove}
          onClick={() => {}}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-[11rem]">
        {/* Standalone operators as plain menu items */}
        {standaloneOps.map((op) => {
          const isSelected = filter.operator === op.value;
          return (
            <DropdownMenuItem
              key={op.value}
              onClick={() => {
                onFilterChange({ ...filter, operator: op.value, values: [] as T[] });
              }}
            >
              <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
              {op.label}
            </DropdownMenuItem>
          );
        })}

        {standaloneOps.length > 0 && valueOps.length > 0 && <DropdownMenuSeparator />}

        {/* Value-based operators with calendar submenus */}
        {valueOps.map((op) => {
          const isSelected = filter.operator === op.value;
          return (
            <DropdownMenuSub key={op.value}>
              <DropdownMenuSubTrigger>
                <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                {op.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-2">
                {isRangeOp(op) ? (
                  <Calendar
                    className="bg-transparent"
                    mode="range"
                    selected={pendingRange ?? (isSelected ? parseSelectedRange() : undefined)}
                    onSelect={(range) => {
                      setPendingRange(range ?? undefined);
                      if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                        onFilterChange({
                          ...filter,
                          operator: op.value,
                          values: [
                            formatISO(range.from, { representation: 'date' }),
                            formatISO(range.to, { representation: 'date' }),
                          ] as T[],
                        });
                        setPendingRange(undefined);
                        closeMenu();
                      }
                    }}
                  />
                ) : (
                  <Calendar
                    className="bg-transparent"
                    mode="single"
                    selected={isSelected ? parseSelectedDate() : undefined}
                    onSelect={(date) => {
                      if (date) {
                        onFilterChange({
                          ...filter,
                          operator: op.value,
                          values: [formatISO(date, { representation: 'date' })] as T[],
                        });
                        closeMenu();
                      }
                    }}
                  />
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * NonDateChipPopover — non-date filter chips using a Popover.
 */
function NonDateChipPopover<T = unknown>({
  field,
  filter,
  onFilterChange,
  onRemove,
}: FilterChipPopoverProps<T>) {
  const [open, setOpen] = React.useState(false);
  // Deferred operator: when switching from a standalone operator (e.g. "is empty")
  // to a value-based operator (e.g. "includes"), we defer the operator change until
  // the user selects values. This prevents the filter from round-tripping through
  // URL params as empty (values=[]) which would cause fromParams to return null,
  // unmounting the chip and closing the popover.
  const [pendingOperator, setPendingOperator] = React.useState<string | undefined>(undefined);

  const submenuType = getSubmenuType(field);
  const options = field.options ?? [];
  const operators = field.operators ?? [];

  const effectiveOperator = pendingOperator ?? filter.operator;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPendingOperator(undefined);
    }
  };

  const handleExclusiveSelect = (value: T | undefined) => {
    if (value === undefined) {
      onRemove();
    } else {
      onFilterChange({ ...filter, values: [value] });
    }
    setOpen(false);
  };

  const handleDynamicSelect = (values: T[]) => {
    if (values.length === 0) {
      onRemove();
      setOpen(false);
    } else {
      onFilterChange({ ...filter, values });
      // Close for single-select
      const maxSel = field.maxSelections ?? (field.type === 'select' ? 1 : undefined);
      if (maxSel === 1) setOpen(false);
    }
  };

  const handleOperatorChange = (operator: string | undefined) => {
    if (operator === undefined) {
      onRemove();
      setOpen(false);
    } else {
      if (isStandaloneOperatorValue(operator, operators)) {
        setPendingOperator(undefined);
        onFilterChange({ ...filter, operator, values: [] });
        setOpen(false);
      } else if (isStandaloneOperatorValue(filter.operator, operators)) {
        // Switching from standalone to value-based: defer until values are selected
        setPendingOperator(operator);
      } else {
        setPendingOperator(undefined);
        onFilterChange({ ...filter, operator });
      }
    }
  };

  const handleValuesChange = (values: T[]) => {
    const op = pendingOperator ?? filter.operator;
    setPendingOperator(undefined);
    onFilterChange({ ...filter, operator: op, values });
  };

  let content: React.ReactNode;

  if (submenuType === 'operator-dynamic') {
    content = (
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator={effectiveOperator}
        selectedValues={filter.values}
        onOperatorChange={handleOperatorChange}
        onValuesChange={handleValuesChange}
        searchPlaceholder={
          field.placeholder ?? `Search ${(field.label ?? field.key ?? '').toLowerCase()}\u2026`
        }
      />
    );
  } else if (submenuType === 'dynamic') {
    const maxSel = field.maxSelections ?? (field.type === 'select' ? 1 : undefined);
    content = (
      <DynamicSetContent
        options={options}
        selectedValues={filter.values}
        onSelect={handleDynamicSelect}
        maxSelections={maxSel}
        searchPlaceholder={
          field.placeholder ?? `Search ${(field.label ?? field.key ?? '').toLowerCase()}\u2026`
        }
        onSearchChange={field.onSearchChange}
      />
    );
  } else {
    const currentValue = filter.values.length > 0 ? filter.values[0] : undefined;
    content = (
      <ExclusiveSetContent
        options={options}
        selectedValue={currentValue}
        onSelect={handleExclusiveSelect}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <FilterChip
          field={field as FilterFieldConfig}
          filter={filter as Filter}
          onRemove={onRemove}
          onClick={() => handleOpenChange(!open)}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0" style={{ width: 'auto', minWidth: '200px' }}>
        {content}
      </PopoverContent>
    </Popover>
  );
}

FilterChipPopover.displayName = 'FilterChipPopover';

export { FilterChipPopover };
