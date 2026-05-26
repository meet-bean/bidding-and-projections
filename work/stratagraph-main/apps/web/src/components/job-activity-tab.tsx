import { useMemo, useState } from 'react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';
import { Lock } from 'lucide-react';
import { useStore } from '~/lib/store';
import { DAILY_CODE_META } from '~/data/service-catalog';
import type { DailyCode, Invoice, Job } from '~/lib/types';

/**
 * Date-rows entry grid for a single job — mirrors the client's spreadsheet.
 * Columns: Date | Activity (text) | Day Crew | Day Mi | Night Crew | Night Mi
 *   | one column per active daily code (toggleable — X on / blank off).
 *
 * Display rules:
 *  - Only codes that have been turned on for THIS job get a column. We don't
 *    surface every bid code — that crowds the grid for jobs running a slim
 *    service mix.
 *  - Running days show 'X'; off days are blank. Per-day quantity numbers were
 *    removed (the customer doesn't track them at this level — yet).
 *  - Rows inside a billed ticket's date range are locked: cells can't toggle,
 *    a small lock icon appears at the date, the row gets a muted background.
 */
interface Props {
  job: Job;
}

const DEFAULT_DAYS = 30;

function buildDateRange(start: string | undefined, end: string | undefined): string[] {
  if (!start) return [];
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(Math.max(s.getTime(), Date.now()));
  // Cap to DEFAULT_DAYS so wide jobs stay scannable in the demo.
  if ((e.getTime() - s.getTime()) / 86_400_000 > DEFAULT_DAYS - 1) {
    s.setTime(e.getTime() - (DEFAULT_DAYS - 1) * 86_400_000);
  }
  const out: string[] = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function isDateLocked(date: string, tickets: Invoice[]): Invoice | undefined {
  return tickets.find(
    (t) => t.status !== 'draft' && date >= t.rangeStart && date <= t.rangeEnd
  );
}

export function JobActivityTab({ job }: Props) {
  const allTickets = useStore((s) => s.invoices);
  // Newest-first — ops scrolls into recent days much more than the start of the job.
  const dates = useMemo(
    () => buildDateRange(job.startDate, job.endDate).reverse(),
    [job.startDate, job.endDate]
  );
  const isReadOnly = job.status === 'completed' || job.status === 'cancelled';

  const ticketsForJob = useMemo(
    () => allTickets.filter((t) => t.projectId === job.id),
    [allTickets, job.id]
  );

  // Columns = ONLY codes attached to this job (active or having historical runs).
  // The bid's broader catalog isn't shown — that lives on the bid page.
  const codeColumns = useMemo(() => {
    const set = new Set<DailyCode>(job.activeCodes);
    for (const r of job.serviceRuns) set.add(r.code);
    return DAILY_CODE_META.filter((m) => set.has(m.code));
  }, [job.activeCodes, job.serviceRuns]);

  if (dates.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
        No start date set — assign a start date in the job header to begin daily tracking.
      </div>
    );
  }

  return (
    <div>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <Th>Date</Th>
            <Th className="min-w-[120px]">Activity</Th>
            <Th>Day Crew</Th>
            <Th align="right">Mi</Th>
            <Th>Night Crew</Th>
            <Th align="right">Mi</Th>
            {codeColumns.map((c) => (
              <Th key={c.code} align="center" title={c.label}>
                {c.code === 'GAS_M' ? 'GAS M' : c.code}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((d) => {
            const lockedBy = isDateLocked(d, ticketsForJob);
            // "Unconfirmed" = auto-running days past job.confirmedThrough. Mickey
            // hasn't eyeballed them yet — surface visually but stay subtle.
            const isUnconfirmed =
              !lockedBy &&
              !isReadOnly &&
              (!job.confirmedThrough || d > job.confirmedThrough);
            return (
              <DateRow
                key={d}
                jobId={job.id}
                jobDayLoggerId={job.dayLoggerId}
                jobNightLoggerId={job.nightLoggerId}
                date={d}
                codeColumns={codeColumns.map((c) => c.code)}
                isReadOnly={isReadOnly || !!lockedBy}
                lockedBy={lockedBy}
                isUnconfirmed={isUnconfirmed}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DateRow({
  jobId,
  jobDayLoggerId,
  jobNightLoggerId,
  date,
  codeColumns,
  isReadOnly,
  lockedBy,
  isUnconfirmed,
}: {
  jobId: string;
  jobDayLoggerId?: string;
  jobNightLoggerId?: string;
  date: string;
  codeColumns: DailyCode[];
  isReadOnly: boolean;
  lockedBy?: Invoice;
  isUnconfirmed?: boolean;
}) {
  const allUsers = useStore((s) => s.users);
  const employees = useMemo(() => allUsers.filter((u) => u.role === 'field_crew'), [allUsers]);
  const getCrewForDate = useStore((s) => s.getCrewForDate);
  const getMilesForDate = useStore((s) => s.getMilesForDate);
  const getDailyNote = useStore((s) => s.getDailyNote);
  const setCrewForDate = useStore((s) => s.setCrewForDate);
  const setMilesForDate = useStore((s) => s.setMilesForDate);
  const setDailyNote = useStore((s) => s.setDailyNote);

  const crew = getCrewForDate(jobId, date);
  const miles = getMilesForDate(jobId, date);
  const note = getDailyNote(jobId, date);

  const dt = new Date(date + 'T00:00:00');
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()];
  const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;

  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    if (jobDayLoggerId) ids.add(jobDayLoggerId);
    if (jobNightLoggerId) ids.add(jobNightLoggerId);
    if (crew.dayLoggerId) ids.add(crew.dayLoggerId);
    if (crew.nightLoggerId) ids.add(crew.nightLoggerId);
    return ids;
  }, [jobDayLoggerId, jobNightLoggerId, crew.dayLoggerId, crew.nightLoggerId]);
  const pickableCrew = useMemo(
    () => employees.filter((e) => e.available !== false || referencedIds.has(e.id)),
    [employees, referencedIds]
  );

  return (
    <tr
      className={cn(
        'border-b',
        isWeekend && !lockedBy && !isUnconfirmed && 'bg-muted/10',
        lockedBy && 'bg-muted/40 opacity-70',
        isUnconfirmed && 'bg-strat-gold/[0.04]'
      )}
    >
      <Td className="text-xs tabular-nums">
        <div className="flex items-center gap-2">
          {lockedBy ? (
            <Lock
              className="text-muted-foreground size-3"
              aria-label={`Billed on invoice ${lockedBy.invoiceNumber}`}
            />
          ) : isUnconfirmed ? (
            <span
              className="bg-strat-gold/70 inline-block size-1.5 rounded-full"
              aria-label="Unconfirmed — auto-running"
              title="Auto-running · not yet confirmed by ops"
            />
          ) : null}
          <span className="font-mono">{date}</span>
          <span className="text-muted-foreground text-[10px] uppercase">{dayOfWeek}</span>
        </div>
      </Td>
      <Td>
        <NoteCell
          value={note}
          disabled={isReadOnly}
          onSave={(v) => setDailyNote(jobId, date, v)}
        />
      </Td>
      <Td>
        <CrewCell
          value={crew.dayLoggerId}
          jobDefault={jobDayLoggerId}
          pickable={pickableCrew}
          disabled={isReadOnly}
          onChange={(id) => setCrewForDate(jobId, date, 'day_logger', id)}
        />
      </Td>
      <Td align="right">
        <MilesCell
          value={miles?.dayLoggerMiles}
          disabled={isReadOnly}
          onChange={(v) => setMilesForDate(jobId, date, 'dayLoggerMiles', v)}
        />
      </Td>
      <Td>
        <CrewCell
          value={crew.nightLoggerId}
          jobDefault={jobNightLoggerId}
          pickable={pickableCrew}
          disabled={isReadOnly}
          onChange={(id) => setCrewForDate(jobId, date, 'night_logger', id)}
        />
      </Td>
      <Td align="right">
        <MilesCell
          value={miles?.nightLoggerMiles}
          disabled={isReadOnly}
          onChange={(v) => setMilesForDate(jobId, date, 'nightLoggerMiles', v)}
        />
      </Td>
      {codeColumns.map((c) => (
        <CodeCell key={c} jobId={jobId} date={date} code={c} disabled={isReadOnly} />
      ))}
    </tr>
  );
}

/**
 * Single X / blank cell — click toggles whether the service is running that day.
 * No numeric quantity input.
 */
function CodeCell({
  jobId,
  date,
  code,
  disabled,
}: {
  jobId: string;
  date: string;
  code: DailyCode;
  disabled: boolean;
}) {
  const isCodeRunning = useStore((s) => s.isCodeRunning);
  const toggleException = useStore((s) => s.toggleException);
  const running = isCodeRunning(jobId, date, code);

  return (
    <Td align="center" className="p-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggleException(jobId, date, code)}
        aria-label={running ? `${code} on ${date}, click to mark off` : `${code} off ${date}, click to mark X`}
        className={cn(
          'inline-flex h-7 w-10 items-center justify-center text-sm font-bold transition-colors',
          'focus:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary',
          running ? 'text-primary' : 'text-muted-foreground/20 hover:text-muted-foreground/50',
          disabled && 'cursor-not-allowed hover:text-muted-foreground/20'
        )}
      >
        {running ? 'X' : ''}
      </button>
    </Td>
  );
}

function CrewCell({
  value,
  jobDefault,
  pickable,
  disabled,
  onChange,
}: {
  value?: string;
  jobDefault?: string;
  pickable: { id: string; name: string }[];
  disabled: boolean;
  onChange: (id: string | null) => void;
}) {
  const isOverride = value !== jobDefault && value != null;
  return (
    <Select
      value={value ?? ''}
      onValueChange={(v) => {
        if (v === '__default__') onChange(null);
        else onChange(v || null);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-7 w-full border-0 bg-transparent px-1 text-xs',
          isOverride && 'bg-strat-gold/10'
        )}
      >
        <SelectValue placeholder="—">
          {(v: string) => pickable.find((p) => p.id === v)?.name.split(' ')[0] ?? '—'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {jobDefault ? (
          <SelectItem value="__default__">
            <span className="text-muted-foreground italic">Use job default</span>
          </SelectItem>
        ) : null}
        {pickable.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MilesCell({
  value,
  disabled,
  onChange,
}: {
  value?: number;
  disabled: boolean;
  onChange: (miles: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value != null ? String(value) : '');
  return (
    <Input
      type="number"
      min={0}
      value={display}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft == null) return;
        const trimmed = draft.trim();
        if (trimmed === '') onChange(null);
        else {
          const n = Number(trimmed);
          if (!Number.isNaN(n) && n >= 0) onChange(n);
        }
        setDraft(null);
      }}
      className="h-7 w-16 border-0 bg-transparent px-1 text-right text-xs tabular-nums"
      placeholder="—"
    />
  );
}

function NoteCell({
  value,
  disabled,
  onSave,
}: {
  value?: string;
  disabled: boolean;
  onSave: (text: string | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? value ?? '';
  return (
    <input
      type="text"
      value={display}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft == null) return;
        if (draft !== (value ?? '')) onSave(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder=""
      className="text-foreground placeholder:text-muted-foreground/40 h-7 w-full min-w-[100px] border-0 bg-transparent px-1 text-xs outline-none focus:bg-muted/30 disabled:opacity-60"
    />
  );
}

function Th({
  children,
  className,
  align = 'left',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  title?: string;
}) {
  return (
    <th
      title={title}
      className={cn(
        'bg-background sticky top-0 z-10',
        'border-b p-2 text-xs font-medium uppercase tracking-wider',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  align = 'left',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'border-b p-1',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}
