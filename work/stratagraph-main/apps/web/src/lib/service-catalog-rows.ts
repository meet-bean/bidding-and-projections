import type { MetricsCatalog, ServiceItem } from '@repo/projections';
import { primaryPhase } from '@repo/projections';
import { costTypeLabel, type CostType } from './cost-types';
import { aggregateCtd } from './service-catalog-aggregate';

export interface ServiceCatalogRow {
  id: string;
  name: string;
  costType: CostType;
  uom: string;
  projectCount: number;
  phaseCode: string | null;
  phaseVaries: boolean;
  sourceCount: number;
  ctd: Record<string, number>;
  item: ServiceItem;
}

export function toCatalogRows(items: ServiceItem[], catalog: MetricsCatalog): ServiceCatalogRow[] {
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
      sourceCount: item.sources.length,
      ctd: aggregateCtd(catalog, item.sources),
      item,
    };
  });
}
