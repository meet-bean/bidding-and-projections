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
    <div className="flex flex-wrap gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
      {deviations.map((d) => (
        <div key={d.label} className="text-xs">
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

function SliceCard({ slice, label, tintVar, highlight }: { slice: TimeSlice; label: string; tintVar: string; highlight?: boolean }) {
  return (
    <div
      className={cn('rounded-lg border p-3 space-y-2', highlight && 'ring-1 ring-primary/30')}
      style={{ backgroundColor: `var(${tintVar})` }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Qty</span>
          <span className="ml-2 tabular-nums">{formatNumber(slice.qty, 1)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Hours</span>
          <span className="ml-2 tabular-nums">{formatNumber(slice.hours, 1)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Cost</span>
          <span className="ml-2 font-medium tabular-nums">{formatCurrency(slice.cost)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">UC</span>
          <span className="ml-2 tabular-nums">${slice.uc.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">MH/U</span>
          <span className="ml-2 tabular-nums">{slice.mpu.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">U/MH</span>
          <span className="ml-2 tabular-nums">{slice.upm.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectionRowDetail({ item, project, onUpdateForecast: _onUpdateForecast }: ProjectionRowDetailProps) {
  const vsPrev = lensVsPrev(project, item.lineKey);
  const vsOrig = lensVsOrig(project, item.lineKey);
  const lts = lensLeftToSpend(project, item.lineKey);

  return (
    <div className="space-y-3 px-4 py-3 bg-muted/20">
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

      <div className="flex flex-wrap gap-4 rounded-lg border bg-card px-3 py-2 text-xs">
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
