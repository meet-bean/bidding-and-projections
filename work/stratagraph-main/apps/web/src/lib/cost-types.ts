export const COST_TYPES = ['Labor', 'Material', 'Equipment', 'Subcontract', 'Other'] as const;
export type CostType = (typeof COST_TYPES)[number];

const COST_TYPE_LABELS: Record<string, CostType> = {
  '2Labor': 'Labor',
  '3Material': 'Material',
  '4Rental': 'Equipment',
  '5SubCont': 'Subcontract',
  '6OtherJC': 'Other',
  '8Parts': 'Material',
  '9Owned': 'Equipment',
  '10Health': 'Labor',
  '11Fuel': 'Equipment',
};

export function costTypeLabel(raw: string): CostType {
  return COST_TYPE_LABELS[raw] ?? 'Other';
}

export const COST_TYPE_COLOR: Record<CostType, string> = {
  Labor: '#536ed7',
  Material: '#53a9c4',
  Equipment: '#e7c341',
  Subcontract: '#dc8c46',
  Other: '#bba199',
};
