'use client';

/**
 * PickerMenu — generic, tRPC-unaware picker composition over ContextMenu* primitives.
 *
 * Built for MEE-1765. Consumes the ContextMenu* family (see
 * packages/ui/src/components/ui/context-menu.tsx) for click-triggered menu UX with
 * sections, submenus, and hover-card items.
 *
 * This file deliberately knows nothing about tRPC or data fetching. Callers drive
 * `items` from their own paginated query and pass the result in; PickerMenu owns
 * presentation only.
 *
 * See the spec for the AC list and the parent epic (MEE-1763) for the broader UX
 * direction.
 */
import * as React from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Check } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuItemHoverCard,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  DEFAULT_PICKER_PREVIEW_DELAY,
} from '@/components/ui/context-menu';
import { Checkbox } from '@/components/ui/checkbox';
import type { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';

const PICKER_MENU_ITEM_HEIGHT = 32;
const PICKER_MENU_OVERSCAN = 5;
const PICKER_MENU_VIRTUALIZATION_THRESHOLD = 20;

// ---------------------------------------------------------------------------
// Cross-submenu search context
// ---------------------------------------------------------------------------

/**
 * Registration record for a PickerSubMenu so that PickerMenuBody can include
 * its items in root-level search results when the user types.
 *
 * NOTE (tech debt, MEE-1766): for tRPC-backed submenus (TagPicker) this causes
 * all per-category queries to fire as soon as the parent menu has a search input.
 * Deferred per spec — fix tracked in MEE-1766.
 */
interface SubmenuRegistration {
  id: string;
  label: string;
  /** Submenu's selection mode — drives checkbox (multi) vs check (single) in cross-submenu results. */
  mode: 'single' | 'multi';
  items: unknown[];
  getItemId: (item: unknown) => string;
  getItemLabel?: (item: unknown) => string;
  renderItem: (item: unknown, selected: boolean) => React.ReactNode;
  onSelect: (item: unknown) => void;
  value: unknown[];
}

interface PickerMenuSearchContextValue {
  search: string;
  register: (reg: SubmenuRegistration) => () => void;
  /** Read-only snapshot of all currently registered submenus. */
  registrations: ReadonlyMap<string, SubmenuRegistration>;
}

const PickerMenuSearchContext = React.createContext<PickerMenuSearchContextValue>({
  search: '',
  register: () => (console.warn('PickerMenuSearchContext not provided'), () => {}),
  registrations: new Map(),
});

/**
 * Props for a section of items inside a PickerMenu.
 */
export interface PickerMenuSection<T> {
  /** Stable identifier for the section; used as React key. */
  id: string;
  /** Visible section label. */
  label: string;
  /** Items belonging to this section. */
  items: T[];
  /** Optional per-section mode override. Falls back to the top-level `mode`. */
  mode?: 'single' | 'multi';
}

/**
 * Shared props between PickerMenu and PickerSubMenu.
 */
interface PickerCommonProps<T> {
  /** Selection mode. `single` clears prior selection on click; `multi` toggles. */
  mode: 'single' | 'multi';
  /** All items, used when `sections` is not provided. */
  items?: T[];
  /** Optional pre-grouped sections. If provided, replaces flat `items` rendering. */
  sections?: PickerMenuSection<T>[];
  /** Currently selected items. Order is preserved on selection. */
  value: T[];
  /** Called with the next selection after a user interaction. */
  onChange: (next: T[]) => void;
  /** Stable id extractor used for equality and React keys. */
  getItemId: (item: T) => string;
  /** Render function for one menu item; `selected` reflects current value. */
  renderItem: (item: T, selected: boolean) => React.ReactNode;
  /** Label extractor used for client-side search filtering. */
  getItemLabel?: (item: T) => string;
  /** Placeholder for the in-menu search input. */
  searchPlaceholder?: string;
  /** When true, render a truncation banner above the list. */
  truncated?: boolean;
  /** Override message shown when `truncated` is true. Ignored when `fallbackSearchState` is set to a non-undefined value. */
  truncatedMessage?: string;
  /**
   * Drives the truncation banner copy when the picker has a server-side fallback search wired up (MEE-1773).
   * - `idle`: cache is truncated, no fallback in flight → "Type to find more"
   * - `pending`: debounce window passed, server query in flight → "Searching…"
   * - `active`: server returned ≥1 result merged into the list → "Showing matches across all entries"
   * - `empty`: server returned 0 results → "No matches across all entries"
   *
   * When undefined, falls back to `truncatedMessage` (or the legacy default).
   */
  fallbackSearchState?: 'idle' | 'pending' | 'active' | 'empty';
  /** Children rendered after the items list — used for nesting PickerSubMenu inside a root PickerMenu. */
  children?: React.ReactNode;
  /**
   * Optional hover-card preview rendered when hovering an item.
   * When provided, items are wrapped in ContextMenuItemHoverCard.
   * Falls back to plain ContextMenuItem when not provided.
   */
  itemPreview?: (item: T, selected: boolean) => React.ReactNode;
  /** Which side the hover-card preview appears on. Defaults to `right`. */
  previewSide?: PreviewCardPrimitive.Positioner.Props['side'];
  /** Additional className merged into the hover-card popup's default w-64 p-4 chrome. */
  previewClassName?: string;
  /**
   * When true, hover-card popups are enterable (pointer-events enabled).
   * Forwarded to every ContextMenuItemHoverCard as `interactive`.
   * Defaults to `false`.
   */
  previewInteractive?: boolean;
  /**
   * Delay in milliseconds before a hover-card preview opens on pointer-enter
   * or focus. Defaults to `DEFAULT_PICKER_PREVIEW_DELAY` (600 ms).
   */
  previewDelay?: number;
}

/**
 * Props for the PickerMenu composition.
 */
export interface PickerMenuProps<T> extends PickerCommonProps<T> {
  /** Element used as the menu trigger. Receives Base UI's render-prop slot. */
  trigger: React.ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Open-state change callback. */
  onOpenChange?: (open: boolean) => void;
  /** Called whenever the search input value changes. Use to drive server-side fallback queries (MEE-1773). */
  onSearchChange?: (search: string) => void;
}

/**
 * Props for the PickerSubMenu composition (renders inside a parent PickerMenu).
 */
export interface PickerSubMenuProps<T> extends PickerCommonProps<T> {
  /** Content or label for the submenu trigger row. */
  subTrigger: React.ReactNode;
  /** Optional icon rendered before the subTrigger label. */
  subTriggerIcon?: React.ReactNode;
  /**
   * Label used to prefix cross-submenu search results in the root PickerMenu.
   * Defaults to the string content of `subTrigger` when it's a string, otherwise "Submenu".
   * Example: `searchLabel="Operators"` → result label shows "Operators → Alice".
   */
  searchLabel?: string;
}

// ---------------------------------------------------------------------------
// Internal body component — owns all search + list rendering logic.
// The open/setOpen pair is passed in by the parent wrapper because the
// open-state primitive differs between root (ContextMenu) and sub (ContextMenuSub).
// ---------------------------------------------------------------------------

function pickTruncationMessage(
  state: PickerCommonProps<unknown>['fallbackSearchState'],
  override: string | undefined
): string {
  if (state === 'idle') return 'Type to find more';
  if (state === 'pending') return 'Searching…';
  if (state === 'active') return 'Showing matches across all entries';
  if (state === 'empty') return 'No matches across all entries';
  return override ?? 'Showing first results — narrow with search';
}

interface PickerMenuBodyProps<T> extends PickerCommonProps<T> {
  open: boolean;
  setOpen: (next: boolean) => void;
  /**
   * Ref to the selected-at-top snapshot. Owned by the outer wrapper (PickerMenu /
   * PickerSubMenu) so the edge detection can run before the content portal mounts —
   * the body may be unmounted when closed in some Base UI versions.
   */
  selectedSnapshotRef: React.RefObject<{ ids: string[] } | null>;
  /**
   * Callback invoked whenever the body's internal search string changes.
   * Only provided by the root PickerMenu so it can propagate search to
   * the PickerMenuSearchContext for cross-submenu results.
   */
  onSearchChange?: (search: string) => void;
}

function PickerMenuBody<T>({
  mode,
  items,
  sections,
  value,
  onChange,
  getItemId,
  renderItem,
  getItemLabel,
  searchPlaceholder,
  truncated,
  truncatedMessage,
  fallbackSearchState,
  open,
  setOpen,
  selectedSnapshotRef,
  children,
  itemPreview,
  previewSide,
  previewClassName,
  previewInteractive,
  previewDelay = DEFAULT_PICKER_PREVIEW_DELAY,
  onSearchChange,
}: PickerMenuBodyProps<T>) {
  const [search, setSearch] = React.useState('');

  // Propagate search changes to the parent context (root PickerMenu only).
  const onSearchChangeRef = React.useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  React.useEffect(() => {
    onSearchChangeRef.current?.(search);
  }, [search]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const firstItemRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (open) {
      // Wait one frame so the portal/popup is mounted before focusing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  React.useEffect(
    () => () => {
      // Clear search on unmount to prevent visual popping when animating out
      setSearch('');
    },
    []
  );

  const selectedIds = React.useMemo(() => new Set(value.map(getItemId)), [value, getItemId]);

  const matchesSearch = React.useCallback(
    (item: T): boolean => {
      if (!search) return true;
      if (!getItemLabel) return true;
      return getItemLabel(item).toLowerCase().includes(search.toLowerCase());
    },
    [search, getItemLabel]
  );

  const filteredFlat = React.useMemo(
    () => (items ?? []).filter(matchesSearch),
    [items, matchesSearch]
  );

  const filteredSections = React.useMemo(
    () =>
      (sections ?? []).map((section) => ({
        ...section,
        items: section.items.filter(matchesSearch),
      })),
    [sections, matchesSearch]
  );

  const pinSelectedAtTop = React.useCallback(
    (list: T[]): T[] => {
      const snap = selectedSnapshotRef.current;
      if (!snap || snap.ids.length === 0) return list;
      const idIndex = new Map(snap.ids.map((id, i) => [id, i] as const));
      const pinned: T[] = [];
      const rest: T[] = [];
      for (const item of list) {
        if (idIndex.has(getItemId(item))) {
          pinned.push(item);
        } else {
          rest.push(item);
        }
      }
      pinned.sort((a, b) => idIndex.get(getItemId(a))! - idIndex.get(getItemId(b))!);
      return [...pinned, ...rest];
    },
    [getItemId, selectedSnapshotRef]
  );

  const flatOrdered = React.useMemo(
    () => pinSelectedAtTop(filteredFlat),
    [pinSelectedAtTop, filteredFlat]
  );

  const shouldVirtualize =
    sections === undefined && flatOrdered.length >= PICKER_MENU_VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? flatOrdered.length : 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => PICKER_MENU_ITEM_HEIGHT,
    overscan: PICKER_MENU_OVERSCAN,
  });

  React.useEffect(() => {
    if (open && shouldVirtualize) {
      requestAnimationFrame(() => virtualizer.measure());
    }
  }, [open, shouldVirtualize, virtualizer, flatOrdered.length]);

  const handleSelect = React.useCallback(
    (item: T, sectionMode: 'single' | 'multi', sectionItems?: T[]) => {
      const id = getItemId(item);
      const isSelected = selectedIds.has(id);
      if (sectionMode === 'single') {
        if (isSelected) {
          onChange(value.filter((v) => getItemId(v) !== id));
        } else if (sectionItems !== undefined) {
          // Per-section single-select: replace only items in this section.
          const sectionIds = new Set(sectionItems.map(getItemId));
          const others = value.filter((v) => !sectionIds.has(getItemId(v)));
          onChange([...others, item]);
        } else {
          // No section context (flat list, single mode at top level): replace entirely.
          onChange([item]);
        }
        setOpen(false);
        return;
      }
      if (isSelected) {
        onChange(value.filter((v) => getItemId(v) !== id));
      } else {
        onChange([...value, item]);
      }
    },
    [getItemId, onChange, selectedIds, setOpen, value]
  );

  const handleSearchKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        firstItemRef.current?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    },
    [setOpen]
  );

  // Cross-submenu search: read registered submenus from context and collect
  // matching items inline when the user has typed a search query.
  const searchCtx = React.useContext(PickerMenuSearchContext);
  const crossSubmenuResults = React.useMemo<Array<{ reg: SubmenuRegistration; item: unknown }>>(
    () => {
      if (!searchCtx || !search) return [];
      const results: Array<{ reg: SubmenuRegistration; item: unknown }> = [];
      for (const reg of searchCtx.registrations.values()) {
        if (!reg.getItemLabel) continue;
        for (const item of reg.items) {
          if (reg.getItemLabel(item).toLowerCase().includes(search.toLowerCase())) {
            results.push({ reg, item });
          }
        }
      }
      return results;
    },
    // Intentionally re-run when registrations change — the map reference is
    // stable but we need to re-derive when items/registrations update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, searchCtx?.registrations]
  );

  return (
    <div onPointerEnter={() => inputRef.current?.focus()}>
      {searchPlaceholder !== undefined && (
        <div className="bg-popover sticky top-0 z-10 border-b">
          <input
            ref={inputRef}
            data-slot="picker-menu-search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="placeholder:text-muted-foreground w-full bg-transparent px-3 py-2 text-sm outline-none"
          />
        </div>
      )}
      {truncated && (
        <div
          data-slot="picker-menu-truncation"
          data-fallback-state={fallbackSearchState ?? 'static'}
          className="text-muted-foreground px-2 py-1.5 text-xs font-medium"
        >
          {pickTruncationMessage(fallbackSearchState, truncatedMessage)}
        </div>
      )}
      <div
        ref={listRef}
        data-slot="picker-menu-list"
        data-virtualized={shouldVirtualize ? 'true' : 'false'}
        className="max-h-[300px] overflow-y-auto p-1"
      >
        {sections === undefined ? (
          shouldVirtualize ? (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((vr) => {
                const item = flatOrdered[vr.index];
                if (!item) return null;
                const id = getItemId(item);
                const isSelected = selectedIds.has(id);
                const itemContent = (
                  <>
                    {mode === 'multi' && (
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                        tabIndex={-1}
                      />
                    )}
                    {renderItem(item, isSelected)}
                    {mode === 'single' && isSelected && (
                      <Check className="ml-auto size-4 opacity-70" />
                    )}
                  </>
                );
                if (itemPreview) {
                  return (
                    <ContextMenuItemHoverCard
                      key={id}
                      ref={vr.index === 0 ? firstItemRef : undefined}
                      data-selected={isSelected}
                      closeOnClick={mode !== 'multi'}
                      preview={itemPreview(item, isSelected)}
                      previewSide={previewSide ?? 'right'}
                      previewClassName={previewClassName}
                      interactive={previewInteractive}
                      openDelay={previewDelay}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${vr.size}px`,
                        transform: `translateY(${vr.start}px)`,
                      }}
                      onClick={() => handleSelect(item, mode)}
                    >
                      {itemContent}
                    </ContextMenuItemHoverCard>
                  );
                }
                return (
                  <ContextMenuItem
                    key={id}
                    ref={vr.index === 0 ? firstItemRef : undefined}
                    data-selected={isSelected}
                    closeOnClick={mode !== 'multi'}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${vr.size}px`,
                      transform: `translateY(${vr.start}px)`,
                    }}
                    onClick={() => handleSelect(item, mode)}
                  >
                    {itemContent}
                  </ContextMenuItem>
                );
              })}
            </div>
          ) : (
            flatOrdered.map((item, idx) => {
              const id = getItemId(item);
              const isSelected = selectedIds.has(id);
              const itemContent = (
                <>
                  {mode === 'multi' && (
                    <Checkbox checked={isSelected} className="pointer-events-none" tabIndex={-1} />
                  )}
                  {renderItem(item, isSelected)}
                  {mode === 'single' && isSelected && (
                    <Check className="ml-auto size-4 opacity-70" />
                  )}
                </>
              );
              if (itemPreview) {
                return (
                  <ContextMenuItemHoverCard
                    key={id}
                    ref={idx === 0 ? firstItemRef : undefined}
                    data-selected={isSelected}
                    closeOnClick={mode !== 'multi'}
                    preview={itemPreview(item, isSelected)}
                    previewSide={previewSide ?? 'right'}
                    previewClassName={previewClassName}
                    interactive={previewInteractive}
                    openDelay={previewDelay}
                    onClick={() => handleSelect(item, mode)}
                  >
                    {itemContent}
                  </ContextMenuItemHoverCard>
                );
              }
              return (
                <ContextMenuItem
                  key={id}
                  ref={idx === 0 ? firstItemRef : undefined}
                  data-selected={isSelected}
                  closeOnClick={mode !== 'multi'}
                  onClick={() => handleSelect(item, mode)}
                >
                  {itemContent}
                </ContextMenuItem>
              );
            })
          )
        ) : (
          filteredSections.map((section, sIdx) => {
            const sectionMode = section.mode ?? mode;
            const ordered = pinSelectedAtTop(section.items);
            return (
              <React.Fragment key={section.id}>
                {sIdx > 0 && <ContextMenuSeparator />}
                <ContextMenuGroup>
                  <ContextMenuLabel>{section.label}</ContextMenuLabel>
                  {ordered.map((item, iIdx) => {
                    const id = getItemId(item);
                    const isSelected = selectedIds.has(id);
                    const itemContent = (
                      <>
                        {sectionMode === 'multi' && (
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none"
                            tabIndex={-1}
                          />
                        )}
                        {renderItem(item, isSelected)}
                        {sectionMode === 'single' && isSelected && (
                          <Check className="ml-auto size-4 opacity-70" />
                        )}
                      </>
                    );
                    if (itemPreview) {
                      return (
                        <ContextMenuItemHoverCard
                          key={id}
                          data-selected={isSelected}
                          closeOnClick={sectionMode !== 'multi'}
                          preview={itemPreview(item, isSelected)}
                          previewSide={previewSide ?? 'right'}
                          previewClassName={previewClassName}
                          interactive={previewInteractive}
                          openDelay={previewDelay}
                          onClick={() => handleSelect(item, sectionMode, section.items)}
                        >
                          {itemContent}
                        </ContextMenuItemHoverCard>
                      );
                    }
                    return (
                      <ContextMenuItem
                        key={id}
                        ref={sIdx === 0 && iIdx === 0 ? firstItemRef : undefined} // First item of first non-empty section; may be unreachable if search filters it out.
                        data-selected={isSelected}
                        closeOnClick={sectionMode !== 'multi'}
                        onClick={() => handleSelect(item, sectionMode, section.items)}
                      >
                        {itemContent}
                      </ContextMenuItem>
                    );
                  })}
                </ContextMenuGroup>
              </React.Fragment>
            );
          })
        )}
        {children}
        {/* Cross-submenu search results (root PickerMenu only).
            NOTE (tech debt, MEE-1766): for tRPC-backed submenus (TagPicker) this causes
            all per-category queries to have their items available here, which may trigger
            unnecessary rendering. Deferred per spec. */}
        {crossSubmenuResults.length > 0 && (
          <>
            {crossSubmenuResults.map(({ reg, item }) => {
              const isSelected = reg.value.some((v) => reg.getItemId(v) === reg.getItemId(item));
              return (
                <ContextMenuItem
                  key={`${reg.id}-${reg.getItemId(item)}`}
                  closeOnClick={reg.mode !== 'multi'}
                  onClick={() => reg.onSelect(item)}
                >
                  {reg.mode === 'multi' && (
                    <Checkbox checked={isSelected} className="pointer-events-none" tabIndex={-1} />
                  )}
                  <span className="text-muted-foreground">{reg.label} →</span>
                  {reg.renderItem(item, isSelected)}
                  {reg.mode === 'single' && isSelected && (
                    <Check className="ml-auto size-4 opacity-70" />
                  )}
                </ContextMenuItem>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Root picker composition. See `PickerMenuProps` for the full surface.
 */
export function PickerMenu<T>(props: PickerMenuProps<T>) {
  const {
    trigger,
    open: controlledOpen,
    onOpenChange,
    onSearchChange: onSearchChangeProp,
    ...rest
  } = props;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isControlled] = React.useState(() => controlledOpen !== undefined);
  const open = isControlled ? (controlledOpen ?? false) : internalOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  // Selected-at-top edge snapshot — owned here (not in body) so the edge is
  // detected even if ContextMenuContent unmounts its children while closed.
  //
  // NOTE: Synchronous render-phase mutation of a ref is intentional here.
  // It is gated on an open-state edge transition so it cannot loop.
  const selectedSnapshotRef = React.useRef<{ ids: string[] } | null>(null);
  const prevOpenRef = React.useRef<boolean>(open);
  const prevOpen = prevOpenRef.current;
  if (prevOpen === false && open === true) {
    selectedSnapshotRef.current = { ids: rest.value.map(rest.getItemId) };
  } else if (prevOpen === true && open === false) {
    selectedSnapshotRef.current = null;
  }
  prevOpenRef.current = open;

  // Cross-submenu search context: manage registrations map and search state.
  const [search, setSearch] = React.useState('');
  const [registrations, setRegistrations] = React.useState(
    () => new Map<string, SubmenuRegistration>()
  );

  const register = React.useCallback((reg: SubmenuRegistration) => {
    setRegistrations((prev) => {
      const next = new Map(prev);
      next.set(reg.id, reg);
      return next;
    });
    return () => {
      setRegistrations((prev) => {
        const next = new Map(prev);
        next.delete(reg.id);
        return next;
      });
    };
  }, []);

  const searchContextValue = React.useMemo<PickerMenuSearchContextValue>(
    () => ({ search, register, registrations }),
    [search, register, registrations]
  );

  const handleSearchChange = React.useCallback(
    (next: string) => {
      setSearch(next);
      onSearchChangeProp?.(next);
    },
    [onSearchChangeProp]
  );

  return (
    <ContextMenu open={open} onOpenChange={setOpen}>
      <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
      <ContextMenuContent data-slot="picker-menu-content" className="min-w-56 p-1">
        <PickerMenuSearchContext.Provider value={searchContextValue}>
          <PickerMenuBody
            {...rest}
            open={open}
            setOpen={setOpen}
            selectedSnapshotRef={selectedSnapshotRef}
            onSearchChange={handleSearchChange}
          />
        </PickerMenuSearchContext.Provider>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Submenu picker composition. Renders inside a parent PickerMenu's content area
 * using ContextMenuSub / ContextMenuSubContent primitives. Open state is always
 * internal (driven by Base UI's submenu primitive).
 */
export function PickerSubMenu<T>(props: PickerSubMenuProps<T>) {
  const { items, sections, getItemId, subTrigger, subTriggerIcon, searchLabel, ...rest } = props;
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  // Selected-at-top edge snapshot — owned here for the same reason as in PickerMenu.
  const selectedSnapshotRef = React.useRef<{ ids: string[] } | null>(null);
  const prevOpenRef = React.useRef<boolean>(open);
  const prevOpen = prevOpenRef.current;
  if (prevOpen === false && open === true) {
    selectedSnapshotRef.current = { ids: rest.value.map(getItemId) };
  } else if (prevOpen === true && open === false) {
    selectedSnapshotRef.current = null;
  }
  prevOpenRef.current = open;

  // Compute the set of IDs that belong to THIS submenu's own items/sections.
  // The checkbox should only reflect selections within this submenu, not the
  // entire parent value array (which may include items from other submenus).
  const submenuItemIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const it of items ?? []) ids.add(getItemId(it));
    for (const section of sections ?? []) {
      for (const it of section.items) ids.add(getItemId(it));
    }
    return ids;
  }, [items, sections, getItemId]);

  const hasOwnSelection = rest.value.some((v) => submenuItemIds.has(getItemId(v)));

  // Register with the parent PickerMenuSearchContext so the root menu can
  // surface our items in cross-submenu search results.
  const { register, search } = React.useContext(PickerMenuSearchContext);
  const resolvedLabel = searchLabel ?? (typeof subTrigger === 'string' ? subTrigger : 'Submenu');

  // Build a stable onSelect callback for cross-submenu selection.
  const onSelectForContext = React.useCallback(
    (item: unknown) => {
      const typedItem = item as T;
      const id = getItemId(typedItem);
      const isSelected = rest.value.some((v) => getItemId(v) === id);
      if (rest.mode === 'single') {
        if (isSelected) {
          rest.onChange(rest.value.filter((v) => getItemId(v) !== id));
        } else {
          rest.onChange([typedItem]);
        }
      } else {
        if (isSelected) {
          rest.onChange(rest.value.filter((v) => getItemId(v) !== id));
        } else {
          rest.onChange([...rest.value, typedItem]);
        }
      }
    },
    // We intentionally include rest as a single dependency group; these are stable
    // enough for registration purposes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rest.mode, rest.value, rest.onChange, getItemId]
  );

  React.useEffect(() => {
    const unregister = register({
      id,
      label: resolvedLabel,
      mode: rest.mode,
      items: items ?? [],
      getItemId: getItemId as (item: unknown) => string,
      getItemLabel: rest.getItemLabel as ((item: unknown) => string) | undefined,
      renderItem: rest.renderItem as (item: unknown, selected: boolean) => React.ReactNode,
      onSelect: onSelectForContext,
      value: rest.value,
    });
    return unregister;
    // Re-register when items, value, mode, or selection handler changes.
  }, [
    register,
    id,
    resolvedLabel,
    rest.mode,
    items,
    getItemId,
    rest.getItemLabel,
    rest.renderItem,
    onSelectForContext,
    rest.value,
  ]);

  // Hide the submenu trigger row when the parent root menu has an active search query.
  // The user can already see matching items inline in the root results list.
  if (search) return null;

  return (
    <ContextMenuSub open={open} onOpenChange={setOpen}>
      <ContextMenuSubTrigger>
        <Checkbox checked={hasOwnSelection} className="pointer-events-none" tabIndex={-1} />
        {subTriggerIcon}
        {subTrigger}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent data-slot="picker-menu-sub-content" className="min-w-56 p-0">
        <PickerMenuBody
          {...rest}
          items={items}
          sections={sections}
          getItemId={getItemId}
          open={open}
          setOpen={setOpen}
          selectedSnapshotRef={selectedSnapshotRef}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
