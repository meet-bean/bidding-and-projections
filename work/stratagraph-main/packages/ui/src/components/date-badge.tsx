/**
 * DateBadge component.
 *
 * @see UDC-001: DateBadge component
 *
 * Displays a timestamp in a human-friendly format with an exact-time tooltip.
 * Renders as a semantic <time> element. Supports relative, datetime, date,
 * and time format modes.
 *
 * Always shows a tooltip with the full datetime on hover.
 * Set `nowrap={false}` to allow text wrapping.
 */

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import {
  format,
  formatDistanceToNow,
  differenceInDays,
  formatDistanceToNowStrict,
} from '@/lib/date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';
import { useHydrated } from '@/hooks/use-hydrated';

export interface DateBadgeProps extends Omit<React.HTMLAttributes<HTMLTimeElement>, 'children'> {
  /** The date to display. Accepts a Date object or ISO string. */
  date: Date | string;
  /** Display format mode. Defaults to 'relative'. */
  format?: 'relative' | 'datetime' | 'date' | 'time';
  /** Number of days after which relative format falls back to date format. Defaults to 30. */
  relativeCutoffDays?: number;
  /** Remove the 'almost', 'about' 'over' prefixes by using `formatDistanceToNowStrict`. Defaults to true. */
  strict?: boolean;
  /** Whether to show a tooltip with the full datetime. Defaults to true. */
  tooltip?: boolean;
  /** Prevent text wrapping. Defaults to true. */
  nowrap?: boolean;
  /** Additional CSS class names. */
  className?: string;
}

const DATE_FORMAT = 'MMM d, yyyy';
const TIME_FORMAT = 'h:mm a';
const DATETIME_FORMAT = `MMM d, yyyy 'at' h:mm a`;

function formatDate(
  dateObj: Date,
  mode: 'relative' | 'datetime' | 'date' | 'time',
  relativeCutoffDays: number,
  strict: boolean = true
): string {
  switch (mode) {
    case 'datetime':
      return format(dateObj, DATETIME_FORMAT);
    case 'date':
      return format(dateObj, DATE_FORMAT);
    case 'time':
      return format(dateObj, TIME_FORMAT);
    case 'relative': {
      const daysDiff = Math.abs(differenceInDays(new Date(), dateObj));
      if (daysDiff > relativeCutoffDays) {
        return format(dateObj, DATE_FORMAT);
      }
      const formatFn = strict ? formatDistanceToNowStrict : formatDistanceToNow;
      return formatFn(dateObj, { addSuffix: true });
    }
  }
}

export function DateBadge({
  date,
  format: formatMode = 'relative',
  relativeCutoffDays = 30,
  strict = true,
  tooltip: showTooltip = true,
  nowrap = true,
  className,
  ...props
}: DateBadgeProps) {
  const isHydrated = useHydrated();

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const isValid = !isNaN(dateObj.getTime());

  if (!isValid) {
    const timeElement = (
      <time className={cn(nowrap && 'whitespace-nowrap', className)} {...props}>
        Invalid date
      </time>
    );

    if (!showTooltip) {
      return timeElement;
    }

    return (
      <Tooltip>
        <TooltipTrigger>{timeElement}</TooltipTrigger>
        <TooltipContent>Invalid date</TooltipContent>
      </Tooltip>
    );
  }

  const isoString = typeof date === 'string' ? date : date.toISOString();
  const displayText = formatDate(dateObj, formatMode, relativeCutoffDays, strict);
  const tooltipText = format(dateObj, DATETIME_FORMAT);

  const timeClasses = cn(nowrap && 'whitespace-nowrap', className);

  const timeElement = (
    <time dateTime={isoString} className={timeClasses} {...props}>
      {displayText}
    </time>
  );

  if (!showTooltip) {
    return timeElement;
  }

  // Always show full datetime tooltip on hover
  if (!isHydrated) {
    return timeElement;
  }

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipPrimitive.Trigger render={timeElement} />
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
