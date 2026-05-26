import { cn } from '@repo/ui';
import { Check } from 'lucide-react';
import type { InvoiceStatus } from '~/lib/types';

interface Stage {
  id: InvoiceStatus;
  label: string;
}

const STAGES: Stage[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'paid', label: 'Paid' },
];

function currentIndex(status: InvoiceStatus): number {
  return STAGES.findIndex((s) => s.id === status);
}

/**
 * Compact, single-line progress for the ticket card on a job page.
 */
export function TicketLifecycleStrip({ status }: { status: InvoiceStatus }) {
  const idx = currentIndex(status);
  return (
    <div className="flex items-center gap-0.5 text-[10px]">
      {STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-0.5">
            <span
              className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-medium',
                done && 'bg-success/15 text-success',
                current && 'bg-primary text-primary-foreground',
                !done && !current && 'bg-muted text-muted-foreground/60'
              )}
            >
              {done ? <Check className="size-2.5" /> : i + 1}
            </span>
            {i < STAGES.length - 1 ? (
              <span
                className={cn(
                  'h-px w-2',
                  done ? 'bg-success/40' : 'bg-muted-foreground/20'
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full lifecycle bar for the ticket detail page — wider, labeled, with timestamps.
 */
export function TicketLifecycleBar({
  status,
  generatedDate,
  sentDate,
  paidDate,
}: {
  status: InvoiceStatus;
  generatedDate?: string;
  sentDate?: string;
  paidDate?: string;
}) {
  const idx = currentIndex(status);

  return (
    <div className="bg-muted/20 rounded-md border p-4">
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
        Lifecycle
      </div>
      <div className="flex items-start justify-between">
        {STAGES.map((s, i) => {
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
                {i < STAGES.length - 1 ? (
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
              {current && s.id === 'draft' && generatedDate ? (
                <div className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                  {generatedDate}
                </div>
              ) : null}
              {current && s.id === 'sent' && sentDate ? (
                <div className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                  {sentDate}
                </div>
              ) : null}
              {current && s.id === 'paid' && paidDate ? (
                <div className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                  {paidDate}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
