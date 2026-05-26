// packages/projections/src/adapters/types.ts

import type { ProjectionItem, ProjectionVersion, FinancialSummary } from '../types';

export interface ProjectionAdapter {
  id: string;
  label: string;
  fileTypes: string[];
  parse(file: File): Promise<ProjectionItem[]>;
  parseBatch?(files: File[]): Promise<BatchUploadResult>;
  exportVersion?(items: ProjectionItem[], projectName: string, cycleLabel: string): Promise<Blob>;
  columnLabels: {
    keyPartLabels: string[];
  };
}

export interface BatchCycle {
  file: string;
  tab: string | null;
  type: 'pm-worksheet' | 'vista-dump';
  detectedDate: { month: number; year: number; iso: string } | null;
  label: string;
  rowCount: number;
  items: ProjectionItem[];
  notes: Record<string, string>;
}

export interface BatchUploadResult {
  cycles: BatchCycle[];
  financials: FinancialSummary | null;
  errors: Array<{ file: string; message: string }>;
}
