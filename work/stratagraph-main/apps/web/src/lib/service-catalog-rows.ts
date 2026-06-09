import type { ServiceItem } from '@repo/projections';
import { rateRange, avgUpm, primaryPhase } from '@repo/projections';
import { costTypeLabel, type CostType } from './cost-types';

export interface ServiceCatalogRow {
  id: string;
  name: string;
  costType: CostType;
  uom: string;
  projectCount: number;
  phaseCode: string | null;
  phaseVaries: boolean;
  rate: { lo: number; avg: number; hi: number } | null;
  avgUpm: number | null;
  sourceCount: number;
  item: ServiceItem;
}

export function toCatalogRows(items: ServiceItem[]): ServiceCatalogRow[] {
  return items.map((item) => {
    const phase = primaryPhase(item);
    return {
      id: item.id,
      name: item.canonicalName,
      costType: costTypeLabel(item.costType),
      uom: item.unitOfMeasure || '—',
      projectCount: item.projectIds.length,
      phaseCode: phase.code,
      phaseVaries: phase.varies,
      rate: rateRange(item),
      avgUpm: avgUpm(item),
      sourceCount: item.sources.length,
      item,
    };
  });
}
