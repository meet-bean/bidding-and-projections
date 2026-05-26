'use client';

import type { DateRange } from 'react-day-picker';
import { DatePicker } from '@/components/date-picker';
import type { DatePickerRangeProps } from '@/components/date-picker';

export type { DateRange };

export type DateRangePickerProps = Omit<DatePickerRangeProps, 'mode'>;

/** @deprecated Use `<DatePicker mode="range" />` instead. */
export function DateRangePicker(props: DateRangePickerProps) {
  return <DatePicker mode="range" {...props} />;
}
