import type { ProjectionProject } from '@repo/projections';
import type { Customer, Invoice, Job } from './types';

/**
 * Single source of truth for resolving display names where ids may not map to
 * a store record. Demo data carries real-world names directly in id fields
 * (bid.customerId = "Florida's Turnpike Enterprise", invoice.projectId =
 * projection-project id) — every screen must resolve through here rather than
 * hand-rolling `find(...) ?? '—'`.
 */

/** Customer name for a bid/job customerId. Demo bids store the name itself. */
export function customerDisplayName(
  customerId: string,
  customers: Customer[]
): string {
  const c = customers.find((x) => x.id === customerId);
  if (c) return c.name;
  // Seed ids look like 'cust-*'; anything else is already a display name.
  return customerId.startsWith('cust-') ? '—' : customerId;
}

export interface InvoiceContext {
  /** What the invoice bills: well name (job) or project name (projection). */
  title: string;
  customerName: string;
  /** Set when the customer exists as a record (enables linking). */
  customerId?: string;
  jobNumber: string;
  /** Present when the invoice bills a Stratagraph job. */
  job?: Job;
  /** Present when the invoice bills a Superior projection project. */
  project?: ProjectionProject;
}

/**
 * Resolve who/what an invoice bills. `invoice.projectId` is a Job id for
 * Stratagraph invoices and a ProjectionProject id for Superior invoices.
 */
export function resolveInvoiceContext(
  invoice: Invoice,
  jobs: Job[],
  customers: Customer[],
  projectionProjects: ProjectionProject[]
): InvoiceContext | null {
  const job = jobs.find((j) => j.id === invoice.projectId);
  if (job) {
    const customer = customers.find((c) => c.id === job.customerId);
    return {
      title: job.wellName,
      customerName: customer?.name ?? customerDisplayName(job.customerId, customers),
      customerId: customer?.id,
      jobNumber: job.jobNumber,
      job,
    };
  }
  const project = projectionProjects.find((p) => p.id === invoice.projectId);
  if (project) {
    return {
      title: project.name,
      customerName: project.customer,
      jobNumber: project.jobNumber,
      project,
    };
  }
  return null;
}
