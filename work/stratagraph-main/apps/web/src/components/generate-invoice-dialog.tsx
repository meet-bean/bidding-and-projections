import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@repo/ui';
import { Receipt, AlertCircle } from 'lucide-react';
import { useStore } from '~/lib/store';
import { buildInvoiceLines, sumInvoiceTotal } from '~/lib/invoice-builder';
import type { Job } from '~/lib/types';

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function nextIso(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function GenerateInvoiceDialog({ open, onOpenChange, job }: GenerateInvoiceDialogProps) {
  const navigate = useNavigate();
  const bid = useStore((s) => s.getBid(job.bidId));
  const catalog = useStore((s) => s.serviceCatalog);
  const countCodeUnits = useStore((s) => s.countCodeUnits);
  const sumMileage = useStore((s) => s.sumMileage);
  const createInvoice = useStore((s) => s.createInvoice);
  const allInvoices = useStore((s) => s.invoices);

  // Start date is locked to "day after last invoice's end" — Mickey can never
  // accidentally double-bill a day or leave a gap. End date stays editable so
  // ops can bill partial periods.
  const priorInvoicesForJob = allInvoices
    .filter((t) => t.projectId === job.id)
    .sort((a, b) => (a.rangeEnd > b.rangeEnd ? -1 : 1));
  const lockedStart = priorInvoicesForJob.length > 0
    ? nextIso(priorInvoicesForJob[0]!.rangeEnd)
    : (job.startDate ?? todayIso());
  const defaultEnd = job.confirmedThrough ?? job.endDate ?? todayIso();

  const [rangeEnd, setRangeEnd] = useState(defaultEnd);
  const nextSeq = priorInvoicesForJob.length + 1;
  const [invoiceNumber, setInvoiceNumber] = useState(`${job.jobNumber}-${nextSeq}`);
  const rangeStart = lockedStart;

  useEffect(() => {
    if (!open) return;
    setRangeEnd(job.confirmedThrough ?? job.endDate ?? todayIso());
    setInvoiceNumber(`${job.jobNumber}-${nextSeq}`);
  }, [open, job.id]);

  const rangeValid = !!rangeStart && !!rangeEnd && rangeStart <= rangeEnd;

  const lines = useMemo(() => {
    if (!rangeValid) return [];
    return buildInvoiceLines({
      job,
      rangeStart,
      rangeEnd,
      bid,
      catalog,
      countCodeUnits,
      sumMileage,
    });
  }, [rangeValid, job, rangeStart, rangeEnd, bid, catalog, countCodeUnits, sumMileage]);

  const total = sumInvoiceTotal(lines);
  const hasActivity = lines.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rangeValid || !invoiceNumber.trim()) return;
    const id = createInvoice({
      jobId: job.id,
      rangeStart,
      rangeEnd,
      invoiceNumber: invoiceNumber.trim(),
      totalUsd: total,
    });
    onOpenChange(false);
    navigate({ to: '/invoices/$invoiceId', params: { invoiceId: id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Rolls up the daily activity in this range into a draft invoice priced from the
              accepted bid. You can still edit and advance it from the invoice page.
            </DialogDescription>
          </DialogHeader>

          {!bid ? (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
              <AlertCircle className="text-warning mt-0.5 size-4 shrink-0" />
              <div>
                No bid is attached to this job, so line items will have $0 unit prices. Attach a
                bid before generating, or proceed and adjust on the invoice.
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Invoice #" required>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={`${job.jobNumber}-${nextSeq}`}
                className="font-mono"
              />
            </Field>
            <Field
              label="From"
              hint={
                priorInvoicesForJob.length > 0
                  ? `Day after invoice #${priorInvoicesForJob[0]!.invoiceNumber}`
                  : 'Job start date'
              }
            >
              <Input
                type="date"
                value={rangeStart}
                disabled
                className="bg-muted/30 cursor-not-allowed"
              />
            </Field>
            <Field label="Through" required>
              <Input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                min={rangeStart || undefined}
              />
            </Field>
          </div>

          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Preview ({lines.length} {lines.length === 1 ? 'line' : 'lines'})</span>
              <span>Total</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {!rangeValid ? (
                <div className="text-muted-foreground p-4 text-center text-sm italic">
                  Pick a valid date range.
                </div>
              ) : !hasActivity ? (
                <div className="text-muted-foreground p-4 text-center text-sm italic">
                  No billable activity in this range.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-3 py-1.5">{l.description}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {l.qty.toLocaleString('en-US')} ×{' '}
                          ${l.unitPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                          $
                          {l.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-sm font-semibold">
              <span>Total (USD)</span>
              <span className="tabular-nums">
                $
                {total.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!rangeValid || !invoiceNumber.trim()}>
              <Receipt />
              Generate Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-muted-foreground text-[11px]">{hint}</p> : null}
    </div>
  );
}
