import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge, cn, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { useStore } from '~/lib/store';
import { DAILY_CODE_META } from '~/data/service-catalog';
import type { DailyCode, Job } from '~/lib/types';
import { ExternalLink } from 'lucide-react';

interface Props {
  jobs: Job[];
  date: string;
  /** When true, also show jobs that aren't currently active. Default false. */
  includeInactive?: boolean;
  emptyMessage?: string;
}

/**
 * Cross-job daily entry: rows are jobs, columns are service + modifier codes.
 * One date at a time. Toggling a cell marks that code as active for that job × that date.
 *
 * This is the morning-routine surface. It replaces Mickey's spreadsheet ritual:
 * see every active job on one screen, mark what happened today.
 */
export function DailyEntryGrid({
  jobs,
  date,
  includeInactive = false,
  emptyMessage = 'No active jobs.',
}: Props) {
  const customers = useStore((s) => s.customers);
  const units = useStore((s) => s.units);
  // Filter in a memo (selector returning a fresh array each render causes a render loop).
  const allUsers = useStore((s) => s.users);
  const employees = useMemo(() => allUsers.filter((u) => u.role === 'field_crew'), [allUsers]);
  const toggle = useStore((s) => s.toggleException);
  const codesRunningOn = useStore((s) => s.codesRunningOn);
  const isDateConfirmed = useStore((s) => s.isDateConfirmed);
  const confirmJobThrough = useStore((s) => s.confirmJobThrough);

  const services = DAILY_CODE_META.filter((m) => m.kind === 'service');
  const modifiers = DAILY_CODE_META.filter((m) => m.kind === 'modifier');

  const visibleJobs = useMemo(() => {
    if (includeInactive) return jobs;
    return jobs.filter((j) => j.status === 'active' || j.status === 'scheduled');
  }, [jobs, includeInactive]);

  if (visibleJobs.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-10 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th
              className="bg-muted/40 sticky left-0 z-10 min-w-[260px] border-b border-r p-2 text-left text-xs font-medium uppercase tracking-wider"
              colSpan={1}
            >
              Job
            </th>
            <th
              className="bg-muted/30 border-b text-center text-[10px] font-semibold uppercase tracking-wider"
              colSpan={services.length}
            >
              Services
            </th>
            <th
              className="bg-warning/10 border-b text-center text-[10px] font-semibold uppercase tracking-wider"
              colSpan={modifiers.length}
            >
              Modifiers
            </th>
            <th className="bg-muted/40 sticky right-0 z-10 min-w-[60px] border-b border-l text-center text-[10px] font-semibold uppercase">
              Total
            </th>
          </tr>
          <tr>
            <th className="bg-background sticky left-0 z-10 border-b border-r p-2 text-left text-xs font-medium">
              <span className="text-muted-foreground">
                {visibleJobs.length} {visibleJobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </th>
            {services.map((s) => (
              <CodeHeader key={s.code} code={s.code} label={s.label} kind="service" />
            ))}
            {modifiers.map((s) => (
              <CodeHeader key={s.code} code={s.code} label={s.label} kind="modifier" />
            ))}
            <th className="bg-background sticky right-0 z-10 border-b border-l" />
          </tr>
        </thead>
        <tbody>
          {visibleJobs.map((job) => {
            const cust = customers.find((c) => c.id === job.customerId);
            const unit = job.unitId ? units.find((u) => u.id === job.unitId) : undefined;
            const dayLogger = job.dayLoggerId
              ? employees.find((e) => e.id === job.dayLoggerId)
              : undefined;
            const running = codesRunningOn(job.id, date);
            const markCount = running.size;
            const confirmed = isDateConfirmed(job.id, date);
            const needsConfirm = markCount > 0 && !confirmed;
            return (
              <tr key={job.id} className="hover:bg-muted/30 group">
                <td className="bg-background group-hover:bg-muted/30 sticky left-0 z-10 border-b border-r p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to="/jobs/$jobId"
                          params={{ jobId: job.id }}
                          className="hover:text-primary truncate text-sm font-medium underline-offset-4 hover:underline"
                        >
                          {job.wellName}
                        </Link>
                        {needsConfirm ? (
                          <span
                            className="bg-warning size-1.5 shrink-0 rounded-full"
                            aria-label="Unconfirmed activity"
                            title="Auto-running activity needs confirmation"
                          />
                        ) : null}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono">{job.jobNumber}</span>
                        <span>·</span>
                        {cust ? (
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: cust.id }}
                            className="hover:text-foreground underline-offset-4 hover:underline"
                          >
                            {cust.name}
                          </Link>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {unit ? (
                          <Badge variant="outline" className="h-5 font-mono text-[10px]">
                            {unit.code}
                          </Badge>
                        ) : null}
                        {dayLogger ? (
                          <span className="text-muted-foreground text-[10px]">
                            {dayLogger.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {needsConfirm ? (
                        <button
                          type="button"
                          onClick={() => confirmJobThrough(job.id, date)}
                          className="text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                          title="Mark today as confirmed for this job"
                        >
                          Confirm
                        </button>
                      ) : null}
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: job.id }}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="View full history for this job"
                      >
                        <ExternalLink className="size-3" />
                        History
                      </Link>
                    </div>
                  </div>
                </td>
                {services.map((s) => (
                  <CodeCell
                    key={s.code}
                    code={s.code}
                    isOn={running.has(s.code)}
                    isExpected={job.activeCodes.includes(s.code)}
                    isConfirmed={confirmed}
                    onClick={() => toggle(job.id, date, s.code)}
                  />
                ))}
                {modifiers.map((s) => (
                  <CodeCell
                    key={s.code}
                    code={s.code}
                    isOn={running.has(s.code)}
                    isExpected={job.activeCodes.includes(s.code)}
                    isConfirmed={confirmed}
                    onClick={() => toggle(job.id, date, s.code)}
                    isModifier
                  />
                ))}
                <td className="bg-background group-hover:bg-muted/30 sticky right-0 z-10 border-b border-l text-center text-sm font-semibold tabular-nums">
                  {markCount > 0 ? (
                    markCount
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CodeHeader({
  code,
  label,
  kind,
}: {
  code: DailyCode;
  label: string;
  kind: 'service' | 'modifier';
}) {
  return (
    <th
      className={cn(
        'border-b text-center text-[10px] font-semibold uppercase',
        kind === 'modifier' ? 'bg-warning/5' : 'bg-muted/10'
      )}
      style={{ minWidth: '50px', height: '38px' }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="text-foreground cursor-help px-1 underline decoration-dotted underline-offset-2">
              {code === 'GAS_M' ? 'GAS M' : code}
            </div>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </th>
  );
}

function CodeCell({
  code,
  isOn,
  isExpected,
  isConfirmed,
  onClick,
  isModifier = false,
}: {
  code: DailyCode;
  isOn: boolean;
  isExpected: boolean;
  isConfirmed: boolean;
  onClick: () => void;
  isModifier?: boolean;
}) {
  // 4 visual states:
  //   ON + confirmed     → solid filled X (the canonical "this happened, verified")
  //   ON + unconfirmed   → outlined / faded X (auto-running, awaiting ack)
  //   OFF + expected     → dashed empty (configured to run but not running today)
  //   OFF + not expected → faint dot (out of scope)
  const codeLabel = code === 'GAS_M' ? 'GAS M' : code;
  const tooltipText = isOn
    ? isConfirmed
      ? `${codeLabel} confirmed for this day. Click to mark off.`
      : `${codeLabel} auto-running (not yet confirmed). Click to mark off.`
    : isExpected
      ? `${codeLabel} not running. Click to mark on for this day.`
      : `${codeLabel} not in scope. Click to add it for this day.`;
  return (
    <td
      className={cn('border-b text-center', isModifier ? 'bg-warning/5' : '')}
      style={{ height: 56 }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onClick}
              aria-label={tooltipText}
              className={cn(
                'mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold transition-colors',
                isOn
                  ? isConfirmed
                    ? isModifier
                      ? 'bg-warning text-warning-foreground hover:bg-warning/80'
                      : 'bg-primary text-primary-foreground hover:bg-primary/80'
                    : isModifier
                      ? 'bg-warning/15 text-warning border-warning/40 hover:bg-warning/25 border'
                      : 'bg-primary/15 text-primary border-primary/40 hover:bg-primary/25 border'
                  : isExpected
                    ? isModifier
                      ? 'text-warning/60 hover:bg-warning/10 hover:text-warning border-warning/40 border border-dashed'
                      : 'text-primary/50 hover:bg-primary/10 hover:text-primary border-primary/30 border border-dashed'
                    : 'text-muted-foreground/20 hover:bg-muted/50 hover:text-muted-foreground'
              )}
            >
              {isOn ? 'X' : '·'}
            </button>
          }
        />
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </td>
  );
}
