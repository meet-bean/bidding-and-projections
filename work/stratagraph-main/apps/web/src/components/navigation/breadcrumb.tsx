import { Link, useLocation } from '@tanstack/react-router';
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui';
import { Fragment } from 'react';
import { useStore } from '~/lib/store';

const LABEL_MAP: Record<string, string> = {
  home: 'Home',
  reports: 'Reports',
  board: 'Board',
  dashboard: 'Overview',
  jobs: 'Jobs',
  bids: 'Bids',
  new: 'New',
  customers: 'Customers',
  crew: 'Crew',
  equipment: 'Equipment',
  services: 'Services',
  yards: 'Yards',
  users: 'Team',
  invoices: 'Invoices',
};

function staticLabel(segment: string): string {
  return LABEL_MAP[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Resolve a dynamic segment (an entity id like "cust-matador") to a human label
 * by looking up its parent segment ("customers"). Returns null if the segment
 * isn't a known entity id pattern.
 */
function resolveDynamicLabel(
  parent: string,
  id: string,
  store: ReturnType<typeof useStore.getState>
): string | null {
  if (parent === 'customers') {
    return store.customers.find((c) => c.id === id)?.name ?? null;
  }
  if (parent === 'jobs') {
    const job = store.jobs.find((j) => j.id === id);
    return job ? `${job.jobNumber} · ${job.wellName}` : null;
  }
  if (parent === 'bids') {
    const bid = store.bids.find((b) => b.id === id);
    if (!bid) return null;
    const cust = store.customers.find((c) => c.id === bid.customerId);
    return cust ? `${cust.name} · v${bid.version}` : `Bid v${bid.version}`;
  }
  if (parent === 'invoices') {
    const ticket = store.invoices.find((t) => t.id === id);
    return ticket ? `Invoice ${ticket.invoiceNumber}` : null;
  }
  if (parent === 'users' || parent === 'team') {
    return store.users.find((u) => u.id === id)?.name ?? null;
  }
  if (parent === 'equipment') {
    return store.units.find((u) => u.id === id)?.code ?? null;
  }
  if (parent === 'yards') {
    return store.yards.find((y) => y.id === id)?.name ?? null;
  }
  return null;
}

export function Breadcrumb() {
  const location = useLocation();
  // Subscribe to the entity stores so the breadcrumb re-renders when an entity
  // is renamed mid-session (rare, but the cost is negligible vs. stale labels).
  const customers = useStore((s) => s.customers);
  const jobs = useStore((s) => s.jobs);
  const bids = useStore((s) => s.bids);
  const invoices = useStore((s) => s.invoices);
  const users = useStore((s) => s.users);
  const units = useStore((s) => s.units);
  const yards = useStore((s) => s.yards);
  const store = { customers, jobs, bids, invoices, users, units, yards } as ReturnType<
    typeof useStore.getState
  >;

  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const segments = parts.map((part, i) => {
    const parent = i > 0 ? parts[i - 1]! : '';
    const resolved = resolveDynamicLabel(parent, part, store);
    return {
      label: resolved ?? staticLabel(part),
      href: '/' + parts.slice(0, i + 1).join('/'),
      isLast: i === parts.length - 1,
    };
  });

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        {segments.map((seg) => (
          <Fragment key={seg.href}>
            <BreadcrumbItem>
              {seg.isLast ? (
                <BreadcrumbPage>{seg.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={seg.href} />}>{seg.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!seg.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
