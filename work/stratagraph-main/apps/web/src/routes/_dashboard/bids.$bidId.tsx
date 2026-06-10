import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@repo/ui';
import {
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  Download,
  MapPin,
  Pencil,
  Printer,
  XCircle,
} from 'lucide-react';
import { useStore, deriveBidStatus } from '~/lib/store';
import { formatDate } from '~/lib/format';
import { selectServiceCatalog } from '~/data/service-seed';
import { BidStatusBadge } from '~/components/status-badges';
import { BILLING_UNIT_LABELS, CATEGORY_LABELS } from '~/data/service-catalog';
import type { BidStatus, ServiceCategory } from '~/lib/types';

const CATEGORY_ORDER: ServiceCategory[] = [
  'logging',
  'xrf_ftir',
  'real_time',
  'cuttings',
  'unmanned_gas',
];

export const Route = createFileRoute('/_dashboard/bids/$bidId')({
  component: BidDetail,
});

function BidDetail() {
  const { bidId } = Route.useParams();
  const navigate = useNavigate();
  const bid = useStore((s) => s.getBid(bidId));
  const customer = useStore((s) => (bid ? s.getCustomer(bid.customerId) : undefined));
  const well = useStore((s) => (bid?.wellId ? s.getWell(bid.wellId) : undefined));
  const acceptBid = useStore((s) => s.acceptBid);
  const catalog = useStore((s) => selectServiceCatalog(s.services));
  const jobs = useStore((s) => s.jobs);
  const invoices = useStore((s) => s.invoices);
  const displayStatus = bid ? deriveBidStatus(bid, jobs, invoices) : undefined;

  if (!bid) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/bids' })}>
          <ArrowLeft />
          Back to Bids
        </Button>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            Bid not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = bid.services.reduce<Record<ServiceCategory, typeof bid.services>>(
    (acc, li) => {
      const cat = catalog.find((c) => c.id === li.catalogItemId);
      if (!cat) return acc;
      (acc[cat.category] ||= []).push(li);
      return acc;
    },
    {} as Record<ServiceCategory, typeof bid.services>
  );

  // Per-category summary stats — drives the "at-a-glance" strip at top.
  const summaries = useMemo(() => {
    return CATEGORY_ORDER.flatMap((cat) => {
      const items = grouped[cat];
      if (!items || items.length === 0) return [];
      // Daily total = sum of rates on lines that bill per_day (the recurring revenue).
      let dailyTotal = 0;
      for (const li of items) {
        const c = catalog.find((x) => x.id === li.catalogItemId);
        if (c?.billingUnit === 'per_day') dailyTotal += li.rate;
      }
      return [{ category: cat, itemCount: items.length, dailyTotal }];
    });
  }, [grouped, catalog]);

  const totalDaily = summaries.reduce((s, x) => s + x.dailyTotal, 0);

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <PageHeaderTitle>{customer?.name ?? 'Bid'}</PageHeaderTitle>
            <Badge variant="outline" className="font-mono">
              v{bid.version}
            </Badge>
            <BidStatusBadge status={displayStatus ?? bid.status} />
          </div>
          <PageHeaderDescription>
            Created {formatDate(bid.createdDate)} by {bid.salesperson} · {bid.services.length} services
            {well ? (
              <>
                {' '}·{' '}
                <MapPin className="inline size-3.5" /> {well.name}
              </>
            ) : null}
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          {bid.status === 'sent' ? (
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link to="/bids/$bidId/edit" params={{ bidId: bid.id }}>
                <Pencil />
                Edit
              </Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Printer />
            Print
          </Button>
          <Button size="sm">
            <Download />
            Download PDF
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* Lifecycle bar + primary state-advance CTA (mirrors the ticket page) */}
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <BidLifecycleBar
          status={displayStatus ?? bid.status}
          createdDate={bid.createdDate}
          acceptedDate={bid.acceptedDate}
        />
        <BidLifecycleActions
          bidId={bid.id}
          status={displayStatus ?? bid.status}
          onAccept={() => acceptBid(bid.id)}
        />
      </div>

      {bid.notes ? (
        <Card>
          <CardContent className="text-muted-foreground py-3 text-sm italic">
            {bid.notes}
          </CardContent>
        </Card>
      ) : null}

      {/* At-a-glance summary — shape of the bid in 2 seconds, no drilling needed */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Estimated daily total
              </div>
              <div className="mt-0.5 text-2xl font-bold tabular-nums">
                $
                {totalDaily.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                <span className="text-muted-foreground ml-1 text-xs font-normal">/ day</span>
              </div>
            </div>
            <div className="text-muted-foreground text-right text-xs">
              {bid.services.length} service{bid.services.length === 1 ? '' : 's'} ·{' '}
              {summaries.length} categor{summaries.length === 1 ? 'y' : 'ies'}
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span
                  className="bg-primary/5 border-primary/30 text-primary inline-flex items-center justify-center rounded-sm border px-1 font-mono text-[9px] font-semibold"
                >
                  LOG
                </span>
                <span className="text-[10px]">= daily activity code</span>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {summaries.map((s) => (
              <a
                key={s.category}
                href={`#cat-${s.category}`}
                className="hover:border-primary/40 hover:bg-muted/30 rounded-md border p-2.5 transition-colors"
              >
                <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  {CATEGORY_LABELS[s.category]}
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    ${s.dailyTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {s.itemCount} item{s.itemCount === 1 ? '' : 's'}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drill-in: collapsed by default; one accordion to hold everything */}
      <Card>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full">
            {summaries.map((s) => {
              const items = grouped[s.category] ?? [];
              return (
                <AccordionItem
                  key={s.category}
                  value={s.category}
                  id={`cat-${s.category}`}
                  className={cn('border-b last:border-b-0 px-4')}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {CATEGORY_LABELS[s.category]}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {s.itemCount}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        ${s.dailyTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}/day
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="-mx-4 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-4">Service</TableHead>
                            <TableHead>Billing</TableHead>
                            <TableHead className="text-right">Bid Rate</TableHead>
                            <TableHead className="pr-4 text-right">Catalog Default</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((li) => {
                            const catItem = catalog.find((c) => c.id === li.catalogItemId);
                            if (!catItem) return null;
                            const overridden =
                              catItem.defaultRate !== null &&
                              Math.abs(catItem.defaultRate - li.rate) > 0.001;
                            const isDaily = catItem.billingUnit === 'per_day';
                            return (
                              <TableRow key={li.id}>
                                <TableCell className="pl-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    {isDaily && catItem.dailyCode ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-primary/5 border-primary/30 text-primary font-mono text-[10px]"
                                        title="Daily activity code — appears as a column on the job daily log"
                                      >
                                        {catItem.dailyCode === 'GAS_M'
                                          ? 'GAS M'
                                          : catItem.dailyCode}
                                      </Badge>
                                    ) : null}
                                    <span>{catItem.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {BILLING_UNIT_LABELS[catItem.billingUnit]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  $
                                  {li.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  {overridden ? (
                                    <Badge variant="warning" className="ml-2 text-[10px]">
                                      override
                                    </Badge>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-muted-foreground pr-4 text-right tabular-nums text-sm">
                                  {catItem.defaultRate !== null
                                    ? `$${catItem.defaultRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                    : catItem.rateNote ?? '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle bar + primary action — same pattern as TicketLifecycleBar.
// ---------------------------------------------------------------------------

interface BidStage {
  id: BidStatus;
  label: string;
}

const BID_STAGES: BidStage[] = [
  { id: 'sent', label: 'Pending' },
  { id: 'accepted', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

function bidStageIndex(status: BidStatus): number {
  // 'lost' isn't on the happy path — handled separately as a terminal alternate.
  return BID_STAGES.findIndex((s) => s.id === status);
}

function BidLifecycleBar({
  status,
  createdDate,
  acceptedDate,
}: {
  status: BidStatus;
  createdDate?: string;
  acceptedDate?: string;
}) {
  // Lost bids get their own treatment.
  if (status === 'lost') {
    return (
      <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium">
        <XCircle className="size-4" />
        Bid lost
      </div>
    );
  }

  const idx = bidStageIndex(status);

  return (
    <div className="bg-muted/20 rounded-md border p-4">
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
        Lifecycle
      </div>
      <div className="flex items-start justify-between">
        {BID_STAGES.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      i <= idx ? 'bg-success' : 'bg-muted-foreground/15'
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                    done && 'bg-success text-success-foreground',
                    current && 'bg-primary text-primary-foreground ring-primary/20 ring-4',
                    !done && !current && 'bg-muted text-muted-foreground/60 border'
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </div>
                {i < BID_STAGES.length - 1 ? (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      i < idx ? 'bg-success' : 'bg-muted-foreground/15'
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <div
                className={cn(
                  'mt-2 text-xs',
                  current ? 'text-foreground font-semibold' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </div>
              {current && s.id === 'sent' && createdDate ? (
                <div className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                  {createdDate}
                </div>
              ) : null}
              {current && s.id === 'accepted' && acceptedDate ? (
                <div className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                  {acceptedDate}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BidLifecycleActions({
  bidId,
  status,
  onAccept,
}: {
  bidId: string;
  status: BidStatus;
  onAccept: () => void;
}) {
  if (status === 'sent') {
    return (
      <Button
        size="lg"
        onClick={onAccept}
        className="w-full justify-center text-base"
      >
        <CheckCircle2 />
        Mark accepted
      </Button>
    );
  }
  if (status === 'accepted') {
    return (
      <Button asChild size="lg" className="w-full justify-center text-base">
        <Link to="/jobs/new" search={{ bidId }}>
          <Briefcase />
          Create Job
        </Link>
      </Button>
    );
  }
  if (status === 'completed') {
    return (
      <div className="border-success/30 bg-success/5 text-success flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium">
        <Check className="size-4" />
        Bid completed — all jobs wound down, all tickets paid.
      </div>
    );
  }
  // lost (no extra action — bar already shows the state)
  return null;
}

