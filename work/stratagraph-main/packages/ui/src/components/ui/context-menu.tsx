/**
 * ContextMenu primitives — Linear-style picker menu family.
 *
 * ## Naming vs. underlying primitive
 *
 * This file is wired to `@base-ui/react/menu` — NOT `@base-ui/react/context-menu` —
 * despite the family name. Reason:
 *
 *   - Base UI's `context-menu` primitive is hardwired to right-click / long-press
 *     activation. Its `Trigger` renders a `<div>` and its `Root` omits the
 *     `delay`/`closeDelay`/`openOnHover` props that click-triggered menus need;
 *     its anchor only updates from the `contextmenu` event coordinates.
 *   - The parent epic (MEE-1763) requires click-triggered consumption for
 *     `PickerMenu`. Right-click semantics are out of scope (MEE-1764 AC explicitly
 *     defers right-click to a future consumer).
 *   - The `context-menu` module's `index.parts.ts` re-exports the same Popup,
 *     Item, Group, GroupLabel, Submenu, etc. from `../menu/...`, so the parts
 *     are functionally identical. Only `Root` and `Trigger` differ.
 *
 * The family is named `ContextMenu*` per the parent epic to distinguish the
 * picker-friendly composition (sections, submenus, hover-card items) from the
 * `DropdownMenu*` command-menu family. The name signals the UX shape, not the
 * Base UI primitive's right-click origin.
 *
 * ## Typeahead-conflict workaround
 *
 * Base UI's Menu primitive enables typeahead navigation by default — pressing a
 * letter focuses the next item whose label starts with that letter. When a
 * `PickerMenu`-style consumer renders a search input *inside* the menu popup
 * (the eventual MEE-1765 composition), keystrokes inside the input bubble to
 * the menu and steal focus.
 *
 * Workaround consumers MUST apply on any input inside a ContextMenuContent:
 *
 *   - `onKeyDown={(e) => e.stopPropagation()}` on the input — prevents the menu
 *     from receiving typeahead/arrow keys while typing.
 *   - Implement `ArrowDown` / `ArrowUp` handlers on the input that move focus
 *     to the first/last menu item via a ref, so the user can keyboard into the
 *     list after typing.
 *   - `Escape` from the input should close the menu (`setOpen(false)`), matching
 *     the typeahead-aborted UX.
 *
 * See MEE-1765 for the canonical implementation inside PickerMenu.
 */

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';
import { ChevronRightIcon } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, renderAsChild } from '@/lib/utils';

function ContextMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

const ContextMenuTrigger = renderAsChild(MenuPrimitive.Trigger, {
  'data-slot': 'context-menu-trigger',
});

function ContextMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  className,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) data-closed:overflow-hidden z-50 min-w-32 rounded-md p-1 shadow-md outline-none ring-1 duration-100',
            className
          )}
          {...props}
        >
          <ScrollArea className="max-h-[inherit]" maskHeight={0}>
            {children}
          </ScrollArea>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

type ContextMenuItemProps = MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
};

const MenuItem = renderAsChild(MenuPrimitive.Item);

function ContextMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: ContextMenuItemProps & { asChild?: true }) {
  const itemClassName = cn(
    "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground group/context-menu-item data-disabled:pointer-events-none data-disabled:opacity-50 relative flex cursor-default select-none items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm outline-none data-[inset]:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className
  );

  return (
    <MenuItem
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={itemClassName}
      {...props}
    />
  );
}

function ContextMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        'text-muted-foreground px-2 py-1.5 text-xs font-medium data-[inset]:pl-8',
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        'text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest',
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground flex cursor-default select-none items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm outline-none data-[inset]:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function ContextMenuSubContent({
  align = 'start',
  alignOffset = -3,
  side = 'right',
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuContent>) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground w-auto min-w-[96px] rounded-md p-1 shadow-lg ring-1 duration-100',
        className
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

/** Default open-delay for hover-card previews — matches tooltip semantics. */
export const DEFAULT_PICKER_PREVIEW_DELAY = 600;

type ContextMenuItemHoverCardProps = MenuPrimitive.Item.Props & {
  preview: React.ReactNode;
  /** Hover-card popup side relative to the menu item. Defaults to `right`. */
  previewSide?: PreviewCardPrimitive.Positioner.Props['side'];
  /** Hover-card popup alignment. Defaults to `start`. */
  previewAlign?: PreviewCardPrimitive.Positioner.Props['align'];
  /** Additional className merged into the popup's default w-64 p-4 chrome. */
  previewClassName?: string;
  /**
   * When true, the popup is enterable — pointer events are enabled and the user
   * can click / interact with popup contents. The popup closes only when the
   * pointer leaves to an element that is not within the trigger row.
   * When false (default), the popup is decorative (pointer-events-none).
   */
  interactive?: boolean;
  /**
   * Delay in milliseconds before the hover-card opens on pointer-enter or
   * focus. Defaults to `DEFAULT_PICKER_PREVIEW_DELAY` (600 ms).
   */
  openDelay?: number;
};

const ContextMenuItemHoverCard = React.forwardRef<HTMLElement, ContextMenuItemHoverCardProps>(
  function ContextMenuItemHoverCard(
    {
      className,
      preview,
      previewSide = 'right',
      previewAlign = 'start',
      previewClassName,
      interactive = false,
      openDelay = DEFAULT_PICKER_PREVIEW_DELAY,
      children,
      onFocus,
      onBlur,
      onKeyDown,
      onPointerLeave,
      onPointerEnter,
      ...itemProps
    },
    forwardedRef
  ) {
    const [open, setOpen] = React.useState(false);
    const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const itemRef = React.useRef<HTMLElement | null>(null);

    const scheduleOpen = React.useCallback(() => {
      if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setOpen(true);
        openTimerRef.current = null;
      }, openDelay);
    }, [openDelay]);

    const cancelOpen = React.useCallback(() => {
      if (openTimerRef.current !== null) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    }, []);

    // Clean up pending timer on unmount.
    React.useEffect(() => cancelOpen, [cancelOpen]);

    const setItemRef = React.useCallback(
      (node: HTMLElement | null) => {
        itemRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    return (
      <PreviewCardPrimitive.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            cancelOpen();
            setOpen(false);
          }
        }}
      >
        <PreviewCardPrimitive.Trigger
          render={
            <MenuPrimitive.Item
              ref={setItemRef}
              data-slot="context-menu-item-hover-card"
              className={cn(
                "focus:bg-accent focus:text-accent-foreground group/context-menu-item data-disabled:pointer-events-none data-disabled:opacity-50 relative flex cursor-default select-none items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm outline-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                className
              )}
              onPointerEnter={(e) => {
                scheduleOpen();
                onPointerEnter?.(e);
              }}
              onFocus={(e) => {
                scheduleOpen();
                onFocus?.(e);
              }}
              onBlur={(e) => {
                cancelOpen();
                const next = e.relatedTarget;
                if (
                  !(
                    next instanceof Element &&
                    next.closest('[data-slot="context-menu-item-hover-card-content"]')
                  )
                ) {
                  setOpen(false);
                }
                onBlur?.(e);
              }}
              onKeyDown={(e) => {
                if (open && (e.key === 'Tab' || e.key === 'Escape')) {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelOpen();
                  setOpen(false);
                  return;
                }
                onKeyDown?.(e);
              }}
              onPointerLeave={(e) => {
                cancelOpen();
                const next = e.relatedTarget;
                if (
                  !(
                    next instanceof Element &&
                    next.closest('[data-slot="context-menu-item-hover-card-content"]')
                  )
                ) {
                  setOpen(false);
                }
                onPointerLeave?.(e);
              }}
              {...itemProps}
            >
              {children}
            </MenuPrimitive.Item>
          }
        />
        <PreviewCardPrimitive.Portal>
          <PreviewCardPrimitive.Positioner
            side={previewSide}
            align={previewAlign}
            sideOffset={8}
            className="isolate z-50"
          >
            <PreviewCardPrimitive.Popup
              data-slot="context-menu-item-hover-card-content"
              className={cn(
                'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 ring-foreground/10 bg-popover text-popover-foreground origin-(--transform-origin) z-50 w-64 rounded-lg p-4 text-sm shadow-md outline-none ring-1 duration-100',
                !interactive && 'pointer-events-none',
                previewClassName
              )}
              onPointerLeave={
                interactive
                  ? (e) => {
                      const next = e.relatedTarget;
                      const intoTrigger =
                        next instanceof Element &&
                        next.closest('[data-slot="context-menu-item-hover-card"]');
                      if (!intoTrigger) setOpen(false);
                    }
                  : undefined
              }
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Tab') {
                  e.preventDefault();
                  e.stopPropagation();
                  itemRef.current?.focus();
                  setOpen(false);
                }
              }}
            >
              {preview}
            </PreviewCardPrimitive.Popup>
          </PreviewCardPrimitive.Positioner>
        </PreviewCardPrimitive.Portal>
      </PreviewCardPrimitive.Root>
    );
  }
);

export {
  ContextMenu,
  ContextMenuPortal,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuItemHoverCard,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
};
