import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  cn,
} from '@repo/ui';
import { Briefcase, Building2, FileText, MapPin, Receipt, Search } from 'lucide-react';
import { useStore } from '~/lib/store';

/**
 * Cmd-K global search. Indexes jobs, bids, customers, wells, and invoices.
 * Click a result to navigate.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const customers = useStore((s) => s.customers);
  const wells = useStore((s) => s.wells);
  const jobs = useStore((s) => s.jobs);
  const bids = useStore((s) => s.bids);
  const invoices = useStore((s) => s.invoices);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Build a flat index of searchable rows so cmdk's fuzzy match has everything in one place.
  const items = useMemo(() => {
    const jobItems = jobs.map((j) => {
      const c = customers.find((x) => x.id === j.customerId);
      return {
        key: `job-${j.id}`,
        group: 'Jobs',
        label: j.wellName,
        sub: `${c?.name ?? '—'} · ${j.jobNumber}`,
        icon: 'job' as const,
        href: `/jobs/${j.id}`,
        searchText: `${j.wellName} ${c?.name ?? ''} ${j.jobNumber}`,
      };
    });
    const bidItems = bids.map((b) => {
      const c = customers.find((x) => x.id === b.customerId);
      return {
        key: `bid-${b.id}`,
        group: 'Bids',
        label: `${c?.name ?? 'Bid'} v${b.version}`,
        sub: `${b.services.length} services · ${b.status}`,
        icon: 'bid' as const,
        href: `/bids/${b.id}`,
        searchText: `${c?.name ?? ''} v${b.version} ${b.status}`,
      };
    });
    const customerItems = customers.map((c) => ({
      key: `customer-${c.id}`,
      group: 'Customers',
      label: c.name,
      sub: `${c.city}, ${c.state}`,
      icon: 'customer' as const,
      href: `/customers/${c.id}`,
      searchText: `${c.name} ${c.city} ${c.contactName}`,
    }));
    const wellItems = wells.map((w) => {
      const c = customers.find((x) => x.id === w.customerId);
      return {
        key: `well-${w.id}`,
        group: 'Projects',
        label: w.name,
        sub: c
          ? `${c.name}${w.county ? ` · ${w.county}, ${w.state ?? ''}` : ''}`
          : (w.county ?? '—'),
        icon: 'well' as const,
        href: `/customers/${w.customerId}`,
        searchText: `${w.name} ${c?.name ?? ''} ${w.apiNumber ?? ''}`,
      };
    });
    const invoiceItems = invoices.map((t) => {
      const j = jobs.find((x) => x.id === t.projectId);
      return {
        key: `invoice-${t.id}`,
        group: 'Invoices',
        label: `Invoice ${t.invoiceNumber}`,
        sub: `${j?.wellName ?? '—'} · ${t.status}`,
        icon: 'invoice' as const,
        href: `/invoices/${t.id}`,
        searchText: `${t.invoiceNumber} ${j?.wellName ?? ''} ${t.status}`,
      };
    });
    return { jobItems, bidItems, customerItems, wellItems, invoiceItems };
  }, [customers, wells, jobs, bids, invoices]);

  const handleSelect = (href: string) => {
    setOpen(false);
    navigate({ to: href });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground h-8 w-64 justify-between gap-2 px-2 font-normal"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          Search…
        </span>
        <kbd className="bg-muted text-muted-foreground inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
          <Command className={cn('[&_[cmdk-input-wrapper]]:border-b')}>
            <CommandInput placeholder="Search jobs, bids, customers, wells, invoices…" />
            <CommandList className="max-h-[420px]">
              <CommandEmpty>No matches.</CommandEmpty>
              <SearchGroup
                heading="Jobs"
                items={items.jobItems}
                onSelect={handleSelect}
              />
              <SearchGroup
                heading="Bids"
                items={items.bidItems}
                onSelect={handleSelect}
              />
              <SearchGroup
                heading="Customers"
                items={items.customerItems}
                onSelect={handleSelect}
              />
              <SearchGroup
                heading="Projects"
                items={items.wellItems}
                onSelect={handleSelect}
              />
              <SearchGroup
                heading="Invoices"
                items={items.invoiceItems}
                onSelect={handleSelect}
              />
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

type SearchItem = {
  key: string;
  label: string;
  sub: string;
  icon: 'job' | 'bid' | 'customer' | 'well' | 'invoice';
  href: string;
  searchText: string;
};

const ICON_FOR: Record<SearchItem['icon'], React.ComponentType<{ className?: string }>> = {
  job: Briefcase,
  bid: FileText,
  customer: Building2,
  well: MapPin,
  invoice: Receipt,
};

function SearchGroup({
  heading,
  items,
  onSelect,
}: {
  heading: string;
  items: SearchItem[];
  onSelect: (href: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <CommandGroup heading={heading}>
      {items.map((it) => {
        const Icon = ICON_FOR[it.icon];
        return (
          <CommandItem
            key={it.key}
            value={`${it.searchText} ${heading}`}
            onSelect={() => onSelect(it.href)}
            className="gap-2"
          >
            <Icon className="text-muted-foreground size-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{it.label}</div>
              <div className="text-muted-foreground truncate text-xs">{it.sub}</div>
            </div>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
