import { DAILY_CODE_META } from '~/data/service-catalog';
import type { Bid, DailyCode, Job, ServiceCatalogItem } from './types';

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface BuildInvoiceLinesInput {
  job: Job;
  rangeStart: string;
  rangeEnd: string;
  bid: Bid | undefined;
  catalog: ServiceCatalogItem[];
  countCodeUnits: (jobId: string, code: DailyCode, start: string, end: string) => number;
  sumMileage: (jobId: string, start: string, end: string) => { crewMiles: number; unitMiles: number };
}

/**
 * Resolve a per-DailyCode rate map plus mileage rates from a bid. Used by both
 * the ticket detail page and the Generate Field Ticket preview so totals stay
 * in sync.
 */
function rateMapFromBid(bid: Bid | undefined, catalog: ServiceCatalogItem[]): {
  rateMap: Record<DailyCode, number | undefined>;
  crewMileRate?: number;
  unitMileRate?: number;
} {
  const rateMap: Record<DailyCode, number | undefined> = {} as never;
  let crewMileRate: number | undefined;
  let unitMileRate: number | undefined;
  if (bid) {
    bid.services.forEach((li) => {
      const cat = catalog.find((c) => c.id === li.catalogItemId);
      if (cat?.dailyCode) rateMap[cat.dailyCode] = li.rate;
      if (li.catalogItemId.startsWith('logging-004-unit-transportation')) unitMileRate = li.rate;
      if (li.catalogItemId.startsWith('logging-005-crew-transportation')) crewMileRate = li.rate;
    });
  }
  return { rateMap, crewMileRate, unitMileRate };
}

export function buildInvoiceLines({
  job,
  rangeStart,
  rangeEnd,
  bid,
  catalog,
  countCodeUnits,
  sumMileage,
}: BuildInvoiceLinesInput): InvoiceLine[] {
  const { rateMap, crewMileRate, unitMileRate } = rateMapFromBid(bid, catalog);

  const codes = new Set<DailyCode>();
  job.serviceRuns.forEach((r) => codes.add(r.code));

  const dailyLines: InvoiceLine[] = Array.from(codes)
    .map((code) => {
      const qty = countCodeUnits(job.id, code, rangeStart, rangeEnd);
      const meta = DAILY_CODE_META.find((m) => m.code === code);
      const rate = rateMap[code] ?? 0;
      return {
        description: meta?.label.toUpperCase() ?? code,
        qty,
        unitPrice: rate,
        amount: qty * rate,
      };
    })
    .filter((line) => line.qty > 0);

  const mileage = sumMileage(job.id, rangeStart, rangeEnd);
  const mileageLines: InvoiceLine[] = [];
  if (mileage.unitMiles > 0 && unitMileRate) {
    mileageLines.push({
      description: 'UNIT TRANSPORTATION (MILEAGE)',
      qty: mileage.unitMiles,
      unitPrice: unitMileRate,
      amount: mileage.unitMiles * unitMileRate,
    });
  }
  if (mileage.crewMiles > 0 && crewMileRate) {
    mileageLines.push({
      description: 'CREW TRANSPORTATION (MILEAGE)',
      qty: mileage.crewMiles,
      unitPrice: crewMileRate,
      amount: mileage.crewMiles * crewMileRate,
    });
  }

  return [...dailyLines, ...mileageLines];
}

export function sumInvoiceTotal(lines: InvoiceLine[]): number {
  return lines.reduce((s, l) => s + l.amount, 0);
}
