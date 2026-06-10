'use client';

import { cn } from '@repo/ui';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, lensVsPrev, lensVsOrig, lensLeftToSpend } from '@repo/projections';
import type { ProjectionItem, ProjectionProject } from '@repo/projections';

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
    <div className="flex flex-col gap-1.5">
      {deviations.map((d) => (
        <span
          key={d.label}
          className="border-destructive/20 bg-destructive/5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px]"
        >
          <AlertTriangle className="text-destructive size-3 shrink-0" />
          <span className="text-destructive font-medium">{d.label}</span>
          <span className="text-destructive/80 tabular-nums">{formatPercent(d.pct, 0)}</span>
          <span className="text-muted-foreground">· {d.detail}</span>
        </span>
      ))}
    </div>
  );
}

// Slice rows in the SAME order as the table's column groups (Period → To Date
// → To Complete → Forecast → Original), so the sheet mirrors the table.
const SLICE_ROWS: { key: 'CTP' | 'CTD' | 'CTC' | 'F' | 'Est'; label: string; tintVar: string }[] = [
  { key: 'CTP', label: 'Period', tintVar: '--slice-ctp' },
  { key: 'CTD', label: 'To Date', tintVar: '--slice-ctd' },
  { key: 'CTC', label: 'To Complete', tintVar: '--slice-ctc' },
  { key: 'F', label: 'Forecast', tintVar: '--slice-f' },
  { key: 'Est', label: 'Original', tintVar: '--slice-est' },
];

// Metric columns in the SAME order they appear within each table group:
// Qty → Hours → U/M → M/U → UC → Cost.
const METRIC_COLS: { label: string; value: (s: ProjectionItem['F']) => string }[] = [
  { label: 'Qty', value: (s) => formatNumber(s.qty, 1) },
  { label: 'Hours', value: (s) => formatNumber(s.hours, 1) },
  { label: 'U/M', value: (s) => s.upm.toFixed(2) },
  { label: 'M/U', value: (s) => s.mpu.toFixed(2) },
  { label: 'UC', value: (s) => `$${s.uc.toFixed(2)}` },
  { label: 'Cost', value: (s) => formatCurrency(s.cost) },
];

/**
 * Row detail, rendered inside a side Sheet (replaces the old in-table expand
 * row and its --grid-vw width hack). Layout is a compact matrix on the shared
 * minimal-table language: metric rows × slice columns, micro uppercase headers,
 * muted tabular numbers, horizontal hairlines only.
 */
export function ProjectionRowDetail({ item, project, onUpdateForecast: _onUpdateForecast }: ProjectionRowDetailProps) {
  const vsPrev = lensVsPrev(project, item.lineKey);
  const vsOrig = lensVsOrig(project, item.lineKey);
  const lts = lensLeftToSpend(project, item.lineKey);

  const stats: { label: string; value: string; tone?: 'destructive' | 'success' }[] = [];
  if (lts)
    stats.push({
      label: 'Left to spend',
      value: `${formatCurrency(lts.delta)}${lts.delta < 0 ? ' over budget' : ''}`,
      tone: lts.delta < 0 ? 'destructive' : undefined,
    });
  if (vsPrev && Math.abs(vsPrev.delta) > 0)
    stats.push({
      label: 'Δ previous',
      value: `${formatCurrency(vsPrev.delta)} (${formatPercent(vsPrev.pct)})`,
      tone: vsPrev.delta > 0 ? 'destructive' : 'success',
    });
  if (vsOrig && Math.abs(vsOrig.delta) > 0)
    stats.push({
      label: 'Δ original bid',
      value: `${formatCurrency(vsOrig.delta)} (${formatPercent(vsOrig.pct)})`,
      tone: vsOrig.delta > 0 ? 'destructive' : 'success',
    });
  if (item.calcHrs > 0)
    stats.push({ label: 'Calculated hours', value: formatNumber(item.calcHrs, 1) });
  if (item.wsRisk !== 0)
    stats.push({
      label: 'Risk $',
      value: formatCurrency(item.wsRisk),
      tone: item.wsRisk < 0 ? 'destructive' : 'success',
    });

  return (
    <div className="space-y-5">
      <DeviationBanner item={item} />

      {/* Slice matrix — slices as rows (table group order), metrics as columns
          (table in-group order), so the sheet reads like one table row unfolded.
          Forecast row washed sage. */}
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b">
            <th className="py-1.5 pr-2"></th>
            {METRIC_COLS.map((m) => (
              <th
                key={m.label}
                className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLICE_ROWS.map((s) => (
            <tr key={s.key} className={cn('border-b last:border-b-0', s.key === 'F' && 'bg-[#eef6f2]/60')}>
              <td className="py-1.5 pr-2">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(${s.tintVar})` }}
                  />
                  {s.label}
                </span>
              </td>
              {METRIC_COLS.map((m) => (
                <td
                  key={m.label}
                  className={cn(
                    'px-2 py-1.5 text-right tabular-nums',
                    s.key === 'F' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {m.value(item[s.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {stats.length > 0 && (
        <div className="space-y-1.5">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground text-[11px] uppercase tracking-wide">{s.label}</span>
              <span
                className={cn(
                  'font-medium tabular-nums',
                  s.tone === 'destructive' && 'text-destructive',
                  s.tone === 'success' && 'text-success',
                )}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
