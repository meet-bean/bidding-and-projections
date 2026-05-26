import { useMemo, useState, useCallback } from 'react';
import { Button, cn } from '@repo/ui';
import { Check, X, Eraser } from 'lucide-react';
import { useStore } from '~/lib/store';
import { DAILY_CODE_META } from '~/data/service-catalog';
import type { DailyCode, Job } from '~/lib/types';

interface Props {
  job: Job;
}

function buildDateRange(start: string | undefined, end: string | undefined): string[] {
  if (!start) return [];
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(Math.max(s.getTime(), Date.now()));
  // Clamp range to 31 days for the grid
  if ((e.getTime() - s.getTime()) / 86_400_000 > 31) {
    e.setTime(s.getTime() + 31 * 86_400_000);
  }
  const out: string[] = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function cellKey(code: DailyCode, date: string) {
  return `${code}__${date}`;
}

export function DailyActivityGrid({ job }: Props) {
  const toggle = useStore((s) => s.toggleException);
  const isCodeRunning = useStore((s) => s.isCodeRunning);
  const dates = useMemo(() => buildDateRange(job.startDate, job.endDate), [job.startDate, job.endDate]);
  // Restrict to codes the job is configured for OR has historical runs in — keeps the
  // grid focused on what actually applies to this job.
  const relevantCodes = useMemo(() => {
    const set = new Set<DailyCode>(job.activeCodes);
    for (const r of job.serviceRuns) set.add(r.code);
    return set;
  }, [job.activeCodes, job.serviceRuns]);
  const services = DAILY_CODE_META.filter((m) => m.kind === 'service' && relevantCodes.has(m.code));
  const modifiers = DAILY_CODE_META.filter(
    (m) => m.kind === 'modifier' && relevantCodes.has(m.code)
  );

  // Cells in the visible order — used to translate "row index × col index" into
  // a cell key for shift-click range selection.
  const rowCodes: DailyCode[] = [...services.map((s) => s.code), ...modifiers.map((m) => m.code)];

  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [anchor, setAnchor] = useState<{ rowIdx: number; colIdx: number } | null>(null);

  const handleCellClick = useCallback(
    (rowIdx: number, colIdx: number, shift: boolean) => {
      const code = rowCodes[rowIdx]!;
      const date = dates[colIdx]!;
      if (!shift || anchor === null) {
        // Plain click → toggle the cell. Clear selection. Set anchor for future shift-click.
        toggle(job.id, date, code);
        setSelection(new Set());
        setAnchor({ rowIdx, colIdx });
        return;
      }
      // Shift-click → select the rectangle from anchor to here.
      const r0 = Math.min(anchor.rowIdx, rowIdx);
      const r1 = Math.max(anchor.rowIdx, rowIdx);
      const c0 = Math.min(anchor.colIdx, colIdx);
      const c1 = Math.max(anchor.colIdx, colIdx);
      const next = new Set<string>();
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          next.add(cellKey(rowCodes[r]!, dates[c]!));
        }
      }
      setSelection(next);
    },
    [anchor, dates, rowCodes, toggle, job.id]
  );

  const clearSelection = useCallback(() => setSelection(new Set()), []);

  const bulkSetRunning = useCallback(
    (target: boolean) => {
      for (const key of selection) {
        const [code, date] = key.split('__') as [DailyCode, string];
        const currently = isCodeRunning(job.id, date, code);
        if (currently !== target) toggle(job.id, date, code);
      }
      setSelection(new Set());
    },
    [selection, isCodeRunning, toggle, job.id]
  );

  if (dates.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
        No start date set — assign a start date to begin daily tracking.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="text-muted-foreground mb-2 text-[11px] leading-snug">
        Click a cell to toggle. <span className="font-medium">Shift-click</span> to select a
        range, then use the bulk actions to fix multiple days at once.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0">
            <tr>
              <th className="bg-muted/40 sticky left-0 z-10 min-w-[180px] border-b border-r p-2 text-left text-xs font-medium uppercase tracking-wider">
                Service
              </th>
              {dates.map((d) => {
                const dt = new Date(d + 'T00:00:00');
                const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                return (
                  <th
                    key={d}
                    className={cn(
                      'border-b p-1 text-center text-xs font-medium tabular-nums',
                      isWeekend ? 'bg-muted/60 text-muted-foreground' : 'bg-muted/20'
                    )}
                    style={{ minWidth: '34px' }}
                  >
                    <div>{dt.getDate()}</div>
                    <div className="text-[10px] uppercase">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'][dt.getDay()]}
                    </div>
                  </th>
                );
              })}
              <th className="bg-muted/40 sticky right-0 z-10 min-w-[60px] border-b border-l p-2 text-center text-xs font-medium uppercase">
                Qty
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={dates.length + 2}
                className="text-muted-foreground bg-muted/30 border-b px-2 py-1 text-[11px] font-semibold uppercase tracking-wider"
              >
                Services
              </td>
            </tr>
            {services.map((s, sIdx) => (
              <GridRow
                key={s.code}
                code={s.code}
                label={s.label}
                jobId={job.id}
                dates={dates}
                rowIdx={sIdx}
                selection={selection}
                onCellClick={handleCellClick}
                isRunning={isCodeRunning}
              />
            ))}
            <tr>
              <td
                colSpan={dates.length + 2}
                className="text-muted-foreground bg-muted/30 border-b px-2 py-1 text-[11px] font-semibold uppercase tracking-wider"
              >
                Modifiers
              </td>
            </tr>
            {modifiers.map((m, mIdx) => (
              <GridRow
                key={m.code}
                code={m.code}
                label={m.label}
                jobId={job.id}
                dates={dates}
                rowIdx={services.length + mIdx}
                selection={selection}
                onCellClick={handleCellClick}
                isRunning={isCodeRunning}
                isModifier
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating bulk-edit bar — appears when 1+ cells are shift-selected */}
      {selection.size > 0 ? (
        <div className="sticky bottom-2 z-30 mt-3 flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-2.5 shadow-lg">
          <div className="text-sm">
            <span className="font-semibold">{selection.size}</span>{' '}
            <span className="text-muted-foreground">
              cell{selection.size === 1 ? '' : 's'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => bulkSetRunning(true)}>
              <Check />
              Turn on
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkSetRunning(false)}>
              <X />
              Turn off
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <Eraser />
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GridRow({
  code,
  label,
  jobId,
  dates,
  rowIdx,
  selection,
  onCellClick,
  isRunning,
  isModifier = false,
}: {
  code: DailyCode;
  label: string;
  jobId: string;
  dates: string[];
  rowIdx: number;
  selection: Set<string>;
  onCellClick: (rowIdx: number, colIdx: number, shift: boolean) => void;
  isRunning: (jobId: string, date: string, code: DailyCode) => boolean;
  isModifier?: boolean;
}) {
  const total = dates.reduce((s, d) => s + (isRunning(jobId, d, code) ? 1 : 0), 0);

  return (
    <tr className="hover:bg-muted/30">
      <td className="bg-background sticky left-0 z-10 border-b border-r p-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-5 min-w-[44px] items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold',
              isModifier ? 'bg-warning/15 text-warning-foreground/80' : 'bg-primary/10 text-primary'
            )}
          >
            {code === 'GAS_M' ? 'GAS M' : code}
          </span>
          <span className="text-foreground">{label}</span>
        </div>
      </td>
      {dates.map((d, colIdx) => {
        const isOn = isRunning(jobId, d, code);
        const isSelected = selection.has(cellKey(code, d));
        const dt = new Date(d + 'T00:00:00');
        const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
        return (
          <td
            key={d}
            className={cn(
              'border-b text-center',
              isWeekend ? 'bg-muted/20' : '',
              isSelected ? 'bg-primary/15' : ''
            )}
            style={{ height: 32 }}
          >
            <button
              type="button"
              onClick={(e) => onCellClick(rowIdx, colIdx, e.shiftKey)}
              className={cn(
                'h-7 w-7 rounded-md text-xs font-bold transition-colors',
                isSelected ? 'ring-primary ring-2 ring-offset-1' : '',
                isOn
                  ? isModifier
                    ? 'bg-warning text-warning-foreground hover:bg-warning/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/80'
                  : 'text-muted-foreground/30 hover:bg-muted hover:text-foreground'
              )}
              aria-label={`${code} on ${d}${isOn ? ' — on, click to mark off' : ' — off, click to mark on'}`}
              title="Click to toggle · Shift-click to range-select"
            >
              {isOn ? 'X' : '·'}
            </button>
          </td>
        );
      })}
      <td className="bg-background sticky right-0 border-b border-l p-2 text-center text-sm font-semibold tabular-nums">
        {total > 0 ? total : <span className="text-muted-foreground">—</span>}
      </td>
    </tr>
  );
}
