import { useMemo } from 'react';
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';
import { AlertTriangle, UserMinus, Truck } from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import type { DailyCode, Job, Unit, User } from '~/lib/types';

/**
 * Daily codes that require a specific employee certification.
 * Used to flag (not block) when assigning a logger that's missing a cert
 * for a service currently running on the job.
 */
const CODE_TO_CERT: Partial<Record<DailyCode, string>> = {
  MASS: 'Mass-Spec',
  UMMS: 'Mass-Spec',
  XRF: 'XRF',
};

export function CrewUnitAssignments({ job }: { job: Job }) {
  // Filter in a memo (selector returning a fresh array each render causes a render loop).
  const allUsers = useStore((s) => s.users);
  const employees = useMemo(() => allUsers.filter((u) => u.role === 'field_crew'), [allUsers]);
  const units = useStore((s) => s.units);
  const yards = useStore((s) => s.yards);
  const assignCrew = useStore((s) => s.assignCrew);
  const assignUnit = useStore((s) => s.assignUnit);
  const codesRunningOn = useStore((s) => s.codesRunningOn);
  const yardName = (id: string) => yards.find((y) => y.id === id)?.name ?? '—';

  const today = new Date().toISOString().slice(0, 10);
  const isReadOnly = job.status === 'completed' || job.status === 'cancelled';

  const runningCodes = useMemo(() => codesRunningOn(job.id, today), [codesRunningOn, job.id, today]);

  // Certs the job needs given what's currently running
  const requiredCerts = useMemo(() => {
    const out = new Set<string>();
    runningCodes.forEach((c) => {
      const cert = CODE_TO_CERT[c];
      if (cert) out.add(cert);
    });
    return out;
  }, [runningCodes]);

  const dayLogger = job.dayLoggerId ? employees.find((e) => e.id === job.dayLoggerId) : undefined;
  const nightLogger = job.nightLoggerId
    ? employees.find((e) => e.id === job.nightLoggerId)
    : undefined;
  const unit = job.unitId ? units.find((u) => u.id === job.unitId) : undefined;

  function employeeMissingCerts(emp: User | undefined): string[] {
    if (!emp) return [];
    const owned = new Set(emp.certifications ?? []);
    return Array.from(requiredCerts).filter((c) => !owned.has(c));
  }

  // Pickable crew = available employees + currently assigned (always selectable so they stay shown)
  const pickableForDay = useMemo(
    () =>
      employees.filter(
        (e) =>
          (e.available !== false || e.id === job.dayLoggerId) &&
          (e.crewRole === 'day_logger' ||
            e.crewRole === 'supervisor' ||
            e.crewRole === 'night_logger')
      ),
    [employees, job.dayLoggerId]
  );
  const pickableForNight = useMemo(
    () =>
      employees.filter(
        (e) =>
          (e.available !== false || e.id === job.nightLoggerId) &&
          (e.crewRole === 'night_logger' ||
            e.crewRole === 'day_logger' ||
            e.crewRole === 'supervisor')
      ),
    [employees, job.nightLoggerId]
  );

  const pickableUnits = useMemo(
    () =>
      units.filter(
        (u) =>
          u.id === job.unitId ||
          u.status === 'idle' ||
          u.status === 'ready' ||
          u.status === 'build' ||
          u.status === 'turn'
      ),
    [units, job.unitId]
  );

  const dayOverrideCount =
    job.crewAssignments?.filter((a) => a.dayLoggerId).length ?? 0;
  const nightOverrideCount =
    job.crewAssignments?.filter((a) => a.nightLoggerId).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <CrewSlot
          label="Day Logger"
          employee={dayLogger}
          pickable={pickableForDay}
          missingCerts={employeeMissingCerts(dayLogger)}
          requiredCerts={requiredCerts}
          isReadOnly={isReadOnly}
          overrideCount={dayOverrideCount}
          onAssign={(empId) => assignCrew(job.id, 'day_logger', empId)}
        />
        <CrewSlot
          label="Night Logger"
          employee={nightLogger}
          pickable={pickableForNight}
          missingCerts={employeeMissingCerts(nightLogger)}
          requiredCerts={requiredCerts}
          isReadOnly={isReadOnly}
          overrideCount={nightOverrideCount}
          onAssign={(empId) => assignCrew(job.id, 'night_logger', empId)}
        />
        <UnitSlot
          unit={unit}
          pickable={pickableUnits}
          isReadOnly={isReadOnly}
          onAssign={(unitId) => assignUnit(job.id, unitId)}
          yardName={yardName}
        />
      </div>

      {requiredCerts.size > 0 && !isReadOnly ? (
        <div className="text-muted-foreground bg-muted/30 flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs">
          <span className="font-medium">Certs needed for running services:</span>
          {Array.from(requiredCerts).map((c) => (
            <Badge key={c} variant="outline" className="text-[10px]">
              {c}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CrewSlot({
  label,
  employee,
  pickable,
  missingCerts,
  requiredCerts,
  isReadOnly,
  overrideCount,
  onAssign,
}: {
  label: string;
  employee: User | undefined;
  pickable: User[];
  missingCerts: string[];
  requiredCerts: Set<string>;
  isReadOnly: boolean;
  overrideCount: number;
  onAssign: (employeeId: string | null) => void;
}) {
  return (
    <div className="space-y-1.5 rounded-md border bg-muted/10 p-3">
      <div className="text-muted-foreground flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span>{label}</span>
        {employee && missingCerts.length > 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="text-warning flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Missing {missingCerts.length} cert{missingCerts.length === 1 ? '' : 's'}
                </span>
              }
            />
            <TooltipContent>
              <div className="space-y-1">
                <div className="font-medium">Missing for current services:</div>
                {missingCerts.map((c) => (
                  <div key={c} className="text-xs">
                    · {c}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <Select
        value={employee?.id ?? ''}
        onValueChange={(v) => onAssign(v || null)}
        disabled={isReadOnly}
      >
        <SelectTrigger className="bg-background w-full">
          <SelectValue placeholder="Unassigned">
            {(value: string) =>
              pickable.find((p) => p.id === value)?.name ?? employee?.name ?? 'Unassigned'
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {pickable.length === 0 ? (
            <div className="text-muted-foreground p-2 text-xs">No available crew.</div>
          ) : (
            pickable.map((e) => {
              const owned = new Set(e.certifications ?? []);
              const empMissing = Array.from(requiredCerts).filter((c) => !owned.has(c));
              return (
                <SelectItem key={e.id} value={e.id}>
                  <div className="flex items-center gap-2">
                    <span>{e.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {e.region ? `· ${REGION_LABELS[e.region]}` : ''}
                    </span>
                    {empMissing.length > 0 ? (
                      <AlertTriangle className="text-warning size-3" />
                    ) : null}
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>

      {employee ? (
        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span className="truncate">
            {(employee.certifications ?? []).slice(0, 2).join(' · ') || 'No certs listed'}
          </span>
          {!isReadOnly ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onAssign(null)}
              className="text-muted-foreground -mr-1"
              aria-label={`Unassign ${label}`}
            >
              <UserMinus />
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground text-[11px] italic">No one assigned.</div>
      )}

      {overrideCount > 0 ? (
        <div className="text-warning-foreground/70 bg-warning/10 mt-1 flex items-center gap-1 rounded px-2 py-1 text-[10px]">
          <AlertTriangle className="size-3" />
          {overrideCount} day{overrideCount === 1 ? '' : 's'} overridden — see Crew &amp; Miles
        </div>
      ) : null}
    </div>
  );
}

function UnitSlot({
  unit,
  pickable,
  isReadOnly,
  onAssign,
  yardName,
}: {
  unit: Unit | undefined;
  pickable: Unit[];
  isReadOnly: boolean;
  onAssign: (unitId: string | null) => void;
  yardName: (id: string) => string;
}) {
  return (
    <div className="space-y-1.5 rounded-md border bg-muted/10 p-3">
      <div className="text-muted-foreground flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span>Unit</span>
      </div>

      <Select
        value={unit?.id ?? ''}
        onValueChange={(v) => onAssign(v || null)}
        disabled={isReadOnly}
      >
        <SelectTrigger className="bg-background w-full">
          <SelectValue placeholder="Unassigned">
            {(value: string) =>
              pickable.find((u) => u.id === value)?.code ?? unit?.code ?? 'Unassigned'
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {pickable.length === 0 ? (
            <div className="text-muted-foreground p-2 text-xs">No available units.</div>
          ) : (
            pickable.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {u.code}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {yardName(u.yardId)} · {REGION_LABELS[u.region]}
                  </span>
                  {u.status !== 'idle' && u.id !== unit?.id ? (
                    <span className="text-warning text-[10px]">({u.status})</span>
                  ) : null}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {unit ? (
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 truncate">
            <Truck className="size-3" />
            {unit.type.replace('_', ' ')} · {yardName(unit.yardId)}
          </span>
          {!isReadOnly ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onAssign(null)}
              className="text-muted-foreground -mr-1"
              aria-label="Unassign unit"
            >
              <UserMinus />
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground text-[11px] italic">No unit assigned.</div>
      )}
    </div>
  );
}
