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
  date: string;
  ctd: { qty: number; hours: number; cost: number };
  oe:  { qty: number; cost: number };
  f:   { qty: number; cost: number };
}

export interface Service {
  id: string;
  tenantId: 'stratagraph' | 'superior';
  canonicalName: string;
  unitOfMeasure: string;
  costType: string;          // Superior cost type code, or Stratagraph category
  aliases: ServiceAlias[];
  createdAt: string;
  projectIds: string[];
  sources: ServiceSource[];
  recommendedRate: number | null;  // Stratagraph defaultRate; Superior null
  rateNote: string | null;
  billingUnit: string | null;      // Stratagraph billing cadence; Superior null
  dailyCode: string | null;        // Stratagraph code; Superior null (phase comes from sources)
}

/** @deprecated Use Service instead */
export type ServiceItem = Service;

export interface ServiceRegistry {
  tenantId: string;
  items: Service[];
}

export interface FuzzyMatch {
  existingItem: Service;
  matchedFields: ('name' | 'costType' | 'unitOfMeasure')[];
  confidence: number;
}
