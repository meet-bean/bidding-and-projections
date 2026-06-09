export interface ServiceAlias {
  raw: string;
  normalizedTo: string;
  sourceProjectId: string;
  sourceUploadDate: string;
}

export interface ServiceSource {
  projectId: string;
  lineKey: string;
  phaseCode: string;
  qty: number;
  cost: number;
  unitCost: number;
  upm: number | null;
  date: string;
}

export interface ServiceItem {
  id: string;
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;
  aliases: ServiceAlias[];
  createdAt: string;
  projectIds: string[];
  sources?: ServiceSource[];
}

export interface ServiceRegistry {
  tenantId: string;
  items: ServiceItem[];
}

export interface FuzzyMatch {
  existingItem: ServiceItem;
  matchedFields: ('name' | 'costType' | 'unitOfMeasure')[];
  confidence: number;
}
