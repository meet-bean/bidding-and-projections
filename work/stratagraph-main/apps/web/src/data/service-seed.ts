import type { Service, ProjectionProject } from '@repo/projections';
import { createRegistry, addServiceItem } from '@repo/projections';
import { SERVICE_CATALOG } from './service-catalog';

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
