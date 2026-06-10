import type { Service, ProjectionProject } from '@repo/projections';
import { createRegistry, addServiceItem, recommendedRateFromSources } from '@repo/projections';
import type { BillingUnit, DailyCode, ServiceCatalogItem, ServiceCategory } from '~/lib/types';
import { SERVICE_CATALOG } from './service-catalog';

/**
 * Operations read-model. `Service` (in @repo/projections) is the single source
 * of truth for service data, edited via the admin Services page. The operations
 * screens (bids, jobs, invoices, reports, P&L) consume a Stratagraph-typed
 * *projection* of it — `ServiceCatalogItem` — that is always DERIVED from
 * `services`, never stored or seeded independently. That's what makes admin
 * edits flow everywhere with no possibility of desync.
 *
 * Round-trips buildStratagraphServices(): ids are preserved, so existing
 * BidService.catalogItemId references stay valid. Only meaningful for the
 * Stratagraph tenant — Superior's services are projection-derived.
 */
function catalogFromServices(services: Service[]): ServiceCatalogItem[] {
  return services.map((s) => ({
    id: s.id,
    category: s.costType as ServiceCategory,
    name: s.canonicalName,
    // Stored rate (Stratagraph rate card) wins; otherwise derive a recommended
    // rate from cost history (Superior) so the catalog rate is never blank when
    // the data can justify one.
    defaultRate: s.recommendedRate ?? recommendedRateFromSources(s.sources),
    rateNote: s.rateNote,
    dailyCode: (s.dailyCode ?? undefined) as DailyCode | undefined,
    billingUnit: (s.billingUnit ?? 'per_day') as BillingUnit,
  }));
}

/**
 * Memoized accessor for the operations catalog. One-slot cache keyed on the
 * `services` array identity: as long as `services` hasn't changed, the same
 * catalog array reference is returned — so `useStore((s) => selectServiceCatalog(s.services))`
 * is stable for React's snapshot caching and only recomputes on a real edit.
 *
 * This is the ONE access path for service data in the operations UI. No screen
 * imports the raw SERVICE_CATALOG seed or holds its own copy.
 */
let _catalogMemo: { src: Service[]; out: ServiceCatalogItem[] } | null = null;
export function selectServiceCatalog(services: Service[]): ServiceCatalogItem[] {
  if (_catalogMemo && _catalogMemo.src === services) return _catalogMemo.out;
  const out = catalogFromServices(services);
  _catalogMemo = { src: services, out };
  return out;
}

/** Single-item lookup over the derived catalog. */
export function selectService(services: Service[], id: string): ServiceCatalogItem | undefined {
  return selectServiceCatalog(services).find((c) => c.id === id);
}

/** Stratagraph rate card → Service[] (identity + recommendedRate/billing; no cost sources). */
export function buildStratagraphServices(): Service[] {
  return SERVICE_CATALOG.map((it) => ({
    id: it.id,
    tenantId: 'stratagraph' as const,
    canonicalName: it.name,
    unitOfMeasure: String(it.billingUnit).replace(/^per_/, ''),
    costType: it.category,
    aliases: [],
    createdAt: '',
    projectIds: [],
    sources: [],
    recommendedRate: it.defaultRate,
    rateNote: it.rateNote,
    billingUnit: it.billingUnit as string,
    dailyCode: it.dailyCode ?? null,
  }));
}

// ---------------------------------------------------------------------------
// KNOWN MIXED-UNIT SERVICES — flagged for a later decision (not yet resolved).
//
// The merge below keys on canonicalName + costType and ignores the phase code,
// so lines that share a description but use different units collapse into one
// service. Three such cases exist in the real job-25807 data; the table shows
// them with a "mixed" unit badge and suppresses the blended unit cost (see
// sourcesUomVaries / ServiceBreakdown). They split into two kinds:
//
//   Genuinely different units (parent phase + numbered sub-phase) — arguably
//   should NOT be one service. Fix candidate: include phaseCode in the merge key.
//     • Excavation - Roadway / 2Labor   →  B-310- (CY)  +  B-310-000 (BCY)
//     • Place & Compact Fill / 2Labor   →  B-350- (CY)  +  B-350-000 (CCY)
//
//   Same unit, spelled two ways (Vista inconsistency) — a false positive.
//   Fix candidate: unit normalization (MOS → MO, etc.).
//     • Equipment Moving / 2Labor       →  G-013-000 (MOS)  +  G013-000- (MO)
//
// Decision pending — see memory: project-mixed-unit-root-cause.
// ---------------------------------------------------------------------------

/** Superior projection projects → Service[] via the registry engine (dedup-merge + OE/CTD/F sources). */
export function buildSuperiorServices(projects: ProjectionProject[]): Service[] {
  let reg = createRegistry('superior');
  for (const proj of projects) {
    const latest = proj.versions[proj.versions.length - 1];
    if (!latest) continue;
    for (const item of latest.items) {
      reg = addServiceItem(reg, {
        canonicalName: item.label,
        unitOfMeasure: item.unitOfMeasure,
        costType: item.keyParts[1] || '',
        sourceProjectId: proj.id,
        source: {
          projectId: proj.id,
          lineKey: item.lineKey,
          phaseCode: item.keyParts[0] ?? '',
          unitOfMeasure: item.unitOfMeasure,
          date: latest.createdAt,
          ctd: { qty: item.CTD.qty, hours: item.CTD.hours, cost: item.CTD.cost },
          oe:  { qty: item.Est.qty, cost: item.Est.cost },
          f:   { qty: item.F.qty,  cost: item.F.cost },
        },
      });
    }
  }
  return reg.items;
}
