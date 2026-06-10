import type { MetricsCatalog, Service } from '@repo/projections';
import { groupUC, primaryPhase } from '@repo/projections';
import { costTypeLabel } from './cost-types';

/** One row of the shared Services screen — same columns for both tenants. */
export interface ServiceRow {
  id: string;
  tenantId: string;
  name: string;
  /** Cost-type label (Superior) or rate-card category (Stratagraph). */
  type: string;
  /** Daily code (Stratagraph) or primary phase code (Superior). */
  code: string | null;
  codeVaries: boolean;
  unit: string;
  usedIn: number;
  recommendedRate: number | null;
  rateNote: string | null;
  originalUC: number | null;
  actualUC: number | null;
  forecastUC: number | null;
  service: Service;
}

export function toServiceRows(services: Service[], catalog: MetricsCatalog): ServiceRow[] {
  return services.map((s) => {
    const isSuperior = s.tenantId === 'superior';
    const phase = primaryPhase(s);
    return {
      id: s.id,
      tenantId: s.tenantId,
      name: s.canonicalName,
      type: isSuperior ? costTypeLabel(s.costType) : s.costType,
      code: s.dailyCode ?? phase.code,
      codeVaries: s.dailyCode ? false : phase.varies,
      unit: s.unitOfMeasure || '—',
      usedIn: s.projectIds.length,
      recommendedRate: s.recommendedRate,
      rateNote: s.rateNote,
      originalUC: isSuperior ? groupUC(catalog, 'OE', s.sources) : null,
      actualUC: isSuperior ? groupUC(catalog, 'CTD', s.sources) : null,
      forecastUC: isSuperior ? groupUC(catalog, 'F', s.sources) : null,
      service: s,
    };
  });
}
