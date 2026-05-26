import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from '@repo/ui';
import { Briefcase, HardHat, TrendingUp, Truck } from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { JobBoard } from '~/components/job-board';
import { UnitAvailabilityBadge } from '~/components/status-badges';

export const Route = createFileRoute('/_dashboard/reports')({
  component: ReportsPage,
});

function ReportsPage() {
  const units = useStore((s) => s.units);
  const jobs = useStore((s) => s.jobs);
  const users = useStore((s) => s.users);
  const yards = useStore((s) => s.yards);
  const bids = useStore((s) => s.bids);
  const catalog = useStore((s) => s.serviceCatalog);

  // ---- Equipment utilization ---------------------------------------------
  const equipmentByYard = useMemo(() => {
    const groups = new Map<
      string,
      { yardName: string; deployed: number; available: number; units: typeof units }
    >();
    for (const u of units) {
      const yard = yards.find((y) => y.id === u.yardId);
      const key = yard?.id ?? '__none__';
      const yardName = yard?.name ?? 'Unassigned';
      if (!groups.has(key)) {
        groups.set(key, { yardName, deployed: 0, available: 0, units: [] });
      }
      const g = groups.get(key)!;
      g.units.push(u);
      if (u.currentJobId) g.deployed++;
      else g.available++;
    }
    return Array.from(groups.values()).sort((a, b) => a.yardName.localeCompare(b.yardName));
  }, [units, yards]);

  const totalUnits = units.length;
  const deployedUnits = units.filter((u) => !!u.currentJobId).length;
  const availableUnits = totalUnits - deployedUnits;
  const utilizationPct = totalUnits === 0 ? 0 : Math.round((deployedUnits / totalUnits) * 100);

  // ---- Crew availability --------------------------------------------------
  const crew = useMemo(() => users.filter((u) => u.role === 'field_crew' && u.active), [users]);
  const deployedCrew = crew.filter((c) => !!c.currentJobId);
  const availableCrew = crew.filter((c) => !c.currentJobId);
  const crewUtilizationPct = crew.length === 0
    ? 0
    : Math.round((deployedCrew.length / crew.length) * 100);

  const activeJobsCount = jobs.filter((j) => j.status === 'active').length;

  // ---- Untapped capacity (the boss pitch) -------------------------------
  // What does an idle unit cost us in unrealized revenue? Compute the avg
  // daily billing across currently-running jobs, multiply by idle units,
  // multiply by ~22 working days/mo. Anchored to real data so the number
  // moves with the seed — not a marketing number.
  const today = new Date().toISOString().slice(0, 10);
  const untapped = useMemo(() => {
    const activeJobsList = jobs.filter((j) => j.status === 'active');
    // Per-job daily total = sum of per-day rates for codes currently running.
    let totalDaily = 0;
    let jobsCounted = 0;
    for (const job of activeJobsList) {
      const bid = bids.find((b) => b.id === job.bidId);
      if (!bid) continue;
      const runningCodes = new Set<string>();
      for (const r of job.serviceRuns) {
        if (r.endDate && r.endDate < today) continue;
        runningCodes.add(r.code);
      }
      if (runningCodes.size === 0) continue;
      let jobSum = 0;
      for (const li of bid.lineItems) {
        const cat = catalog.find((c) => c.id === li.catalogItemId);
        if (!cat?.dailyCode || cat.billingUnit !== 'per_day') continue;
        if (!runningCodes.has(cat.dailyCode)) continue;
        jobSum += li.rate;
      }
      if (jobSum > 0) {
        totalDaily += jobSum;
        jobsCounted++;
      }
    }
    const avgPerDeployedUnit = jobsCounted === 0 ? 0 : totalDaily / jobsCounted;
    const workingDaysPerMonth = 22;
    const monthlyPotential = Math.round(avgPerDeployedUnit * availableUnits * workingDaysPerMonth);
    return { monthlyPotential, avgPerDeployedUnit, idleUnits: availableUnits };
  }, [jobs, bids, catalog, today, availableUnits]);

  return (
    <div className="space-y-6">
      {/* Untapped-capacity hero — the boss pitch in one number.
       * Idle equipment = revenue we're not capturing. This card translates
       * the utilization %s below into dollars, which is the conversation
       * the budget owner actually needs to have. */}
      {untapped.idleUnits > 0 && untapped.avgPerDeployedUnit > 0 ? (
        <Card className="border-strat-green/30 from-strat-green/[0.06] to-strat-green/[0.02] bg-gradient-to-br">
          <CardContent className="py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-strat-green/80 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <TrendingUp className="size-3.5" />
                  Untapped capacity
                </div>
                <div className="text-strat-green text-4xl font-bold tracking-tight tabular-nums">
                  ${untapped.monthlyPotential.toLocaleString('en-US')}
                  <span className="text-strat-green/70 ml-1 text-xl font-semibold">/mo</span>
                </div>
                <p className="text-muted-foreground max-w-xl text-sm">
                  Potential monthly revenue if our{' '}
                  <span className="text-foreground font-semibold">
                    {untapped.idleUnits} idle unit{untapped.idleUnits === 1 ? '' : 's'}
                  </span>{' '}
                  billed at the same average daily rate as the units already deployed
                  (
                  <span className="tabular-nums">
                    ${Math.round(untapped.avgPerDeployedUnit).toLocaleString('en-US')}/day
                  </span>
                  , 22 working days).
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge className="bg-strat-green/15 text-strat-green border-strat-green/30 text-xs">
                  {untapped.idleUnits} idle
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {deployedUnits} deployed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* KPI strip — utilization framed as opportunity: low % reads as a problem
       * (revenue not being deployed), high % reads as healthy. This mirrors the
       * boss pitch (more visibility → more billable days). */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<Truck className="size-4" />}
          label="Equipment Utilization"
          value={`${utilizationPct}%`}
          hint={
            availableUnits > 0
              ? `${availableUnits} unit${availableUnits === 1 ? '' : 's'} idle · room to deploy`
              : 'All units deployed'
          }
          tone={utilizationPct >= 70 ? 'text-success' : utilizationPct >= 40 ? 'text-muted-foreground' : 'text-strat-coral'}
        />
        <KpiCard
          icon={<HardHat className="size-4" />}
          label="Crew Utilization"
          value={`${crewUtilizationPct}%`}
          hint={
            availableCrew.length > 0
              ? `${availableCrew.length} crew available · ready to dispatch`
              : 'All crew on jobs'
          }
          tone={crewUtilizationPct >= 70 ? 'text-success' : crewUtilizationPct >= 40 ? 'text-muted-foreground' : 'text-strat-coral'}
        />
        <KpiCard
          icon={<Briefcase className="size-4" />}
          label="Active Jobs"
          value={String(activeJobsCount)}
          hint={`${jobs.filter((j) => j.status === 'scheduled').length} scheduled · ${jobs.filter((j) => j.status === 'speculative').length} speculative`}
        />
      </div>

      {/* Equipment utilization detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4" />
            Equipment by Yard
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Deployment by physical location. Pull idle units from low-utilization yards to where the work is.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {equipmentByYard.map((g) => {
              const total = g.deployed + g.available;
              const pct = total === 0 ? 0 : Math.round((g.deployed / total) * 100);
              return (
                <div key={g.yardName} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.yardName}</span>
                      <Badge variant="outline" className="text-xs">
                        {total} unit{total === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        pct >= 70 ? 'text-success' : pct >= 40 ? 'text-muted-foreground' : 'text-strat-coral'
                      )}
                    >
                      {pct}% utilized
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-strat-slate' : 'bg-strat-coral'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.units.map((u) => (
                      <span
                        key={u.id}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px]',
                          u.currentJobId
                            ? 'border-strat-slate/30 bg-strat-slate/10 text-strat-slate'
                            : 'border-strat-green/30 bg-strat-green/10 text-strat-green'
                        )}
                      >
                        {u.code}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Crew availability detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="size-4" />
            Crew Availability
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Who's deployed and who's free for a new job today.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                Available ({availableCrew.length})
              </div>
              {availableCrew.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
                  Everyone is deployed.
                </div>
              ) : (
                <ul className="divide-y rounded-md border">
                  {availableCrew.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {c.crewRole ? c.crewRole.replace('_', ' ') : 'crew'}
                          {c.region ? ` · ${REGION_LABELS[c.region]}` : ''}
                        </div>
                      </div>
                      <Badge className="bg-strat-green/15 text-strat-green border-strat-green/30 text-[10px]">
                        Available
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                On a job ({deployedCrew.length})
              </div>
              {deployedCrew.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
                  No deployed crew.
                </div>
              ) : (
                <ul className="divide-y rounded-md border">
                  {deployedCrew.map((c) => {
                    const job = jobs.find((j) => j.id === c.currentJobId);
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {job ? (
                              <Link
                                to="/jobs/$jobId"
                                params={{ jobId: job.id }}
                                className="hover:text-foreground underline-offset-4 hover:underline"
                              >
                                {job.jobNumber} · {job.wellName}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Deployed
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment-by-unit list — quick reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipment Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {units.map((u) => {
              const yard = yards.find((y) => y.id === u.yardId);
              const job = u.currentJobId ? jobs.find((j) => j.id === u.currentJobId) : undefined;
              return (
                <div key={u.id} className="rounded-md border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{u.code}</span>
                    <UnitAvailabilityBadge unit={u} className="text-[10px]" />
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {yard?.name ?? '—'} · {u.type.replace('_', ' ')}
                  </div>
                  {job ? (
                    <div className="text-muted-foreground mt-1 truncate text-[11px]">
                      → {job.jobNumber}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Job board — collapsed by default; expanded on demand */}
      <details className="group rounded-md border bg-card">
        <summary className="hover:bg-muted/20 flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold transition-colors">
          <span>Job Board</span>
          <span className="text-muted-foreground text-xs font-normal group-open:rotate-180 transition-transform">
            ▾
          </span>
        </summary>
        <div className="min-w-0 border-t p-4">
          <JobBoard />
        </div>
      </details>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
          {icon}
          {label}
        </div>
        <div className={cn('mt-1 text-3xl font-bold tracking-tight tabular-nums', tone)}>
          {value}
        </div>
        {hint ? <div className="text-muted-foreground mt-1 text-xs">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
