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
