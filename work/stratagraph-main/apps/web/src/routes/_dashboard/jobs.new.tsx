import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  MultiSelect,
  type Option,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CircleUserRound,
  Map,
  MapPin,
  Moon,
  Sun,
  Truck,
} from 'lucide-react';
import { useStore, REGION_LABELS } from '~/lib/store';
import { JobStatusBadge } from '~/components/status-badges';
import { CHIP_CLASS, CHIP_STATIC_CLASS } from '~/lib/composer';
import { ORDER_TYPE_LABELS, type OrderType, type Region } from '~/lib/types';

const searchSchema = z.object({
  bidId: z.string().optional(),
  customerId: z.string().optional(),
});

export const Route = createFileRoute('/_dashboard/jobs/new')({
  validateSearch: searchSchema,
  component: NewJobRoute,
});

const ORDER_TYPE_OPTIONS: OrderType[] = ['mudlogging', 'geosteering', 'wellbore_placement'];
const REGION_OPTIONS = Object.entries(REGION_LABELS) as [Region, string][];

function NewJobRoute() {
  const { bidId, customerId } = Route.useSearch();
  return bidId ? <NewJobPage bidId={bidId} /> : <BidPicker initialCustomerId={customerId} />;
}

function NewJobPage({ bidId }: { bidId: string }) {
  const navigate = useNavigate();
  const bid = useStore((s) => s.getBid(bidId));
  const customer = useStore((s) => (bid ? s.getCustomer(bid.customerId) : undefined));
  const bidWell = useStore((s) => (bid?.wellId ? s.getWell(bid.wellId) : undefined));
  const allWells = useStore((s) => s.wells);
  const wellsForCustomer = useMemo(
    () => (customer ? allWells.filter((w) => w.customerId === customer.id) : []),
    [allWells, customer]
  );
  const allUsers = useStore((s) => s.users);
  const crew = useMemo(
    () => allUsers.filter((u) => u.role === 'field_crew' && u.active),
    [allUsers]
  );
  const projectManagers = useMemo(
    () => allUsers.filter((u) => u.role === 'project_manager' && u.active),
    [allUsers]
  );
  const units = useStore((s) => s.units);
  const createJob = useStore((s) => s.createJob);

  const [wellId, setWellId] = useState<string>(bid?.wellId ?? '');
  const [orderType, setOrderType] = useState<OrderType>('mudlogging');
  const [startDate, setStartDate] = useState('');
  const [region, setRegion] = useState<Region>('W_TEX');
  const [dayLoggerId, setDayLoggerId] = useState<string>('');
  const [nightLoggerId, setNightLoggerId] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [projectManagerId, setProjectManagerId] = useState<string>('');
  const [selectedCertOptions, setSelectedCertOptions] = useState<Option[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const certOptions: Option[] = useMemo(() => {
    const set = new Set<string>();
    crew.forEach((c) => c.certifications?.forEach((cert) => set.add(cert)));
    return Array.from(set)
      .sort()
      .map((cert) => ({ value: cert, label: cert }));
  }, [crew]);

  const requiredCerts = useMemo(
    () => selectedCertOptions.map((o) => o.value),
    [selectedCertOptions]
  );

  const filteredCrew = useMemo(
    () =>
      requiredCerts.length === 0
        ? crew
        : crew.filter((c) =>
            requiredCerts.every((cert) => c.certifications?.includes(cert))
          ),
    [crew, requiredCerts]
  );

  useEffect(() => {
    if (dayLoggerId && !filteredCrew.some((c) => c.id === dayLoggerId)) setDayLoggerId('');
    if (nightLoggerId && !filteredCrew.some((c) => c.id === nightLoggerId)) setNightLoggerId('');
  }, [filteredCrew, dayLoggerId, nightLoggerId]);

  const projectedStatus = startDate ? 'scheduled' : 'speculative';
  // When the bid has a well, lock it. Otherwise allow picking from customer wells.
  const wellLocked = !!bid?.wellId && !!bidWell;
  const selectedWell = wellLocked ? bidWell : wellsForCustomer.find((w) => w.id === wellId);

  // Bid status gates job creation — Pending bids aren't billable yet.
  const bidUsable = bid?.status === 'accepted';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bid || !customer) return;
    const fieldErrors: Record<string, string> = {};
    if (!selectedWell) fieldErrors.well = 'Pick a project.';
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    const id = createJob({
      customerId: customer.id,
      bidId: bid.id,
      wellId: selectedWell!.id,
      orderType,
      wellName: selectedWell!.name,
      apiNumber: selectedWell!.apiNumber,
      county: selectedWell!.county,
      state: selectedWell!.state,
      gpsCoordinates: selectedWell!.gpsCoordinates,
      locationId: selectedWell!.locationId,
      rigId: selectedWell!.rigId,
      region,
      startDate: startDate || undefined,
      dayLoggerId: dayLoggerId || undefined,
      nightLoggerId: nightLoggerId || undefined,
      unitId: unitId || undefined,
      projectManagerId: projectManagerId || undefined,
    });
    navigate({ to: '/jobs/$jobId', params: { jobId: id } });
  }

  if (!bid || !customer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/bids"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to Bids
        </Link>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            Bid not found. Pick a bid first.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/bids/$bidId"
          params={{ bidId: bid.id }}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to {customer.name} bid v{bid.version}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Job</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Billing against{' '}
          <Link
            to="/bids/$bidId"
            params={{ bidId: bid.id }}
            className="underline-offset-4 hover:underline"
          >
            {customer.name} bid v{bid.version}
          </Link>
          .
        </p>
      </div>

      {!bidUsable ? (
        <div className="border-warning/40 bg-warning/5 rounded-md border p-3 text-sm">
          This bid is <strong>{bid.status === 'sent' ? 'pending' : bid.status}</strong>, not
          accepted. Customer needs to accept it before a job can bill against it.
        </div>
      ) : null}

      {/* Linear-style composer: chip rows instead of a boxed labeled form. */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {wellLocked ? (
            <div className={CHIP_STATIC_CLASS}>
              <MapPin className="text-muted-foreground" />
              {bidWell!.name}
              {bidWell!.county ? (
                <span className="text-muted-foreground font-normal">
                  · {bidWell!.county}, {bidWell!.state ?? ''}
                </span>
              ) : null}
              <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                From bid
              </Badge>
            </div>
          ) : (
            <Select
              value={wellId}
              onValueChange={(v) => setWellId(v)}
              disabled={wellsForCustomer.length === 0}
            >
              <SelectTrigger
                className={cn(CHIP_CLASS, errors.well && 'border-destructive')}
                aria-label="Project"
              >
                <MapPin className="text-muted-foreground" />
                <SelectValue placeholder={wellsForCustomer.length === 0 ? 'No projects' : 'Project'}>
                  {(v: string) => wellsForCustomer.find((w) => w.id === v)?.name ?? 'Project'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {wellsForCustomer.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    {w.county ? ` · ${w.county}, ${w.state ?? ''}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
            <SelectTrigger className={CHIP_CLASS} aria-label="Order type">
              <Briefcase className="text-muted-foreground" />
              <SelectValue>{(v: string) => ORDER_TYPE_LABELS[v as OrderType]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ORDER_TYPE_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>
                  {ORDER_TYPE_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
            <SelectTrigger className={CHIP_CLASS} aria-label="Region">
              <Map className="text-muted-foreground" />
              <SelectValue>{(v: string) => REGION_LABELS[v as Region]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label
            className={cn(
              CHIP_STATIC_CLASS,
              'hover:bg-muted/60 cursor-pointer transition-colors',
              !startDate && 'text-muted-foreground font-normal'
            )}
          >
            <CalendarDays className="text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[7.5rem] bg-transparent text-xs outline-none"
              aria-label="Start date"
            />
          </label>
        </div>
        {errors.well ? <p className="text-destructive text-xs">{errors.well}</p> : null}
        {wellsForCustomer.length === 0 && !wellLocked ? (
          <p className="text-muted-foreground text-xs">
            No projects on this customer — add one on the customer page first.
          </p>
        ) : null}

        <div className="border-border/60 border-b" />

        <div className="space-y-3">
          <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Crew, equipment &amp; management{' '}
            <span className="font-normal normal-case">(optional — can be set later)</span>
          </div>

          {certOptions.length > 0 && (
            <div className="max-w-md">
              <MultiSelect
                options={certOptions}
                value={selectedCertOptions}
                onChange={setSelectedCertOptions}
                placeholder="Filter loggers by certification..."
                hidePlaceholderWhenSelected
              />
              {requiredCerts.length > 0 ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {filteredCrew.length} of {crew.length} crew match
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={dayLoggerId || '__none__'}
              onValueChange={(v) => setDayLoggerId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className={CHIP_CLASS} aria-label="Day logger">
                <Sun className="text-muted-foreground" />
                <SelectValue placeholder="Day logger">
                  {(v: string) =>
                    v === '__none__' || !v
                      ? 'Day logger'
                      : crew.find((c) => c.id === v)?.name ?? 'Day logger'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground italic">Unassigned</span>
                </SelectItem>
                {filteredCrew.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      · {c.available === false ? 'on job' : 'available'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={nightLoggerId || '__none__'}
              onValueChange={(v) => setNightLoggerId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className={CHIP_CLASS} aria-label="Night logger">
                <Moon className="text-muted-foreground" />
                <SelectValue placeholder="Night logger">
                  {(v: string) =>
                    v === '__none__' || !v
                      ? 'Night logger'
                      : crew.find((c) => c.id === v)?.name ?? 'Night logger'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground italic">Unassigned</span>
                </SelectItem>
                {filteredCrew.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      · {c.available === false ? 'on job' : 'available'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={unitId || '__none__'}
              onValueChange={(v) => setUnitId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className={CHIP_CLASS} aria-label="Unit">
                <Truck className="text-muted-foreground" />
                <SelectValue placeholder="Unit">
                  {(v: string) => {
                    const u = units.find((x) => x.id === v);
                    return u ? u.code : 'Unit';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground italic">Unassigned</span>
                </SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.code} · {u.type.replace('_', ' ')}
                    <span className="text-muted-foreground ml-2 text-xs">
                      · {u.currentJobId ? 'deployed' : 'available'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={projectManagerId || '__none__'}
              onValueChange={(v) => setProjectManagerId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className={CHIP_CLASS} aria-label="Project manager">
                <CircleUserRound className="text-muted-foreground" />
                <SelectValue placeholder="Project manager">
                  {(v: string) =>
                    v === '__none__' || !v
                      ? 'Project manager'
                      : projectManagers.find((pm) => pm.id === v)?.name ?? 'Project manager'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground italic">Unassigned</span>
                </SelectItem>
                {projectManagers.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-border/60 border-b" />

        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="uppercase tracking-wider">Will be created as</span>
            <JobStatusBadge status={projectedStatus} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: '/jobs' })}>
              Cancel
            </Button>
            <Button type="submit" disabled={!bidUsable}>
              Create Job
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function BidPicker({ initialCustomerId }: { initialCustomerId?: string }) {
  const bids = useStore((s) => s.bids);
  const customers = useStore((s) => s.customers);
  const [customerFilter, setCustomerFilter] = useState<string>(initialCustomerId ?? '');

  const acceptedBids = useMemo(
    () => bids.filter((b) => b.status === 'accepted'),
    [bids]
  );
  const visibleBids = useMemo(
    () =>
      customerFilter
        ? acceptedBids.filter((b) => b.customerId === customerFilter)
        : acceptedBids,
    [acceptedBids, customerFilter]
  );

  // Customers that actually have at least one accepted bid — filter UX
  const customersWithBids = useMemo(() => {
    const ids = new Set(acceptedBids.map((b) => b.customerId));
    return customers.filter((c) => ids.has(c.id));
  }, [acceptedBids, customers]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/jobs"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to Jobs
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">New Job</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pick a bid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customersWithBids.length > 0 ? (
            <div>
              <Label className="text-muted-foreground mb-1.5 block text-xs uppercase tracking-wider">
                Filter by customer
              </Label>
              <Select
                value={customerFilter || '__all__'}
                onValueChange={(v) => setCustomerFilter(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      v === '__all__' || !v
                        ? 'All customers'
                        : customers.find((c) => c.id === v)?.name ?? 'All customers'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All customers</SelectItem>
                  {customersWithBids.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {visibleBids.length === 0 ? (
            <div className="border-warning/40 bg-warning/5 rounded-md border p-3 text-sm">
              No accepted bids{customerFilter ? ' for this customer' : ''} yet. A bid has to be
              accepted before a job can run against it.{' '}
              <Link to="/bids" className="underline-offset-4 hover:underline">
                Go to bids
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {visibleBids.map((b) => {
                const cust = customers.find((c) => c.id === b.customerId);
                return (
                  <li key={b.id}>
                    <Link
                      to="/jobs/new"
                      search={{ bidId: b.id }}
                      className="hover:bg-muted/30 flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="text-muted-foreground size-4" />
                        <div>
                          <div className="font-medium">{cust?.name ?? '—'}</div>
                          <div className="text-muted-foreground text-xs">
                            v{b.version} · {b.services.length} services · created{' '}
                            {b.createdDate}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Accepted
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
