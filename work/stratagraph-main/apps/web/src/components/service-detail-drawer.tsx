import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Button,
} from '@repo/ui';
import { useStore } from '~/lib/store';
import type { ServiceRow } from '~/lib/service-rows';
import { costTypeLabel } from '~/lib/cost-types';

interface ServiceDetailDrawerProps {
  row: ServiceRow | null;
  onClose: () => void;
}

/**
 * Management surface for a single service: edit name/unit, manage aliases,
 * remove from catalog. The per-project unit-cost breakdown lives inline as the
 * expanded row (see ServiceBreakdown) — this drawer is the rarer, heavier
 * "manage this service" path, reached from the row's ⋯ menu.
 */
export function ServiceDetailDrawer({ row, onClose }: ServiceDetailDrawerProps) {
  const editRegistryItemName = useStore((s) => s.editRegistryItemName);
  const setServiceItemUom = useStore((s) => s.setServiceItemUom);
  const setServiceRecommendedRate = useStore((s) => s.setServiceRecommendedRate);
  const separateRegistryAlias = useStore((s) => s.separateRegistryAlias);
  const removeRegistryItem = useStore((s) => s.removeRegistryItem);

  const [nameValue, setNameValue] = useState(row?.name ?? '');
  const [uomValue, setUomValue] = useState(row?.service.unitOfMeasure ?? '');
  const [rateValue, setRateValue] = useState(
    row?.recommendedRateOverride != null ? row.recommendedRateOverride.toFixed(2) : ''
  );

  useEffect(() => {
    setNameValue(row?.name ?? '');
    setUomValue(row?.service.unitOfMeasure ?? '');
    setRateValue(
      row?.recommendedRateOverride != null ? row.recommendedRateOverride.toFixed(2) : ''
    );
  }, [row?.id]);

  const svc = row?.service ?? null;
  const isSuperior = svc?.tenantId === 'superior';

  function commitName() {
    const trimmed = nameValue.trim();
    if (row && trimmed && trimmed !== row.name) editRegistryItemName(row.id, trimmed);
  }
  function commitUom() {
    const trimmed = uomValue.trim();
    if (row && trimmed && trimmed !== row.service.unitOfMeasure) setServiceItemUom(row.id, trimmed);
  }
  function commitRate() {
    if (!row) return;
    const trimmed = rateValue.trim();
    if (trimmed === '') {
      // Cleared → follow the auto (derived) rate again.
      if (row.recommendedRateOverride != null) setServiceRecommendedRate(row.id, null);
      return;
    }
    const n = Number.parseFloat(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      // Invalid → revert the field to the stored override.
      setRateValue(
        row.recommendedRateOverride != null ? row.recommendedRateOverride.toFixed(2) : ''
      );
      return;
    }
    const rounded = Math.round(n * 100) / 100;
    if (rounded !== row.recommendedRateOverride) setServiceRecommendedRate(row.id, rounded);
  }
  function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  const headerBadge =
    svc &&
    (isSuperior ? (
      <span className="text-muted-foreground text-[11px] font-normal">
        {costTypeLabel(svc.costType)}
        <span className="ml-1.5 font-mono text-[10px]">{svc.costType}</span>
      </span>
    ) : (
      <span className="text-muted-foreground text-[11px] font-normal">
        {svc.costType}
      </span>
    ));

  return (
    <Sheet
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="flex w-[400px] flex-col gap-0 p-0 sm:w-[460px]">
        {row && svc && (
          <>
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
                <span>{row.name}</span>
                {headerBadge}
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Editable identity */}
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Canonical name</label>
                  <input
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={blurOnEnter}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Unit of measure</label>
                  <input
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={uomValue}
                    onChange={(e) => setUomValue(e.target.value)}
                    onBlur={commitUom}
                    onKeyDown={blurOnEnter}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Recommended rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm tabular-nums ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={rateValue}
                    placeholder={
                      row.recommendedRateAuto != null
                        ? row.recommendedRateAuto.toFixed(2)
                        : (svc.rateNote ?? 'Not set')
                    }
                    onChange={(e) => setRateValue(e.target.value)}
                    onBlur={commitRate}
                    onKeyDown={blurOnEnter}
                  />
                  {row.recommendedRateAuto != null && (
                    <p className="text-muted-foreground text-xs">
                      Auto from cost history: ${row.recommendedRateAuto.toFixed(2)} — leave
                      empty to follow it.
                    </p>
                  )}
                </div>
              </div>

              {/* Stratagraph identity facts (Superior cost data lives in the row expand) */}
              {!isSuperior && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-xs font-medium text-muted-foreground">Code</dt>
                  <dd>
                    {svc.dailyCode ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {svc.dailyCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </dl>
              )}

              {/* Aliases */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Aliases ({svc.aliases.length})
                </p>
                {svc.aliases.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No aliases. Names that get matched to this service appear here.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {svc.aliases.map((alias) => (
                      <div
                        key={alias.raw}
                        className="flex items-center justify-between gap-2 rounded border px-3 py-1.5"
                      >
                        <span className="text-sm">{alias.raw}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => separateRegistryAlias(row.id, alias.raw)}
                        >
                          Separate
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  removeRegistryItem(row.id);
                  onClose();
                }}
              >
                Remove from catalog
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
