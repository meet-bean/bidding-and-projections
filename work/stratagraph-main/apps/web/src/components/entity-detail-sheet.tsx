import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@repo/ui';

export interface EntityDetailField {
  label: string;
  value: React.ReactNode;
}

export interface EntityDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Muted text-sm line under the title. */
  subtitle?: React.ReactNode;
  /** Optional status badge rendered next to the title. */
  badge?: React.ReactNode;
  /** Definition list; fields with null/undefined/empty-string values are skipped. */
  fields: EntityDetailField[];
  /** Optional footer (e.g. an Edit button row), separated with top padding. */
  footer?: React.ReactNode;
}

/**
 * Generic right-side detail sheet for admin entities (team, crew, yards,
 * equipment) that have no dedicated detail route. Implements the platform
 * row-click contract: clicking a list row always opens the record.
 */
export function EntityDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  fields,
  footer,
}: EntityDetailSheetProps) {
  const visibleFields = fields.filter(
    (f) => f.value !== null && f.value !== undefined && f.value !== ''
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-[480px] data-[side=right]:sm:max-w-[480px]"
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">{title}</SheetTitle>
            {badge}
          </div>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        </SheetHeader>
        <div className="px-4 pb-4">
          <div className="space-y-1.5">
            {visibleFields.map((f) => (
              <div
                key={f.label}
                className="flex items-baseline justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                  {f.label}
                </span>
                <span className="text-right font-medium tabular-nums">{f.value}</span>
              </div>
            ))}
          </div>
          {footer ? <div className="pt-4">{footer}</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
