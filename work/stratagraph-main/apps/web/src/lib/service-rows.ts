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
  /** Forecast-vs-Original unit-cost variance, as a percentage. Superior only. */
  variancePct: number | null;
  service: Service;
}

export function toServiceRows(services: Service[], catalog: MetricsCatalog): ServiceRow[] {
  return services.map((s) => {
    const isSuperior = s.tenantId === 'superior';
    const phase = primaryPhase(s);
    const originalUC = isSuperior ? groupUC(catalog, 'OE', s.sources) : null;
    const forecastUC = isSuperior ? groupUC(catalog, 'F', s.sources) : null;
    const variancePct =
      originalUC != null && originalUC !== 0 && forecastUC != null
        ? ((forecastUC - originalUC) / originalUC) * 100
        : null;
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
      originalUC,
      actualUC: isSuperior ? groupUC(catalog, 'CTD', s.sources) : null,
      forecastUC,
      variancePct,
      service: s,
    };
  });
}
