import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Badge, Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { useStore, deriveBidStatus } from '~/lib/store';
import { selectServiceCatalog } from '~/data/service-seed';
import { BidStatusBadge } from '~/components/status-badges';
import type { BidStatus } from '~/lib/types';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';

export const Route = createFileRoute('/_dashboard/bids/')({
  component: BidsPage,
});

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Friendly "12d ago" / "3w ago" / "5mo ago" formatting matching how Mickey speaks. */
function relativeAgo(iso: string): string {
  const days = daysSince(iso);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 21) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function daysSince(iso: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const ms = new Date(today + 'T00:00:00').getTime() - new Date(iso + 'T00:00:00').getTime();
  return Math.floor(ms / 86_400_000);
}

interface BidRow {
  id: string;
  customerId: string;
  customerName: string;
  version: number;
  status: BidStatus;
  isActive: boolean;
  createdDate: string;
  salesperson: string;
  serviceCount: number;
  estDailyTotal: number;
}

function BidsPage() {
  const navigate = useNavigate();
  const bids = useStore((s) => s.bids);
  const customers = useStore((s) => s.customers);
  const catalog = useStore((s) => selectServiceCatalog(s.services));
  const jobs = useStore((s) => s.jobs);
  const invoices = useStore((s) => s.invoices);

  const rows: BidRow[] = useMemo(() => {
    return bids.map((b) => {
      const cust = customers.find((c) => c.id === b.customerId);
      const est = b.services
        .filter((li) => {
          const c = catalog.find((x) => x.id === li.catalogItemId);
          return (
            c?.dailyCode && ['LOG', 'XRF', 'FTIR', 'MASS', 'OBM', 'GAS_M'].includes(c.dailyCode)
          );
        })
        .reduce((s, li) => s + li.rate, 0);
      return {
        id: b.id,
        customerId: b.customerId,
        customerName: cust?.name ?? '—',
        version: b.version,
        status: deriveBidStatus(b, jobs, invoices),
        isActive: b.isActive,
        createdDate: b.createdDate,
        salesperson: b.salesperson,
        serviceCount: b.services.length,
        estDailyTotal: est,
      };
    });
  }, [bids, customers, catalog, jobs, invoices]);

  const columnHelper = createColumnHelper<BidRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('customerName', {
        id: 'customerName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Customer" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to="/customers/$customerId"
              params={{ customerId: row.customerId }}
              className="hover:text-primary font-medium underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.customerName}
            </Link>
          );
        },
      }),
      columnHelper.accessor('version', {
        id: 'version',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Version" />,
        cell: (info) => (
          <Badge variant="outline" className="font-mono">
            v{info.getValue()}
          </Badge>
        ),
        size: 90,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: (info) => {
          const row = info.row.original;
          // Pending for 7d+ is the kind of thing Mickey wants surfaced. Adds a
          // subtle "needs response" chip next to the status pill — it's the
          // one cell on this page that drives an action.
          const daysOut = daysSince(row.createdDate);
          const isStalePending = row.status === 'sent' && daysOut >= 7;
          return (
            <div className="flex items-center gap-1.5">
              <BidStatusBadge status={row.status} />
              {isStalePending ? (
                <span
                  className="bg-strat-orange/10 text-strat-orange border-strat-orange/30 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium"
                  title={`Sent ${daysOut} days ago — consider following up`}
                >
                  {daysOut}d out
                </span>
              ) : null}
            </div>
          );
        },
        size: 170,
      }),
      columnHelper.accessor('createdDate', {
        id: 'createdDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: (info) => {
          const iso = info.getValue();
          return (
            <div className="text-sm tabular-nums leading-tight">
              <div className="text-foreground">{formatShortDate(iso)}</div>
              <div className="text-muted-foreground text-xs">{relativeAgo(iso)}</div>
            </div>
          );
        },
        size: 130,
      }),
      columnHelper.accessor('salesperson', {
        id: 'salesperson',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Salesperson" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
        size: 120,
      }),
      columnHelper.accessor('serviceCount', {
        id: 'serviceCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Services" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.getValue()} services</span>
        ),
        size: 110,
      }),
      columnHelper.accessor('estDailyTotal', {
        id: 'estDailyTotal',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Est. Daily Total" />
        ),
        cell: (info) => (
          <span className="font-medium tabular-nums">
            $
            {info.getValue().toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
        size: 140,
      }),
    ],
    [columnHelper]
  );

  return (
    <DataListShell
      data={rows}
      columns={columns}
      searchPlaceholder="Search by customer..."
      searchableKeys={['customerName', 'salesperson']}
      filters={[
        {
          id: 'status',
          label: 'Status',
          options: [
            { value: 'sent', label: 'Pending' },
            { value: 'accepted', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'lost', label: 'Lost' },
          ],
        },
      ]}
      onRowClick={(row) => navigate({ to: '/bids/$bidId', params: { bidId: row.id } })}
      emptyMessage="No bids match your filters."
      actions={
        <Button asChild>
          <Link to="/bids/new">
            <Plus />
            New Bid
          </Link>
        </Button>
      }
    />
  );
}
