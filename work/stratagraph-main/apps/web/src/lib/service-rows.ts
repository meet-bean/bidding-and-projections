import type { MetricsCatalog, Service } from '@repo/projections';
import { groupUC, primaryPhase, sourcesUomVaries } from '@repo/projections';
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
  /** Sources span more than one unit of measure → blended UC is not meaningful. */
  uomVaries: boolean;
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
    // A blended unit cost is meaningless when sources span different units —
    // suppress it (and the variance) so the row never shows a wrong $/unit.
    const uomVaries = isSuperior && sourcesUomVaries(s.sources);
    const originalUC = isSuperior && !uomVaries ? groupUC(catalog, 'OE', s.sources) : null;
    const actualUC = isSuperior && !uomVaries ? groupUC(catalog, 'CTD', s.sources) : null;
    const forecastUC = isSuperior && !uomVaries ? groupUC(catalog, 'F', s.sources) : null;
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
      uomVaries,
      usedIn: s.projectIds.length,
      recommendedRate: s.recommendedRate,
      rateNote: s.rateNote,
      originalUC,
      actualUC,
      forecastUC,
      variancePct,
      service: s,
    };
  });
}
