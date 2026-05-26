'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OverflowText } from '@/components/overflow-text';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateRange } from '@/lib/format-date-range';
import type { DateRange } from 'react-day-picker';

// ─── Public types ────────────────────────────────────────────────────

interface DatePickerBaseProps {
  placeholder?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  minDate?: Date;
  maxDate?: Date;
}

export interface DatePickerSingleProps extends DatePickerBaseProps {
  mode?: 'single';
  value?: Date;
  onChange: (date: Date | undefined) => void;
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  mode: 'range';
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
}

export interface DatePickerMultipleProps extends DatePickerBaseProps {
  mode: 'multiple';
  value?: Date[];
  onChange: (dates: Date[] | undefined) => void;
}

export type DatePickerProps =
  | DatePickerSingleProps
  | DatePickerRangeProps
  | DatePickerMultipleProps;

// ─── Helpers ─────────────────────────────────────────────────────────

function getDisplayText(props: DatePickerProps): string | null {
  if (props.mode === 'range') {
    if (!props.value?.from) return null;
    return formatDateRange(props.value.from, props.value.to);
  }
  if (props.mode === 'multiple') {
    if (!props.value?.length) return null;
    const count = props.value.length;
    return count === 1 ? '1 date selected' : `${count} dates selected`;
  }
  // single (default)
  if (!props.value) return null;
  return format(props.value, 'PPP');
}

function getDefaultPlaceholder(mode: DatePickerProps['mode']): string {
  if (mode === 'range') return 'Pick a date range';
  if (mode === 'multiple') return 'Pick dates';
  return 'Pick a date';
}

function getClearLabel(mode: DatePickerProps['mode']): string {
  if (mode === 'range') return 'Clear date range';
  if (mode === 'multiple') return 'Clear dates';
  return 'Clear date';
}

function hasValue(props: DatePickerProps): boolean {
  if (props.mode === 'range') return !!props.value?.from;
  if (props.mode === 'multiple') return !!props.value?.length;
  return !!props.value;
}

// ─── Component ───────────────────────────────────────────────────────

export function DatePicker(props: DatePickerProps) {
  const { className, disabled, id, minDate, maxDate, placeholder } = props;
  const mode = props.mode ?? 'single';

  const displayText = getDisplayText(props);

  const handleClear = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    // All overloads accept `undefined`
    (props.onChange as (v: undefined) => void)(undefined);
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const disabledDates =
    minDate && maxDate
      ? [{ before: minDate }, { after: maxDate }]
      : minDate
        ? { before: minDate }
        : maxDate
          ? { after: maxDate }
          : undefined;

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            onClick={handleButtonClick}
            className={cn(
              'relative w-[250px] justify-start text-left',
              hasValue(props) && 'pr-8',
              !displayText && 'text-muted-foreground',
              className
            )}
          />
        }
      >
        <CalendarIcon className="shrink-0" />
        {displayText ? (
          <OverflowText>{displayText}</OverflowText>
        ) : (
          <span>{placeholder ?? getDefaultPlaceholder(mode)}</span>
        )}
        {hasValue(props) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute end-1 top-1/2 -translate-y-1/2 rounded-full"
            onClick={handleClear}
            disabled={disabled}
            aria-label={getClearLabel(mode)}
            nativeButton={false}
            render={<span />}
          >
            <X />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {mode === 'range' ? (
          <Calendar
            mode="range"
            selected={(props as DatePickerRangeProps).value}
            onSelect={(props as DatePickerRangeProps).onChange}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={disabledDates}
            numberOfMonths={2}
            autoFocus
          />
        ) : mode === 'multiple' ? (
          <Calendar
            mode="multiple"
            selected={(props as DatePickerMultipleProps).value}
            onSelect={(props as DatePickerMultipleProps).onChange}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={disabledDates}
            autoFocus
          />
        ) : (
          <Calendar
            mode="single"
            selected={(props as DatePickerSingleProps).value}
            onSelect={(props as DatePickerSingleProps).onChange}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={disabledDates}
            autoFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
