import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from '@repo/ui';
import { ArrowLeft, Download, Printer, PenLine, Send, DollarSign } from 'lucide-react';
import { useStore } from '~/lib/store';
import { formatDateRange } from '~/lib/format';
import { selectServiceCatalog } from '~/data/service-seed';
import { TicketLifecycleBar } from '~/components/ticket-lifecycle';
import { InvoiceStatusBadge } from '~/components/status-badges';
import { buildInvoiceLines, type InvoiceLine } from '~/lib/invoice-builder';
import type { InvoiceStatus } from '~/lib/types';

export const Route = createFileRoute('/_dashboard/invoices/$invoiceId')({
  component: InvoiceDetail,
});

/**
 * Reconstruct the original signed Matador voucher services from the seed.
 * For the prototype, we render exactly the services shown on the original
 * Field Service Ticket — quantities and prices captured verbatim.
 */
// NOTE: All unit prices here are generic placeholder figures for prototype
// safety — not the customer's actual rate card. Structure preserved.
const MATADOR_LINES: InvoiceLine[] = [
  { description: '2 MAN, MUDLOGGING SERVICE', qty: 25, unitPrice: 1000.0, amount: 25000.0 },
  { description: 'MASS SPECTROMETRY', qty: 25, unitPrice: 750.0, amount: 18750.0 },
  { description: 'MASS SPEC RIG UP / DOWN', qty: 1, unitPrice: 750.0, amount: 750.0 },
  { description: 'MASS SPEC TRANSPORTATION (MILEAGE)', qty: 351, unitPrice: 3.0, amount: 1053.0 },
  { description: 'MASS SPEC FINAL REPORT', qty: 1, unitPrice: 4000.0, amount: 4000.0 },
  { description: 'EXTRA PERSONNEL', qty: 34, unitPrice: 500.0, amount: 17000.0 },
  { description: 'UNIT TRANSPORTATION - PICK UP', qty: 180, unitPrice: 5.0, amount: 900.0 },
  { description: 'UNIT RIG - DOWN', qty: 1, unitPrice: 1000.0, amount: 1000.0 },
  { description: 'FTIR BUNDLE', qty: 25, unitPrice: 1000.0, amount: 25000.0 },
  { description: 'FTIR RIG UP / DOWN', qty: 1, unitPrice: 750.0, amount: 750.0 },
  { description: 'FTIR TRANSPORTATION (MILEAGE)', qty: 180, unitPrice: 5.0, amount: 900.0 },
  { description: 'FTIR FINAL REPORT (PER WELL)', qty: 1, unitPrice: 2500.0, amount: 2500.0 },
  { description: 'FTIR CONSUMABLES (PER WELL)', qty: 1, unitPrice: 500.0, amount: 500.0 },
  { description: 'OIL BASE MUD (PER LOGGER)', qty: 84, unitPrice: 50.0, amount: 4200.0 },
  { description: 'CALCIMETER', qty: 25, unitPrice: 100.0, amount: 2500.0 },
  { description: 'CREW TRANSPORTATION - LOGGERS', qty: 540, unitPrice: 2.0, amount: 1080.0 },
  { description: 'ISO TUBES (NOT SUPPLIED)', qty: 16, unitPrice: 100.0, amount: 1600.0 },
  { description: 'ISO MANIFOLD RENTAL (7 DAY MIN)(PER DAY)', qty: 3, unitPrice: 150.0, amount: 450.0 },
  { description: 'ISO SHIPMENT MILEAGE', qty: 180, unitPrice: 3.0, amount: 540.0 },
  { description: 'FINAL DELIVERABLE PACKAGE (PER WELL)', qty: 1, unitPrice: 500.0, amount: 500.0 },
  { description: 'CONSUMABLES (PER WELL)', qty: 1, unitPrice: 500.0, amount: 500.0 },
  { description: 'EXTRA SAMPLES ( PER SET )', qty: 1, unitPrice: 250.0, amount: 250.0 },
  { description: 'SHIPPING & HANDLING', qty: 1, unitPrice: 150.0, amount: 150.0 },
];

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const ticket = useStore((s) => s.invoices.find((t) => t.id === invoiceId));
  const job = useStore((s) => (ticket ? s.getJob(ticket.projectId) : undefined));
  const customer = useStore((s) => (job ? s.getCustomer(job.customerId) : undefined));
  const unit = useStore((s) => (job?.unitId ? s.getUnit(job.unitId) : undefined));
  const rig = useStore((s) => (job?.rigId ? s.getRig(job.rigId) : undefined));
  const bid = useStore((s) => (job ? s.getBid(job.bidId) : undefined));
  const catalog = useStore((s) => selectServiceCatalog(s.services));
  const countCodeUnits = useStore((s) => s.countCodeUnits);
  const sumMileage = useStore((s) => s.sumMileage);
  const setInvoiceStatus = useStore((s) => s.setInvoiceStatus);
  const organization = useStore((s) => s.organization);

  if (!ticket || !job) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/invoices' })}>
          <ArrowLeft />
          Back to Invoices
        </Button>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            Invoice not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use the canonical Matador lines if available; otherwise reconstruct from activity
  const isMatadorSeed = ticket.id === 'ticket-matador-001';
  const lines: InvoiceLine[] = isMatadorSeed
    ? MATADOR_LINES
    : buildInvoiceLines({
        job,
        rangeStart: ticket.rangeStart,
        rangeEnd: ticket.rangeEnd,
        bid,
        catalog,
        countCodeUnits,
        sumMileage,
      });

  const total = lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <PageHeaderTitle>Invoice {ticket.invoiceNumber}</PageHeaderTitle>
            <InvoiceStatusBadge status={ticket.status} />
          </div>
          <PageHeaderDescription>
            {customer?.name} · {job.wellName} · {formatDateRange(ticket.rangeStart, ticket.rangeEnd)}
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
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

      <div className="mx-auto w-full max-w-3xl space-y-3">
        <TicketLifecycleBar
          status={ticket.status}
          generatedDate={ticket.generatedDate}
          sentDate={ticket.sentDate}
          paidDate={ticket.paidDate}
        />
        <LifecycleActions
          status={ticket.status}
          onAdvance={(next) => setInvoiceStatus(ticket.id, next)}
        />
      </div>

      {/* The invoice itself — replicates the Stratagraph Field Service Ticket layout */}
      <Card className="mx-auto max-w-3xl shadow-sm">
        <CardContent className="space-y-6 p-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="text-primary text-xl font-bold tracking-tight">{organization.legalName}</div>
              <div className="text-muted-foreground text-xs">SEG Field Service Ticket</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Field Service Ticket</div>
              <div className="text-muted-foreground text-xs">V 2.25</div>
            </div>
          </div>

          {/* Bill to + meta grid */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                Remit To
              </div>
              <div className="text-sm">{organization.name}</div>
              <div className="text-muted-foreground text-xs">{organization.address}</div>
              <div className="text-muted-foreground text-xs">{organization.city}, {organization.state} {organization.zip}</div>

              <div className="text-muted-foreground mb-1 mt-3 text-xs font-semibold uppercase">
                Bill To
              </div>
              <div className="text-sm font-medium">{customer?.name}</div>
              <div className="text-muted-foreground text-xs">{customer?.billingAddress}</div>
              <div className="text-muted-foreground text-xs">
                {customer?.city}, {customer?.state} {customer?.zip}
              </div>
              {customer?.contactName ? (
                <div className="text-muted-foreground mt-1 text-xs">
                  Attn: {customer.contactName}
                </div>
              ) : null}
            </div>
            <div className="space-y-2 text-xs">
              <MetaRow label="Unit #" value={unit?.code ?? '—'} />
              <MetaRow label="Invoice #" value={ticket.invoiceNumber} />
              <MetaRow label="Start Date" value={ticket.rangeStart} />
              <MetaRow label="End Date" value={ticket.rangeEnd} />
              <MetaRow label="API #" value={job.apiNumber ?? '—'} />
              <MetaRow label="Rig" value={rig?.name ?? '—'} />
              <MetaRow label="County/State" value={`${job.county ?? '—'}, ${job.state ?? ''}`} />
              <MetaRow label="AFE" value={job.afe ?? '—'} />
            </div>
          </div>

          {/* Well name */}
          <div className="bg-muted/40 -mx-2 rounded-md px-3 py-2">
            <div className="text-muted-foreground text-[10px] font-semibold uppercase">
              Well Name
            </div>
            <div className="text-sm font-medium">{job.wellName}</div>
          </div>

          {/* Services */}
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider">
                <th className="py-2 text-left font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Unit Price</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-muted-foreground py-6 text-center text-sm italic"
                  >
                    No activity recorded in this date range.
                  </td>
                </tr>
              ) : (
                lines.map((l, i) => (
                  <tr key={i} className="border-b text-sm">
                    <td className="py-1.5 pr-2">{l.description}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {l.qty.toLocaleString('en-US')}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      $
                      {l.unitPrice.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      $
                      {l.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right text-sm font-semibold uppercase">
                  Total (USD)
                </td>
                <td className="pt-3 text-right text-lg font-bold tabular-nums">
                  $
                  {total.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signature */}
          <div className="grid grid-cols-2 gap-6 border-t pt-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-1 font-semibold uppercase">Customer Approver</div>
              <div>{job.companyMan ?? '—'}</div>
              {ticket.signedDate ? (
                <div className="text-muted-foreground mt-2">Signed {ticket.signedDate}</div>
              ) : null}
            </div>
            <div>
              <div className="text-muted-foreground mb-1 font-semibold uppercase">Requisitioner</div>
              <div>{ticket.signedBy ?? '—'}</div>
              <div className="text-muted-foreground mt-2 italic">
                Charges are bound by the TERMS and CONDITIONS of the {organization.legalName} Final
                Deliverable Package and are not included in the estimated cost of Field Service.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-1">
      <span className="text-muted-foreground font-semibold uppercase">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

const NEXT_ACTION: Record<
  InvoiceStatus,
  { next: InvoiceStatus; label: string; icon: 'pen' | 'send' | 'dollar' } | null
> = {
  draft: { next: 'sent', label: 'Mark sent', icon: 'send' },
  sent: { next: 'paid', label: 'Mark paid', icon: 'dollar' },
  paid: null,
};

function LifecycleActions({
  status,
  onAdvance,
}: {
  status: InvoiceStatus;
  onAdvance: (next: InvoiceStatus) => void;
}) {
  const action = NEXT_ACTION[status];
  if (!action) {
    return (
      <div className="border-success/30 bg-success/5 text-success flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium">
        <DollarSign className="size-4" />
        Invoice paid in full
      </div>
    );
  }
  const Icon = action.icon === 'pen' ? PenLine : action.icon === 'dollar' ? DollarSign : Send;
  return (
    <Button
      size="lg"
      onClick={() => onAdvance(action.next)}
      className="w-full justify-center text-base"
    >
      <Icon />
      {action.label}
    </Button>
  );
}
