'use client';

import * as React from 'react';
import { ListFilterPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Filter, FilterFieldConfig, FilterOperator } from './filter-types';
import { parseISO, formatISO } from 'date-fns';
import {
  createFilter,
  getSubmenuType,
  isStandaloneOperator,
  type SubmenuType,
} from './filter-utils';
import { ExclusiveSetContent } from './filter-menu-exclusive';
import { DynamicSetContent } from './filter-menu-dynamic';
import { OperatorDynamicSetContent } from './filter-menu-tags';

export interface FilterMenuProps<T = unknown> {
  fields: FilterFieldConfig<T>[];
  filters: Filter<T>[];
  onFilterChange: (filters: Filter<T>[]) => void;
  className?: string;
  disabled?: boolean;
}

function FilterMenu<T = unknown>({
  fields,
  filters,
  onFilterChange,
  className,
  disabled,
}: FilterMenuProps<T>) {
  const [open, setOpen] = React.useState(false);
  const visibleFields = fields.filter((f) => f.type !== 'separator' && f.key);

  const closeMenu = React.useCallback(() => setOpen(false), []);

  const findFilter = (fieldKey: string): Filter<T> | undefined => {
    return filters.find((f) => f.field === fieldKey);
  };

  const upsertFilter = (fieldKey: string, operator: string, values: T[]) => {
    const existing = findFilter(fieldKey);
    if (existing) {
      onFilterChange(filters.map((f) => (f.field === fieldKey ? { ...f, operator, values } : f)));
    } else {
      onFilterChange([...filters, createFilter<T>(fieldKey, operator, values)]);
    }
  };

  const removeFilter = (fieldKey: string) => {
    onFilterChange(filters.filter((f) => f.field !== fieldKey));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="xs" className={cn('gap-0.5', className)} disabled={disabled}>
          <ListFilterPlusIcon className="size-3.5" aria-hidden="true" />
          Filter
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-auto min-w-[11rem]">
        {visibleFields.map((field) => {
          const fieldKey = field.key!;
          const submenuType = getSubmenuType(field);

          return (
            <DropdownMenuSub key={fieldKey}>
              <DropdownMenuSubTrigger>
                {field.icon && (
                  <span className="shrink-0" aria-hidden="true">
                    {field.icon}
                  </span>
                )}
                {field.label ?? fieldKey}
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent>
                <FieldSubmenu
                  field={field}
                  fieldKey={fieldKey}
                  submenuType={submenuType}
                  existingFilter={findFilter(fieldKey)}
                  upsertFilter={upsertFilter}
                  removeFilter={removeFilter}
                  closeMenu={closeMenu}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FieldSubmenuProps<T = unknown> {
  field: FilterFieldConfig<T>;
  fieldKey: string;
  submenuType: SubmenuType;
  existingFilter: Filter<T> | undefined;
  upsertFilter: (fieldKey: string, operator: string, values: T[]) => void;
  removeFilter: (fieldKey: string) => void;
  closeMenu: () => void;
}

function FieldSubmenu<T = unknown>({
  field,
  fieldKey,
  submenuType,
  existingFilter,
  upsertFilter,
  removeFilter,
  closeMenu,
}: FieldSubmenuProps<T>) {
  const options = field.options ?? [];
  const operators = field.operators ?? [];

  // Track pending operator for operator-dynamic fields before values are selected.
  // This prevents writing an operator-only filter (empty values) to URL params,
  // which would be lost on round-trip through fromParams.
  const [pendingOperator, setPendingOperator] = React.useState<string | undefined>(undefined);

  // Track pending range selection for date range calendars
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(undefined);

  if (submenuType === 'date') {
    const standaloneOps = operators.filter((op) => isStandaloneOperator(op));
    const valueOps = operators.filter((op) => !isStandaloneOperator(op));
    const isRangeOp = (op: FilterOperator) => op.value === 'between' || op.value === 'not_between';

    const parseSelectedDate = (): Date | undefined => {
      const vals = (existingFilter?.values ?? []) as string[];
      if (vals[0]) {
        const d = parseISO(vals[0]);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    };

    const parseSelectedRange = () => {
      const vals = (existingFilter?.values ?? []) as string[];
      const from = vals[0] ? parseISO(vals[0]) : undefined;
      const to = vals[1] ? parseISO(vals[1]) : undefined;
      if (!from || isNaN(from.getTime())) return undefined;
      return { from, to: to && !isNaN(to.getTime()) ? to : undefined };
    };

    return (
      <>
        {/* Standalone date operators (isExpired, lastWeek, etc.) as plain menu items */}
        {standaloneOps.map((op) => {
          const isSelected = existingFilter?.operator === op.value;
          return (
            <DropdownMenuCheckboxItem
              key={op.value}
              checked={isSelected}
              onClick={() => {
                upsertFilter(fieldKey, op.value, []);
                closeMenu();
              }}
            >
              {op.label}
            </DropdownMenuCheckboxItem>
          );
        })}

        {standaloneOps.length > 0 && valueOps.length > 0 && <DropdownMenuSeparator />}

        {/* Value-based date operators (before, after, between) with calendar submenu */}
        {valueOps.map((op) => {
          const isSelected = existingFilter?.operator === op.value;
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
                      // Only commit when both from and to are selected and they
                      // differ.  react-day-picker sets from=to on first click.
                      if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                        upsertFilter(fieldKey, op.value, [
                          formatISO(range.from, { representation: 'date' }),
                          formatISO(range.to, { representation: 'date' }),
                        ] as T[]);
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
                        upsertFilter(fieldKey, op.value, [
                          formatISO(date, { representation: 'date' }),
                        ] as T[]);
                        closeMenu();
                      }
                    }}
                  />
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </>
    );
  }

  if (submenuType === 'operator-dynamic') {
    const effectiveOperator = pendingOperator ?? existingFilter?.operator;

    return (
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator={effectiveOperator}
        selectedValues={existingFilter?.values ?? []}
        onOperatorChange={(operator) => {
          if (operator === undefined) {
            removeFilter(fieldKey);
            setPendingOperator(undefined);
            closeMenu();
          } else {
            // Check if this is a standalone operator (no values needed)
            const op = operators.find((o) => o.value === operator);
            if (op && isStandaloneOperator(op)) {
              upsertFilter(fieldKey, operator, []);
              setPendingOperator(undefined);
              closeMenu();
            } else {
              // Value-based operator: keep locally until values are selected
              setPendingOperator(operator);
              // If filter already has values, update operator immediately
              if (existingFilter && existingFilter.values.length > 0) {
                upsertFilter(fieldKey, operator, existingFilter.values);
              }
            }
          }
        }}
        onValuesChange={(values) => {
          const currentOperator = effectiveOperator ?? operators[0]?.value ?? 'is_any_of';
          if (values.length === 0 && !existingFilter?.operator && !pendingOperator) {
            removeFilter(fieldKey);
            setPendingOperator(undefined);
          } else {
            upsertFilter(fieldKey, currentOperator, values);
            setPendingOperator(undefined);
          }
        }}
      />
    );
  }

  if (submenuType === 'dynamic') {
    const currentValues = existingFilter?.values ?? [];
    // Default to 1 for select fields to enforce single-select semantics
    const maxSel = field.maxSelections ?? (field.type === 'select' ? 1 : undefined);

    return (
      <DynamicSetContent
        options={options}
        selectedValues={currentValues}
        onSelect={(values) => {
          if (values.length === 0) {
            removeFilter(fieldKey);
          } else {
            const currentOperator = existingFilter?.operator ?? 'is';
            upsertFilter(fieldKey, currentOperator, values);
          }
          // Close for single-select; keep open for multi-select
          if (maxSel === 1) closeMenu();
        }}
        maxSelections={maxSel}
        searchPlaceholder={
          field.placeholder ?? `Search ${(field.label ?? fieldKey).toLowerCase()}\u2026`
        }
        onSearchChange={field.onSearchChange}
      />
    );
  }

  // Default: ExclusiveSetContent
  const currentValue =
    existingFilter !== undefined && existingFilter.values.length > 0
      ? existingFilter.values[0]
      : undefined;

  return (
    <ExclusiveSetContent
      options={options}
      selectedValue={currentValue}
      onSelect={(value) => {
        if (value === undefined) {
          removeFilter(fieldKey);
        } else {
          upsertFilter(fieldKey, existingFilter?.operator ?? 'is', [value]);
        }
        closeMenu();
      }}
    />
  );
}

FilterMenu.displayName = 'FilterMenu';

export { FilterMenu };
