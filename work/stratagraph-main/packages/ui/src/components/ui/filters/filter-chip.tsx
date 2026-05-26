'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Filter, FilterFieldConfig } from './filter-types';
import { parseISO } from 'date-fns';
import { getSubmenuType, isStandaloneOperatorValue } from './filter-utils';
import { Button } from '@/components/ui/button';
import { OverflowText } from '@/components/overflow-text';
import { formatDateRange } from '@/lib/format-date-range';

export interface FilterChipProps<T = unknown> {
  field: FilterFieldConfig<T>;
  filter: Filter<T>;
  onRemove: () => void;
  onClick: () => void;
}

/**
 * Format a date string (ISO yyyy-mm-dd or full ISO) as "MMM D, YYYY".
 * Example: "2024-01-01" -> "Jan 1, 2024"
 */
function formatChipDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * FilterChip — compact pill displaying an active filter.
 *
 * Content varies by field type:
 * - exclusive set (select): just the matched option label
 * - dynamic set (searchable select): "{field.label} {value.label}"
 * - operator-dynamic (multiselect): "{field.label} {operator.label}" [+ values if not standalone]
 * - date: "{field.label} {operator.label}" [+ formatted date if not standalone]
 */
const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip<
  T = unknown,
>(
  { field, filter, onRemove, onClick }: FilterChipProps<T>,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const chipType = getSubmenuType(field);
  const options = field.options ?? [];
  const operators = field.operators ?? [];
  const fieldLabel = field.label ?? field.key ?? '';
  const operatorObj = operators.find((op) => op.value === filter.operator);
  const operatorLabel = operatorObj?.label ?? filter.operator;
  const standalone = isStandaloneOperatorValue(filter.operator, operators);

  // Build chip content
  let chipContent: React.ReactNode;

  if (chipType === 'exclusive') {
    // Just show the matched option label
    const matched = options.find(
      (opt) => JSON.stringify(opt.value) === JSON.stringify(filter.values[0])
    );
    chipContent = <span>{matched?.label ?? String(filter.values[0] ?? '')}</span>;
  } else if (chipType === 'dynamic') {
    // "{field.label} {value.label}"
    const matched = options.find(
      (opt) => JSON.stringify(opt.value) === JSON.stringify(filter.values[0])
    );
    chipContent = (
      <>
        <span>{fieldLabel}</span>
        <span>{matched?.label ?? String(filter.values[0] ?? '')}</span>
      </>
    );
  } else if (chipType === 'operator-dynamic') {
    if (standalone) {
      // Just "{field.label} {operator.label}"
      chipContent = (
        <>
          <span>{fieldLabel}</span>
          <span>{operatorLabel}</span>
        </>
      );
    } else {
      // "{field.label} {operator.label}" + value representation
      const valueContent = buildOperatorDynamicValues(field, filter, options);
      chipContent = (
        <>
          <span>{fieldLabel}</span>
          <span>{operatorLabel}</span>
          {valueContent && (
            <span data-slot="chip-values" className="max-w-[200px] overflow-hidden">
              {valueContent}
            </span>
          )}
        </>
      );
    }
  } else {
    // date / daterange
    if (standalone) {
      // "{field.label} {Capitalized operator.label}"
      chipContent = (
        <>
          <span>{fieldLabel}</span>
          <span>{operatorLabel}</span>
        </>
      );
    } else {
      // "{field.label} {operator.label} {date(s)}"
      const dateContent = buildDateValues(filter);
      chipContent = (
        <>
          <span>{fieldLabel}</span>
          <span>{operatorLabel}</span>
          <span className="text-muted-foreground">{dateContent}</span>
        </>
      );
    }
  }

  return (
    <Button
      aria-label={`Edit ${fieldLabel} filter`}
      ref={ref}
      variant="outline"
      size="xs"
      className="gap-0.25 inline-flex items-center rounded-md border pl-0.5 pr-0 text-xs font-medium"
      onClick={onClick}
    >
      <span className={cn('inline-flex items-center gap-1 p-0 pl-1')}>{chipContent}</span>
      <Button
        render={<span />}
        nativeButton={false}
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${fieldLabel} filter`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:bg-muted focus-visible:ring-ring p-0.25 ml-0.5 size-5 focus-visible:outline-none focus-visible:ring-2"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </Button>
    </Button>
  );
}) as <T = unknown>(
  props: FilterChipProps<T> & { ref?: React.ForwardedRef<HTMLButtonElement> }
) => React.JSX.Element;

function buildOperatorDynamicValues<T = unknown>(
  field: FilterFieldConfig<T>,
  filter: Filter<T>,
  options: { value: T; label: string }[]
): React.ReactNode {
  if (filter.values.length === 0) return null;

  if (field.customValueRenderer) {
    return field.customValueRenderer(filter.values, field.options ?? []);
  }

  const matchedLabels = filter.values
    .map((v) => {
      const opt = options.find((o) => JSON.stringify(o.value) === JSON.stringify(v));
      return opt?.label ?? String(v);
    })
    .join(', ');

  return (
    <OverflowText className="text-muted-foreground max-w-[200px]">{matchedLabels}</OverflowText>
  );
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value);
}

function buildDateValues<T = unknown>(filter: Filter<T>): React.ReactNode {
  if (filter.values.length === 0) return null;

  const sorted = filter.values.filter(isValidString).toSorted() as string[]; // sort dates for consistent display, especially for ranges

  const first = sorted.at(0);
  const last = sorted.at(-1);

  if (first && last) {
    const from = parseISO(first);
    const to = parseISO(last);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return formatDateRange(from, to);
    }
  }

  if (!first) return null;

  const formatted = formatChipDate(first);

  if (!formatted) return null;

  return <span className="text-muted-foreground">{formatted}</span>;
}

(FilterChip as { displayName?: string }).displayName = 'FilterChip';

export { FilterChip };
