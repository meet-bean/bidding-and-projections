/**
 * Linear-style composer vocabulary, shared by create/edit screens (bid editor,
 * new job, …). A composer is: a large quiet title, a row of compact property
 * chips, ghost text inputs, hairline dividers — no boxed labeled-dropdown cards.
 */

/** Property chip: compact, quiet border, icon + value. Apply to SelectTrigger. */
export const CHIP_CLASS =
  "h-7 gap-1.5 rounded-md border-border/80 px-2.5 text-xs font-medium shadow-none hover:bg-muted/60 dark:bg-transparent dark:hover:bg-muted/40 [&_svg:not([class*='size-'])]:size-3.5";

/** Same chip look for non-interactive (locked / read-only) values. */
export const CHIP_STATIC_CLASS =
  'flex h-7 items-center gap-1.5 rounded-md border border-border/80 px-2.5 text-xs font-medium [&_svg]:size-3.5';
