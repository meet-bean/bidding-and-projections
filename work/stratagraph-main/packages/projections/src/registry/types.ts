export interface LineItemAlias {
  raw: string;
  normalizedTo: string;
  sourceProjectId: string;
  sourceUploadDate: string;
}

export interface LineItem {
  id: string;
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;
  aliases: LineItemAlias[];
  createdAt: string;
  projectIds: string[];
}

export interface LineItemRegistry {
  tenantId: string;
  items: LineItem[];
}

export interface FuzzyMatch {
  existingItem: LineItem;
  matchedFields: ('name' | 'costType' | 'unitOfMeasure')[];
  confidence: number;
}
