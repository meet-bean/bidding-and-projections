'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as React from 'react';

import { cn, renderAsChild } from '@/lib/utils';
import { useHydrated } from '@/hooks/use-hydrated';

const DEFAULT_TOOLTIP_DELAY = 600;

function TooltipProvider({
  delay = DEFAULT_TOOLTIP_DELAY,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

function Tooltip({ disableHoverablePopup = true, ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      disableHoverablePopup={disableHoverablePopup}
      {...props}
    />
  );
}

const TooltipTrigger = renderAsChild(TooltipPrimitive.Trigger, {
  delay: DEFAULT_TOOLTIP_DELAY,
});

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 bg-popover text-popover-foreground origin-(--transform-origin) z-50 w-fit max-w-xs rounded-md px-3 py-1.5 text-xs',
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="data-[side=inline-start]:top-1/2! data-[side=inline-end]:top-1/2! bg-popover fill-foreground data-[side=left]:top-1/2! data-[side=right]:top-1/2! data-[side=top]:-bottom-2.25 z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 data-[side=bottom]:top-1 data-[side=inline-end]:-left-1 data-[side=inline-start]:-right-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:-translate-y-1/2 data-[side=right]:-translate-y-1/2" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

// ============================================================================
// withTooltip HOC
// ============================================================================

type WithTooltipProps<T extends React.ElementType> = {
  /** The tooltip content to display */
  tooltip?: React.ReactNode;
  /** Optional keyboard shortcut to display below the tooltip */
  shortcut?: React.ReactNode;
  /** Props passed to the tooltip content */
  tooltipContentProps?: Omit<React.ComponentProps<typeof TooltipContent>, 'children'>;
  /** Props passed to the tooltip root */
  tooltipProps?: Omit<TooltipPrimitive.Root.Props, 'children'>;
  /** Props passed to the tooltip trigger */
  tooltipTriggerProps?: Omit<TooltipPrimitive.Trigger.Props, 'children' | 'render'>;
} & React.ComponentProps<T>;

/**
 * Higher-order component that wraps a component with a tooltip.
 *
 * @example
 * const ButtonWithTooltip = withTooltip(Button);
 * <ButtonWithTooltip tooltip="Bold" shortcut="Ctrl + B">Bold</ButtonWithTooltip>
 */
export function withTooltip<T extends React.ElementType>(Component: T) {
  return function ExtendComponent({
    shortcut,
    tooltip,
    tooltipContentProps,
    tooltipProps,
    tooltipTriggerProps,
    ...props
  }: WithTooltipProps<T>) {
    const isHydrated = useHydrated();

    const component = <Component {...(props as React.ComponentProps<T>)} />;

    // Only render tooltip on client to prevent hydration mismatches
    if (tooltip && isHydrated) {
      return (
        <TooltipProvider delay={200}>
          <Tooltip disableHoverablePopup {...tooltipProps}>
            <TooltipPrimitive.Trigger render={component} {...tooltipTriggerProps} />

            <TooltipContent {...tooltipContentProps}>
              {shortcut ? (
                <span>
                  {tooltip} {shortcut}
                </span>
              ) : (
                tooltip
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return component;
  };
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
