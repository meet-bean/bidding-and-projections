import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Button, cn } from '@repo/ui';
import { ArrowRight, ChevronRight, FileText } from 'lucide-react';
import { useStore } from '~/lib/store';
import type { DailyCode, Job } from '~/lib/types';

export const Route = createFileRoute('/_dashboard/home')({
  component: HomePage,
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86_400_000);
}

/** Count of services currently running for a job. */
function runningServiceCount(job: Job, today: string): number {
  const set = new Set<DailyCode>();
  for (const r of job.serviceRuns) {
    if (r.endDate && r.endDate < today) continue;
    set.add(r.code);
  }
  return set.size;
}

function HomePage() {
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const bids = useStore((s) => s.bids);
  const wells = useStore((s) => s.wells);

  const today = todayIso();

  // Home shows only what's running RIGHT NOW. Scheduled / speculative jobs
  // live on /jobs under their own filter — Mickey opens home to see today,
  // not the pipeline.
  const liveJobs = useMemo(() => {
    return jobs
      .filter((j) => j.status === 'active')
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  }, [jobs]);

  const pendingBids = useMemo(() => {
    const bidsWithJobs = new Set(jobs.map((j) => j.bidId));
    return bids
      .filter((b) => b.status === 'accepted' && !bidsWithJobs.has(b.id))
      .sort((a, b) => (b.acceptedDate ?? '').localeCompare(a.acceptedDate ?? ''));
  }, [bids, jobs]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Active Jobs</h1>

      {/* Pending bids banner — when there are bids waiting on conversion,
       * surface a slim row above the jobs list. Empty pile = no banner. */}
      {pendingBids.length > 0 ? <PendingBidsBanner bids={pendingBids} /> : null}

      {liveJobs.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <div className="text-foreground text-sm font-medium">All caught up.</div>
          <div className="text-muted-foreground mt-1 text-xs">
            No jobs are running. New work shows up here as soon as a bid is accepted and turned into a job.
          </div>
        </div>
      ) : (
        <div className="divide-y rounded-md border bg-card">
          {liveJobs.map((job) => {
            const customer = customers.find((c) => c.id === job.customerId);
            const serviceCount = runningServiceCount(job, today);
            const startedDays =
              job.startDate && job.startDate <= today
                ? daysBetween(job.startDate, today)
                : null;

            return (
              <Link
                key={job.id}
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="hover:bg-muted/30 group flex items-center gap-4 px-4 py-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {customer?.name ?? '—'}
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">
                    {job.wellName}
                    {startedDays != null ? (
                      <span className="text-muted-foreground/70">
                        {' '}· Started {startedDays}d ago
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    serviceCount === 0 ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {serviceCount} service{serviceCount === 1 ? '' : 's'}
                </span>
                <ChevronRight className="text-muted-foreground/40 group-hover:text-muted-foreground size-4 shrink-0 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendingBidsBanner({
  bids,
}: {
  bids: Array<{ id: string; customerId: string; wellId?: string; lineItems: unknown[] }>;
}) {
  const customers = useStore((s) => s.customers);
  const wells = useStore((s) => s.wells);
  // Single bid → show it inline. Multiple bids → collapse to a count + link.
  if (bids.length === 1) {
    const b = bids[0]!;
    const customer = customers.find((c) => c.id === b.customerId);
    const well = b.wellId ? wells.find((w) => w.id === b.wellId) : undefined;
    return (
      <div className="border-success/20 bg-success/5 flex items-center justify-between gap-4 rounded-md border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <FileText className="text-success size-4 shrink-0" />
          <span className="truncate">
            <span className="font-semibold">{customer?.name ?? '—'}</span>
            {well ? <span className="text-muted-foreground"> · {well.name}</span> : null}
            <span className="text-muted-foreground"> · bid accepted, ready to start</span>
          </span>
        </div>
        <Button asChild size="sm">
          <Link to="/jobs/new" search={{ bidId: b.id }}>
            Create Job
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="border-success/20 bg-success/5 flex items-center justify-between gap-4 rounded-md border px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <FileText className="text-success size-4" />
        <span>
          <span className="font-semibold">{bids.length} bids</span>{' '}
          <span className="text-muted-foreground">accepted and ready to start</span>
        </span>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/bids" search={{ filter: 'accepted' } as never}>
          Review bids
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
