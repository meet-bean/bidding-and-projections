'use client';

import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import type { DateRange } from 'react-day-picker';
import type { FilterOperator } from './filter-types';
import { parseISO, formatISO } from 'date-fns';
import { isStandaloneOperator } from './filter-utils';

export interface DateFilterContentProps {
  operators: FilterOperator[];
  selectedOperator: string | undefined;
  selectedValues: string[];
  onOperatorChange: (operator: string) => void;
  onValuesChange: (values: string[], forOperator?: string) => void;
}

const isRangeOp = (op: FilterOperator) => op.value === 'between' || op.value === 'not_between';

/**
 * DateFilterContent — two-panel date filter UI.
 *
 * Left panel: operator list (standalone operators as plain items, value operators with chevron).
 * Right panel: calendar (appears when a value operator is hovered or selected).
 *
 * Used in FilterChipPopover for editing active date filters.
 * FilterMenu uses native DropdownMenuSub items instead of this component.
 */
function DateFilterContent({
  operators,
  selectedOperator,
  selectedValues,
  onOperatorChange,
  onValuesChange,
}: DateFilterContentProps) {
  // Track which value operator's calendar is visible (hover or selected)
  const [activeCalendarOp, setActiveCalendarOp] = React.useState<string | undefined>(() => {
    // If a value-based operator is already selected, show its calendar
    if (
      selectedOperator &&
      operators.find((op) => op.value === selectedOperator && !isStandaloneOperator(op))
    ) {
      return selectedOperator;
    }
    return undefined;
  });

  // Update active calendar when selected operator changes externally
  React.useEffect(() => {
    if (
      selectedOperator &&
      operators.find((op) => op.value === selectedOperator && !isStandaloneOperator(op))
    ) {
      setActiveCalendarOp(selectedOperator);
    }
  }, [selectedOperator, operators]);

  const standaloneOperators = operators.filter((op) => isStandaloneOperator(op));
  const valueOperators = operators.filter((op) => !isStandaloneOperator(op));

  const activeValueOp = valueOperators.find((op) => op.value === activeCalendarOp);

  // Track pending range selection so first click doesn't commit
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(undefined);

  // Reset pending range when the active calendar operator changes
  React.useEffect(() => {
    setPendingRange(undefined);
  }, [activeCalendarOp]);

  const handleStandaloneClick = (op: FilterOperator) => {
    onOperatorChange(op.value);
    setActiveCalendarOp(undefined);
  };

  const handleValueOperatorClick = (op: FilterOperator) => {
    // Do NOT call onOperatorChange here — operator is deferred until the user
    // picks a date in the calendar.  This avoids creating a filter with an
    // operator but empty values, which crashes toParams on URL round-trip.
    setActiveCalendarOp(op.value);
  };

  const handleValueOperatorHover = (op: FilterOperator) => {
    setActiveCalendarOp(op.value);
  };

  const parseFirstDate = (): Date | undefined => {
    if (selectedValues.length > 0 && selectedValues[0]) {
      const d = parseISO(selectedValues[0]);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };

  const parseRange = (): DateRange | undefined => {
    const parseSafe = (value: string | undefined): Date | undefined => {
      if (!value) return undefined;
      const d = parseISO(value);
      return isNaN(d.getTime()) ? undefined : d;
    };
    const from = parseSafe(selectedValues[0]);
    const to = parseSafe(selectedValues[1]);
    if (!from) return undefined;
    return { from, to };
  };

  const itemClassName = cn(
    'flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:ring-ring/50 focus-visible:ring-2'
  );

  return (
    <div data-testid="date-filter-content" data-slot="filter-menu-date" className="flex">
      {/* Left panel: operator list */}
      <div data-testid="date-operators-panel" className="flex min-w-[150px] flex-col">
        {/* Standalone operators */}
        {standaloneOperators.length > 0 && (
          <div className="flex flex-col gap-0.5 p-1">
            {standaloneOperators.map((op) => {
              const isSelected = selectedOperator === op.value;
              return (
                <button
                  key={op.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleStandaloneClick(op)}
                  className={cn(itemClassName, isSelected && 'bg-accent/50')}
                >
                  <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                  <span>{op.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Separator if both exist */}
        {standaloneOperators.length > 0 && valueOperators.length > 0 && (
          <div className="bg-border my-1 h-px" role="separator" />
        )}

        {/* Value-based operators with chevron */}
        {valueOperators.length > 0 && (
          <div className="flex flex-col gap-0.5 p-1">
            {valueOperators.map((op) => {
              const isSelected = selectedOperator === op.value;
              const isActive = activeCalendarOp === op.value;

              return (
                <button
                  key={op.value}
                  type="button"
                  aria-pressed={isSelected}
                  aria-expanded={isActive}
                  onClick={() => handleValueOperatorClick(op)}
                  onMouseEnter={() => handleValueOperatorHover(op)}
                  className={cn(
                    itemClassName,
                    isSelected && 'bg-accent/50',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                  <span className="flex-1 text-left">{op.label}</span>
                  <ChevronRightIcon className="size-4 shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right panel: calendar (shown when a value operator is active) */}
      {activeValueOp && (
        <div data-testid="date-calendar-panel" className="border-l p-2">
          {isRangeOp(activeValueOp) ? (
            <Calendar
              mode="range"
              selected={
                pendingRange ?? (activeCalendarOp === selectedOperator ? parseRange() : undefined)
              }
              onSelect={(range) => {
                setPendingRange(range ?? undefined);
                // Only commit when both from and to are selected and they differ.
                // react-day-picker sets from=to=sameDate on first click; second
                // click updates to with the actual end date.
                if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                  onValuesChange(
                    [
                      formatISO(range.from, { representation: 'date' }),
                      formatISO(range.to, { representation: 'date' }),
                    ],
                    activeCalendarOp
                  );
                  setPendingRange(undefined);
                }
              }}
            />
          ) : (
            <Calendar
              mode="single"
              selected={activeCalendarOp === selectedOperator ? parseFirstDate() : undefined}
              onSelect={(date) => {
                onValuesChange(
                  date ? [formatISO(date, { representation: 'date' })] : [],
                  activeCalendarOp
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

DateFilterContent.displayName = 'DateFilterContent';

export { DateFilterContent };
