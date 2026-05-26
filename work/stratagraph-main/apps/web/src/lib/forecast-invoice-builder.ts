import type { ProjectionVersion } from '@repo/projections';
import type { InvoiceLine } from './invoice-builder';

export function buildForecastInvoiceLines(version: ProjectionVersion): InvoiceLine[] {
  return version.items
    .filter((item) => item.F.cost > 0)
    .map((item) => ({
      description: item.label,
      qty: item.F.qty,
      unitPrice: item.F.uc,
      amount: item.F.cost,
    }));
}

export function sumForecastInvoiceTotal(lines: InvoiceLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}
