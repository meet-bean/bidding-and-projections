'use client';

import { cn } from '@repo/ui';
import { formatCurrency, formatNumber, formatPercent, lensVsPrev, lensVsOrig, lensLeftToSpend } from '@repo/projections';
import type { ProjectionItem, ProjectionProject, TimeSlice } from '@repo/projections';

interface ProjectionRowDetailProps {
  item: ProjectionItem;
  project: ProjectionProject;
  onUpdateForecast: (lineKey: string, patch: { qty?: number; hours?: number; cost?: number }) => void;
}

function DeviationBanner({ item }: { item: ProjectionItem }) {
  const deviations: { label: string; pct: number; detail: string }[] = [];

  if (item.CTD.qty > 0 && item.F.qty > 0) {
    const ctdUC = item.CTD.cost / item.CTD.qty;
    const fUC = item.F.cost / item.F.qty;
    if (fUC > 0) {
      const pct = ((ctdUC - fUC) / fUC) * 100;
      if (Math.abs(pct) >= 20)
        deviations.push({ label: 'UC deviation', pct, detail: `CTD $${ctdUC.toFixed(2)} vs F $${fUC.toFixed(2)}` });
    }
  }

  if (item.CTD.qty > 0 && item.CTD.hours > 0) {
    const ctdMPU = item.CTD.hours / item.CTD.qty;
    const ref = item.Est.qty > 0 && item.Est.hours > 0 ? item.Est : item.F;
    if (ref.qty > 0 && ref.hours > 0) {
      const refMPU = ref.hours / ref.qty;
      const pct = ((ctdMPU - refMPU) / refMPU) * 100;
      if (Math.abs(pct) >= 25)
        deviations.push({ label: 'MH/U deviation', pct, detail: `Running ${ctdMPU.toFixed(2)} vs ref ${refMPU.toFixed(2)}` });
    }
  }

  const ctcQty = item.F.qty - item.CTD.qty;
  const ctcCost = item.F.cost - item.CTD.cost;
  if (ctcQty > 0 && ctcCost > 0 && item.CTD.qty > 0) {
    const ctcUC = ctcCost / ctcQty;
    const ctdUC = item.CTD.cost / item.CTD.qty;
    if (ctdUC > 0) {
      const pct = ((ctcUC - ctdUC) / ctdUC) * 100;
      if (pct < -30)
        deviations.push({ label: 'CTC realism', pct, detail: `CTC $${ctcUC.toFixed(2)} vs run rate $${ctdUC.toFixed(2)}` });
    }
  }

  if (deviations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
      {deviations.map((d) => (
        <div key={d.label} className="text-[13px]">
          <span className="font-medium text-destructive">{d.label}</span>
          <span className="ml-1 text-destructive/80">{formatPercent(d.pct, 0)}</span>
          <span className="ml-1.5 text-muted-foreground">{d.detail}</span>
        </div>
      ))}
    </div>
  );
}

const SLICE_NAMES = ['Est', 'CTD', 'CTC', 'F', 'CTP'] as const;
const SLICE_LABELS: Record<string, string> = { Est: 'Estimate', CTD: 'Cost to Date', CTC: 'Cost to Complete', F: 'Forecast', CTP: 'This Period' };
const SLICE_TINT_VAR: Record<string, string> = { Est: '--slice-est', CTD: '--slice-ctd', CTC: '--slice-ctc', F: '--slice-f', CTP: '--slice-ctp' };

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function SliceCard({ slice, label, tintVar, highlight }: { slice: TimeSlice; label: string; tintVar: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border bg-card p-2.5 space-y-2',
        highlight && 'ring-1 ring-primary/40',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: `var(${tintVar})` }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
        <MetricRow label="Qty" value={formatNumber(slice.qty, 1)} />
        <MetricRow label="Hours" value={formatNumber(slice.hours, 1)} />
        <MetricRow label="Cost" value={formatCurrency(slice.cost)} />
        <MetricRow label="UC" value={`$${slice.uc.toFixed(2)}`} />
        <MetricRow label="MH/U" value={slice.mpu.toFixed(2)} />
        <MetricRow label="U/MH" value={slice.upm.toFixed(2)} />
      </div>
    </div>
  );
}

export function ProjectionRowDetail({ item, project, onUpdateForecast: _onUpdateForecast }: ProjectionRowDetailProps) {
  const vsPrev = lensVsPrev(project, item.lineKey);
  const vsOrig = lensVsOrig(project, item.lineKey);
  const lts = lensLeftToSpend(project, item.lineKey);

  return (
    // Pinned to the grid's visible width (--grid-vw, published by ProjectionTable)
    // and stuck to the left of the horizontal scroll, so the panel stays fully
    // in view instead of stretching across the full multi-thousand-px table.
    <div
      className="sticky left-0 space-y-3 border-y bg-background px-4 py-3"
      style={{ width: 'var(--grid-vw, 100%)' }}
    >
      <DeviationBanner item={item} />

      <div className="grid grid-cols-5 gap-2">
        {SLICE_NAMES.map((name) => (
          <SliceCard
            key={name}
            slice={item[name]}
            label={SLICE_LABELS[name]!}
            tintVar={SLICE_TINT_VAR[name]!}
            highlight={name === 'F'}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-md border bg-muted/30 px-3 py-2 text-[13px]">
        {lts && (
          <div>
            <span className="text-muted-foreground">Left to spend:</span>
            <span className={cn('ml-1 font-medium tabular-nums', lts.delta < 0 && 'text-destructive')}>
              {formatCurrency(lts.delta)}
              {lts.delta < 0 && ' OVER BUDGET'}
            </span>
          </div>
        )}
        {vsPrev && Math.abs(vsPrev.delta) > 0 && (
          <div>
            <span className="text-muted-foreground">Change from previous:</span>
            <span className={cn('ml-1 tabular-nums', vsPrev.delta > 0 ? 'text-destructive' : 'text-success')}>
              {formatCurrency(vsPrev.delta)} ({formatPercent(vsPrev.pct)})
            </span>
          </div>
        )}
        {vsOrig && Math.abs(vsOrig.delta) > 0 && (
          <div>
            <span className="text-muted-foreground">Change from original bid:</span>
            <span className={cn('ml-1 tabular-nums', vsOrig.delta > 0 ? 'text-destructive' : 'text-success')}>
              {formatCurrency(vsOrig.delta)} ({formatPercent(vsOrig.pct)})
            </span>
          </div>
        )}
        {item.calcHrs > 0 && (
          <div>
            <span className="text-muted-foreground">Calculated hours:</span>
            <span className="ml-1 tabular-nums">{formatNumber(item.calcHrs, 1)}</span>
          </div>
        )}
        {item.wsRisk !== 0 && (
          <div>
            <span className="text-muted-foreground">Risk $:</span>
            <span className={cn('ml-1 tabular-nums', item.wsRisk < 0 ? 'text-destructive' : 'text-success')}>
              {formatCurrency(item.wsRisk)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
