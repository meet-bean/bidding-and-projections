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
import type { BidStatus } from '~/lib/types';
import { costTypeLabel } from '~/lib/cost-types';

const CATEGORY_ORDER: string[] = [
  'logging',
  'xrf_ftir',
  'real_time',
  'cuttings',
  'unmanned_gas',
];

/** Canonical Stratagraph labels when known; humanized Vista cost types otherwise. */
function categoryLabel(cat: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[cat] ?? costTypeLabel(cat);
}

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

  // Group lines by whatever categories actually exist in the catalog — known
  // Stratagraph categories first (canonical order), then any other category
  // (e.g. Superior Vista cost types) in line order. Tenant-agnostic, mirroring
  // the bid editor's picker. Hooks run before the not-found return below: the
  // bid can appear between SSR and post-hydration renders (demo seed), and a
  // conditional hook would crash with React #310.
  const grouped = useMemo(() => {
    const acc: Record<string, NonNullable<typeof bid>['services']> = {};
    for (const li of bid?.services ?? []) {
      const cat = catalog.find((c) => c.id === li.catalogItemId);
      if (!cat) continue;
      (acc[cat.category] ||= []).push(li);
    }
    return acc;
  }, [bid, catalog]);

  // Per-category summary stats — drives the "at-a-glance" strip at top.
  const summaries = useMemo(() => {
    const cats = [
      ...CATEGORY_ORDER.filter((c) => grouped[c]?.length),
      ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
    return cats.map((cat) => {
      const items = grouped[cat]!;
      // Daily total = sum of rates on lines that bill per_day (the recurring revenue).
      // Lump total = rate × estimated qty over all lines — the meaningful figure
      // for non-daily bids (Superior scope items).
      let dailyTotal = 0;
      let lumpTotal = 0;
      for (const li of items) {
        const c = catalog.find((x) => x.id === li.catalogItemId);
        if (c?.billingUnit === 'per_day') dailyTotal += li.rate;
        lumpTotal += li.rate * (li.estimatedQty ?? 1);
      }
      return { category: cat, itemCount: items.length, dailyTotal, lumpTotal };
    });
  }, [grouped, catalog]);

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

  const totalDaily = summaries.reduce((s, x) => s + x.dailyTotal, 0);
  const totalLump = summaries.reduce((s, x) => s + x.lumpTotal, 0);
  // Daily-rate bids (Stratagraph) headline the recurring $/day; lump-sum bids
  // (Superior scope items) headline the estimated bid total instead of "$0/day".
  const isDailyBid = totalDaily > 0;

  const status = displayStatus ?? bid.status;
  // Demo bids carry the client name directly as customerId — show it rather
  // than a generic "Bid" when there's no customer record (matches the list).
  const customerName =
    customer?.name ?? (bid.customerId.startsWith('cust-') ? 'Bid' : bid.customerId);

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <PageHeaderTitle>{customerName}</PageHeaderTitle>
            <Badge variant="outline" className="font-mono">
              v{bid.version}
            </Badge>
            <BidStatusBadge status={status} />
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
          <Button variant="outline" size="sm">
            <Download />
            Download PDF
          </Button>
          {/* Single primary action = the state advance, normal-sized in the
            * header — not a full-width banner mid-page. */}
          {status === 'sent' ? (
            <Button size="sm" onClick={() => acceptBid(bid.id)}>
              <CheckCircle2 />
              Mark accepted
            </Button>
          ) : null}
          {status === 'accepted' ? (
            <Button asChild size="sm">
              <Link to="/jobs/new" search={{ bidId: bid.id }}>
                <Briefcase />
                Create Job
              </Link>
            </Button>
          ) : null}
        </PageHeaderActions>
      </PageHeader>

      {/* Quiet inline lifecycle strip — text + dots, no card stepper. */}
      <BidLifecycleStrip
        status={status}
        createdDate={bid.createdDate}
        acceptedDate={bid.acceptedDate}
      />

      {bid.notes ? (
        <p className="text-muted-foreground border-border/60 border-b pb-4 text-sm italic">
          {bid.notes}
        </p>
      ) : null}

      {/* At-a-glance summary — flat stat strip, no card chrome. */}
      <div className="border-border/60 border-b pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              {isDailyBid ? 'Estimated daily total' : 'Estimated bid total'}
            </div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums">
              $
              {(isDailyBid ? totalDaily : totalLump).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              {isDailyBid && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">/ day</span>
              )}
            </div>
          </div>
          <div className="text-muted-foreground text-right text-xs">
            {bid.services.length} service{bid.services.length === 1 ? '' : 's'} ·{' '}
            {summaries.length} categor{summaries.length === 1 ? 'y' : 'ies'}
            {isDailyBid && (
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span
                  className="bg-primary/5 border-primary/30 text-primary inline-flex items-center justify-center rounded-sm border px-1 font-mono text-[9px] font-semibold"
                >
                  LOG
                </span>
                <span className="text-[10px]">= daily activity code</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
          {summaries.map((s) => (
            <a key={s.category} href={`#cat-${s.category}`} className="group">
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider group-hover:underline">
                {categoryLabel(s.category)}
                {!(s.category in CATEGORY_LABELS) && (
                  <span className="text-muted-foreground/60 ml-1 font-mono normal-case">
                    {s.category}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  ${(isDailyBid ? s.dailyTotal : s.lumpTotal).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {s.itemCount} item{s.itemCount === 1 ? '' : 's'}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* De-carded services: micro section label, then flat accordion rows
        * (row borders only) — counts are muted text, never badges. */}
      <div>
        <div className="flex items-baseline justify-between pb-1">
          <h2 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            Services
          </h2>
        </div>
        <Accordion type="multiple" className="w-full">
          {summaries.map((s) => {
            const items = grouped[s.category] ?? [];
            return (
              <AccordionItem key={s.category} value={s.category} id={`cat-${s.category}`}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pr-3">
                    <span className="flex items-baseline gap-2">
                      <span>{categoryLabel(s.category)}</span>
                      {!(s.category in CATEGORY_LABELS) && (
                        <span className="text-muted-foreground text-[11px] font-normal">
                          {s.category}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs font-normal tabular-nums">
                        {s.itemCount}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      ${(isDailyBid ? s.dailyTotal : s.lumpTotal).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      {isDailyBid ? '/day' : ''}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
                                <TableCell className="text-muted-foreground text-xs">
                                  {BILLING_UNIT_LABELS[catItem.billingUnit]}
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
                  </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle strip — quiet inline text + dots; the state-advance CTA lives in
// the page header, not here.
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

function BidLifecycleStrip({
  status,
  createdDate,
  acceptedDate,
}: {
  status: BidStatus;
  createdDate?: string;
  acceptedDate?: string;
}) {
  if (status === 'lost') {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm font-medium">
        <XCircle className="size-4" />
        Bid lost
      </div>
    );
  }

  const idx = bidStageIndex(status);

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      {BID_STAGES.map((s, i) => {
        const done = i < idx || status === 'completed';
        const current = i === idx;
        const date =
          s.id === 'sent' ? createdDate : s.id === 'accepted' ? acceptedDate : undefined;
        return (
          <span key={s.id} className="flex items-center gap-2">
            {i > 0 ? <span className="bg-border h-px w-6" /> : null}
            <span
              className={cn(
                'flex items-center gap-1.5',
                current && 'text-foreground font-medium'
              )}
            >
              {done ? (
                <Check className="text-success size-3.5" />
              ) : (
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    current ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
              {s.label}
              {(current || done) && date ? (
                <span className="text-muted-foreground font-normal tabular-nums">{date}</span>
              ) : null}
            </span>
          </span>
        );
      })}
      {status === 'completed' ? (
        <span className="text-success ml-2">all jobs wound down, all tickets paid</span>
      ) : null}
    </div>
  );
}

