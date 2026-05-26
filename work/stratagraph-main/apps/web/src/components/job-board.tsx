import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@repo/ui';
import { ChevronLeft, ChevronRight, Calendar, Zap, Users, Truck } from 'lucide-react';
import { useStore, REGION_LABELS, JOB_STATUS_LABELS } from '~/lib/store';
import type { JobStatus } from '~/lib/types';

// Stratagraph palette → status mapping.
const STATUS_TONE: Record<JobStatus, { bar: string; ring: string }> = {
  active: { bar: 'bg-strat-green', ring: 'ring-strat-green/30' },
  scheduled: { bar: 'bg-strat-indigo', ring: 'ring-strat-indigo/30' },
  speculative: { bar: 'bg-strat-gold', ring: 'ring-strat-gold/30' },
  completed: { bar: 'bg-strat-slate', ring: 'ring-strat-slate/30' },
  cancelled: { bar: 'bg-strat-coral', ring: 'ring-strat-coral/30' },
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000
  );
}
function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DEFAULT_DAYS = 28;
const DEFAULT_COL_WIDTH = 36;
const DEFAULT_START_OFFSET = -7; // window starts 7 days before today by default

function defaultWindowStart(): string {
  return addDays(todayIso(), DEFAULT_START_OFFSET);
}

interface JobBoardProps {
  /** Show the View Mode toggle (By Job / By Unit / By Crew). Defaults to true. */
  showViewToggle?: boolean;
}

export function JobBoard({ showViewToggle = true }: JobBoardProps) {
  const navigate = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const units = useStore((s) => s.units);
  // Pull the stable users array from the store; do the filter in a memo so we
  // don't return a fresh array ref from the selector on every render
  // (that pattern causes an infinite render loop with Zustand's Object.is check).
  const allUsers = useStore((s) => s.users);
  const employees = useMemo(() => allUsers.filter((u) => u.role === 'field_crew'), [allUsers]);

  // Compact default window (≈1 month) anchored around today. Demoable + scales.
  const [windowStart, setWindowStart] = useState<string>(defaultWindowStart);
  const daysVisible = DEFAULT_DAYS;
  const colWidth = DEFAULT_COL_WIDTH;
  const [groupBy, setGroupBy] = useState<'job' | 'unit' | 'crew'>('job');

  const today = todayIso();
  const dates = useMemo(
    () => Array.from({ length: daysVisible }, (_, i) => addDays(windowStart, i)),
    [windowStart, daysVisible]
  );
  const windowEnd = dates[dates.length - 1]!;

  // Row visibility rules:
  //  - active / scheduled → ALWAYS show as a row (they have committed dates)
  //  - completed          → show only when its date range overlaps the visible window
  //  - speculative        → exclude entirely; no committed dates means nothing to draw
  //  - cancelled          → exclude
  // Speculative jobs still appear in the table below — they're sales pipeline, not
  // calendar work.
  const allRowJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.status === 'cancelled' || j.status === 'speculative') return false;
      if (j.status === 'active' || j.status === 'scheduled') return true;
      // completed → overlap with window
      const start = j.startDate ?? '';
      const end = j.endDate ?? '9999-12-31';
      return !(end < windowStart || start > windowEnd);
    });
  }, [jobs, windowStart, windowEnd]);
  const stepDays = Math.max(7, Math.round(daysVisible / 2));

  const rows = useMemo(() => {
    if (groupBy === 'job') {
      return allRowJobs.map((j) => ({
        id: j.id,
        label: j.wellName,
        sublabel: j.jobNumber,
        meta: customers.find((c) => c.id === j.customerId)?.name ?? '',
        jobIds: [j.id],
      }));
    }
    if (groupBy === 'unit') {
      const yardsById = new Map(useStore.getState().yards.map((y) => [y.id, y]));
      return units.map((u) => ({
        id: u.id,
        label: u.code,
        sublabel: u.type.replace('_', ' '),
        meta: yardsById.get(u.yardId)?.name ?? '',
        jobIds: allRowJobs.filter((j) => j.unitId === u.id).map((j) => j.id),
      }));
    }
    return employees.map((e) => ({
      id: e.id,
      label: e.name,
      sublabel: e.crewRole ? e.crewRole.replace('_', ' ') : 'crew',
      meta: e.region ? REGION_LABELS[e.region] : '',
      jobIds: allRowJobs
        .filter((j) => j.dayLoggerId === e.id || j.nightLoggerId === e.id)
        .map((j) => j.id),
    }));
  }, [groupBy, allRowJobs, customers, units, employees]);

  const populatedRows = rows.filter((r) => r.jobIds.length > 0);
  const emptyRows = rows.filter((r) => r.jobIds.length === 0);

  return (
    <div className="min-w-0">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {showViewToggle ? <GroupByToggle value={groupBy} onChange={setGroupBy} /> : <div />}
        <WindowStepper
          start={windowStart}
          end={windowEnd}
          onPrev={() => setWindowStart(addDays(windowStart, -stepDays))}
          onNext={() => setWindowStart(addDays(windowStart, stepDays))}
          onToday={() => setWindowStart(defaultWindowStart())}
        />
      </div>

      {/* Legend */}
      <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-3 text-[11px]">
        <LegendSwatch tone="active" label="Active" />
        <LegendSwatch tone="scheduled" label="Scheduled" />
        <LegendSwatch tone="completed" label="Completed" />
      </div>

      {/* Gantt */}
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          <div className="flex border-b">
            <div className="bg-muted/40 sticky left-0 z-20 w-[220px] shrink-0 border-r p-2 text-xs font-semibold uppercase tracking-wider">
              {groupBy === 'job' ? 'Job' : groupBy === 'unit' ? 'Unit' : 'Crew'}
            </div>
            <div className="flex">
              {dates.map((d, i) => {
                const dt = new Date(d + 'T00:00:00');
                const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                const isToday = d === today;
                const isMonday = dt.getDay() === 1;
                return (
                  <div
                    key={d}
                    className={cn(
                      'relative text-center text-[10px] font-medium',
                      isWeekend ? 'bg-muted/40' : 'bg-muted/10',
                      isToday && 'bg-primary/15'
                    )}
                    style={{ width: colWidth, height: 38 }}
                  >
                    {(i === 0 || isMonday) ? (
                      <div className="text-muted-foreground absolute top-0.5 w-full text-[9px] uppercase">
                        {dt.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'tabular-nums',
                        isToday ? 'text-primary font-bold' : ''
                      )}
                      style={{ marginTop: 14 }}
                    >
                      {dt.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {populatedRows.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No {groupBy === 'job' ? 'jobs' : groupBy === 'unit' ? 'units' : 'crew'} active in
              this window. Try stepping forward or back.
            </div>
          ) : (
            populatedRows.map((row) => (
              <BoardRow
                key={row.id}
                label={row.label}
                sublabel={row.sublabel}
                meta={row.meta}
                dates={dates}
                today={today}
                jobIds={row.jobIds}
                allJobs={allRowJobs}
                colWidth={colWidth}
                onJobClick={(jobId) => navigate({ to: '/jobs/$jobId', params: { jobId } })}
                groupBy={groupBy}
              />
            ))
          )}

          {emptyRows.length > 0 && groupBy !== 'job' ? (
            <details className="border-t">
              <summary className="text-muted-foreground hover:bg-muted/20 cursor-pointer px-3 py-2 text-xs">
                {emptyRows.length} {groupBy === 'unit' ? 'idle unit' : 'available employee'}
                {emptyRows.length === 1 ? '' : 's'} with no jobs in this window
              </summary>
              {emptyRows.map((row) => (
                <BoardRow
                  key={row.id}
                  label={row.label}
                  sublabel={row.sublabel}
                  meta={row.meta}
                  dates={dates}
                  today={today}
                  jobIds={[]}
                  allJobs={[]}
                  onJobClick={() => {}}
                  groupBy={groupBy}
                  colWidth={colWidth}
                  muted
                />
              ))}
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BoardRow({
  label,
  sublabel,
  meta,
  dates,
  today,
  jobIds,
  allJobs,
  onJobClick,
  groupBy,
  colWidth,
  muted,
}: {
  label: string;
  sublabel: string;
  meta: string;
  dates: string[];
  today: string;
  jobIds: string[];
  allJobs: import('~/lib/types').Job[];
  onJobClick: (jobId: string) => void;
  groupBy: 'job' | 'unit' | 'crew';
  colWidth: number;
  muted?: boolean;
}) {
  const windowStart = dates[0]!;
  const windowEnd = dates[dates.length - 1]!;
  const jobsForRow = useMemo(() => allJobs.filter((j) => jobIds.includes(j.id)), [allJobs, jobIds]);

  return (
    <div className={cn('group flex border-b last:border-b-0', muted && 'opacity-60')}>
      <div className="bg-background group-hover:bg-muted/30 sticky left-0 z-20 w-[220px] shrink-0 border-r p-2 shadow-[1px_0_0_var(--border)]">
        <div className="flex items-start gap-1.5">
          {groupBy === 'unit' ? <Truck className="text-muted-foreground mt-0.5 size-3.5 shrink-0" /> : null}
          {groupBy === 'crew' ? <Users className="text-muted-foreground mt-0.5 size-3.5 shrink-0" /> : null}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{label}</div>
            <div className="text-muted-foreground truncate text-[10px] capitalize">
              {sublabel} {meta ? <span className="opacity-70">· {meta}</span> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex">
        {dates.map((d) => {
          const dt = new Date(d + 'T00:00:00');
          const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
          const isToday = d === today;
          return (
            <div
              key={d}
              className={cn(
                'border-r border-r-muted/40',
                isWeekend ? 'bg-muted/20' : 'bg-background',
                isToday ? 'bg-primary/10' : ''
              )}
              style={{ width: colWidth, height: 48 }}
            />
          );
        })}
        {/* Today vertical rule — runs full height of the row, on top of bars */}
        {(() => {
          const todayIdx = dates.indexOf(today);
          if (todayIdx < 0) return null;
          return (
            <div
              aria-hidden
              className="bg-primary pointer-events-none absolute top-0 z-20 h-full w-px opacity-60"
              style={{ left: todayIdx * colWidth + colWidth / 2 }}
            />
          );
        })()}
        {jobsForRow.map((j) => {
          const rawStart = j.startDate ?? windowStart;
          const start = rawStart < windowStart ? windowStart : rawStart;
          // No endDate (active or scheduled-future) → bar extends to windowEnd;
          // the job is still running, so visually it stretches beyond today.
          // Has endDate (completed) → bar runs to endDate.
          const rawEnd = j.endDate ?? windowEnd;
          const end = rawEnd > windowEnd ? windowEnd : rawEnd;
          if (start > end) return null;
          const startIdx = dates.indexOf(start);
          const endIdx = dates.indexOf(end);
          if (startIdx < 0 || endIdx < 0) return null;
          const tone = STATUS_TONE[j.status];
          // Subtext: "Nd in" for active, "Starts in Nd" for future-scheduled,
          // "Nd run" for completed jobs.
          let subtext = '';
          if (j.startDate) {
            const daysFromStart = daysBetween(j.startDate, today);
            if (j.status === 'active' && daysFromStart >= 0) {
              subtext = `${daysFromStart + 1}d in`;
            } else if (j.status === 'scheduled' && daysFromStart < 0) {
              subtext = `Starts in ${Math.abs(daysFromStart)}d`;
            } else if (j.status === 'completed' && j.endDate) {
              const runLen = daysBetween(j.startDate, j.endDate) + 1;
              subtext = `${runLen}d`;
            }
          }
          const barWidth = (endIdx - startIdx + 1) * colWidth - 4;
          const showSubtext = subtext && barWidth >= 90;
          return (
            <Tooltip key={j.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onJobClick(j.id)}
                    className={cn(
                      'absolute z-10 flex h-7 items-center gap-1 overflow-hidden whitespace-nowrap rounded-md px-2 text-[11px] font-medium ring-1 transition-all hover:h-8 hover:shadow-md',
                      tone.bar,
                      tone.ring,
                      j.status === 'speculative' && 'border border-dashed',
                      'text-white'
                    )}
                    style={{
                      left: startIdx * colWidth + 2,
                      top: 10,
                      width: barWidth,
                    }}
                  >
                    {j.isCallOut ? <Zap className="size-3 shrink-0" /> : null}
                    <span className="truncate">{j.wellName}</span>
                    {showSubtext ? (
                      <span className="ml-auto pl-2 text-[10px] opacity-80">{subtext}</span>
                    ) : null}
                  </button>
                }
              />
              <TooltipContent>
                <div className="space-y-1">
                  <div className="font-medium">{j.wellName}</div>
                  <div className="text-muted-foreground text-xs">
                    {j.jobNumber} · {JOB_STATUS_LABELS[j.status]}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {j.startDate ? formatShortDate(j.startDate) : '—'}
                    {j.endDate ? ` → ${formatShortDate(j.endDate)}` : ' → present'}
                  </div>
                  {subtext ? (
                    <div className="text-foreground text-xs font-medium">{subtext}</div>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function GroupByToggle({
  value,
  onChange,
}: {
  value: 'job' | 'unit' | 'crew';
  onChange: (v: 'job' | 'unit' | 'crew') => void;
}) {
  const options: { value: 'job' | 'unit' | 'crew'; label: string }[] = [
    { value: 'job', label: 'By Job' },
    { value: 'unit', label: 'By Unit' },
    { value: 'crew', label: 'By Crew' },
  ];
  return (
    <div className="bg-muted/40 flex items-center gap-0.5 rounded-md border p-0.5">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(opt.value)}
          className="h-7 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

function WindowStepper({
  start,
  end,
  onPrev,
  onNext,
  onToday,
}: {
  start: string;
  end: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="bg-muted/40 flex items-center gap-1 rounded-md border p-1">
      <Button variant="ghost" size="icon-sm" onClick={onPrev} aria-label="Previous">
        <ChevronLeft />
      </Button>
      <div className="flex flex-col items-center px-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Calendar className="text-muted-foreground size-3" />
          {formatShortDate(start)} → {formatShortDate(end)}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onToday}
          className="text-primary hover:bg-primary/10 mt-0.5 h-5 px-2 text-[10px] font-medium"
        >
          Jump to today
        </Button>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label="Next">
        <ChevronRight />
      </Button>
    </div>
  );
}

function LegendSwatch({ tone, label }: { tone: JobStatus; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('inline-block h-3 w-5 rounded-sm', STATUS_TONE[tone].bar)} />
      {label}
    </span>
  );
}
