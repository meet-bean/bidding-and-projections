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
import { useStore } from '~/lib/store';
import type { Job } from '~/lib/types';

interface Props {
  job: Job;
}

function buildDateRange(start: string | undefined, end: string | undefined): string[] {
  if (!start) return [];
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(Math.max(s.getTime(), Date.now()));
  if ((e.getTime() - s.getTime()) / 86_400_000 > 31) {
    e.setTime(s.getTime() + 31 * 86_400_000);
  }
  const out: string[] = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function DailyCrewMilesGrid({ job }: Props) {
  const allUsers = useStore((s) => s.users);
  const employees = useMemo(() => allUsers.filter((u) => u.role === 'field_crew'), [allUsers]);
  const getCrewForDate = useStore((s) => s.getCrewForDate);
  const getMilesForDate = useStore((s) => s.getMilesForDate);
  const setCrewForDate = useStore((s) => s.setCrewForDate);
  const setMilesForDate = useStore((s) => s.setMilesForDate);

  const dates = useMemo(
    () => buildDateRange(job.startDate, job.endDate),
    [job.startDate, job.endDate]
  );
  const isReadOnly = job.status === 'completed' || job.status === 'cancelled';

  // Crew dropdown options. Include any employee currently referenced even if
  // unavailable so they stay selectable.
  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    if (job.dayLoggerId) ids.add(job.dayLoggerId);
    if (job.nightLoggerId) ids.add(job.nightLoggerId);
    job.crewAssignments?.forEach((a) => {
      if (a.dayLoggerId) ids.add(a.dayLoggerId);
      if (a.nightLoggerId) ids.add(a.nightLoggerId);
    });
    return ids;
  }, [job.dayLoggerId, job.nightLoggerId, job.crewAssignments]);

  const pickableCrew = useMemo(
    () => employees.filter((e) => e.available !== false || referencedIds.has(e.id)),
    [employees, referencedIds]
  );

  if (dates.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-muted/30">
          <tr>
            <th className="border-b p-2 text-left text-xs font-medium uppercase tracking-wider">
              Date
            </th>
            <th className="border-b p-2 text-left text-xs font-medium uppercase tracking-wider">
              Day Crew
            </th>
            <th className="border-b p-2 text-right text-xs font-medium uppercase tracking-wider">
              Day Mi
            </th>
            <th className="border-b p-2 text-left text-xs font-medium uppercase tracking-wider">
              Night Crew
            </th>
            <th className="border-b p-2 text-right text-xs font-medium uppercase tracking-wider">
              Night Mi
            </th>
            <th className="border-b p-2 text-right text-xs font-medium uppercase tracking-wider">
              Unit Mi
            </th>
          </tr>
        </thead>
        <tbody>
          {dates.map((d) => {
            const crew = getCrewForDate(job.id, d);
            const miles = getMilesForDate(job.id, d);
            const override = job.crewAssignments?.find((a) => a.date === d);
            const dt = new Date(d + 'T00:00:00');
            const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
            return (
              <tr
                key={d}
                className={cn('hover:bg-muted/20', isWeekend && 'bg-muted/10')}
              >
                <td className="border-b p-2 text-xs tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{d}</span>
                    <span className="text-muted-foreground text-[10px] uppercase">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'][dt.getDay()]}
                    </span>
                  </div>
                </td>
                <CrewCell
                  value={crew.dayLoggerId}
                  isOverride={!!override?.dayLoggerId}
                  jobDefault={job.dayLoggerId}
                  pickable={pickableCrew}
                  disabled={isReadOnly}
                  onChange={(id) => setCrewForDate(job.id, d, 'day_logger', id)}
                />
                <MilesCell
                  value={miles?.dayLoggerMiles}
                  disabled={isReadOnly}
                  onChange={(v) => setMilesForDate(job.id, d, 'dayLoggerMiles', v)}
                />
                <CrewCell
                  value={crew.nightLoggerId}
                  isOverride={!!override?.nightLoggerId}
                  jobDefault={job.nightLoggerId}
                  pickable={pickableCrew}
                  disabled={isReadOnly}
                  onChange={(id) => setCrewForDate(job.id, d, 'night_logger', id)}
                />
                <MilesCell
                  value={miles?.nightLoggerMiles}
                  disabled={isReadOnly}
                  onChange={(v) => setMilesForDate(job.id, d, 'nightLoggerMiles', v)}
                />
                <MilesCell
                  value={miles?.unitMiles}
                  disabled={isReadOnly}
                  onChange={(v) => setMilesForDate(job.id, d, 'unitMiles', v)}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CrewCell({
  value,
  isOverride,
  jobDefault,
  pickable,
  disabled,
  onChange,
}: {
  value: string | undefined;
  isOverride: boolean;
  jobDefault: string | undefined;
  pickable: { id: string; name: string }[];
  disabled: boolean;
  onChange: (id: string | null) => void;
}) {
  return (
    <td className="border-b p-1">
      <Select
        value={value ?? ''}
        onValueChange={(v) => {
          // Selecting "default" clears the override; otherwise set an override.
          if (v === '__default__') onChange(null);
          else onChange(v || null);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            'h-8 w-full text-xs',
            isOverride && 'border-strat-gold/40 bg-strat-gold/5'
          )}
        >
          <SelectValue placeholder="—">
            {(v: string) => pickable.find((p) => p.id === v)?.name ?? '—'}
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
    </td>
  );
}

function MilesCell({
  value,
  disabled,
  onChange,
}: {
  value: number | undefined;
  disabled: boolean;
  onChange: (miles: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value != null ? String(value) : '');
  return (
    <td className="border-b p-1">
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
        className="h-8 w-20 text-right text-xs tabular-nums"
        placeholder="—"
      />
    </td>
  );
}
