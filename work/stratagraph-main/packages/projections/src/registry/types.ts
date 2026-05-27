export interface ServiceAlias {
  raw: string;
  normalizedTo: string;
  sourceProjectId: string;
  sourceUploadDate: string;
}

export interface ServiceItem {
  id: string;
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;
  aliases: ServiceAlias[];
  createdAt: string;
  projectIds: string[];
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
