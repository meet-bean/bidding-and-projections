// packages/projections/src/adapters/batch-upload.ts

import { num, str, parseSheet } from './vista';
import type { ProjectionItem, FinancialSummary } from '../types';
import type { BatchCycle, BatchUploadResult } from './types';

const COST_TAB_RE = /^Cost\s+(\d{2})-(\d{2})\s*$/i;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function classifyWorkbook(wb: { SheetNames: string[] }): 'pm-worksheet' | 'vista-dump' {
  const costTabs = wb.SheetNames.filter((n) => COST_TAB_RE.test(n));
  return costTabs.length > 0 ? 'pm-worksheet' : 'vista-dump';
}

function dateFromTabName(tabName: string): { month: number; year: number; iso: string } | null {
  const m = tabName.match(COST_TAB_RE);
  if (!m) return null;
  const month = parseInt(m[1] ?? '', 10);
  const year = 2000 + parseInt(m[2] ?? '', 10);
  return { month, year, iso: `${year}-${String(month).padStart(2, '0')}-01` };
}

function dateFromFileName(name: string): { month: number; year: number; iso: string } | null {
  const m = name.match(/(\d{4})[-_ ](\d{2})/) || name.match(/(\d{2})[-_ ](\d{2,4})/);
  if (!m) return null;
  const a = m[1] ?? '';
  const b = m[2] ?? '';
  const year = a.length === 4 ? parseInt(a) : 2000 + parseInt(b.length === 2 ? b : b.slice(2));
  const month = a.length === 4 ? parseInt(b) : parseInt(a);
  if (month < 1 || month > 12) return null;
  return { month, year, iso: `${year}-${String(month).padStart(2, '0')}-01` };
}

function dateLabel(dateObj: { month: number; year: number } | null): string {
  if (!dateObj) return 'Unknown Date';
  return `${MONTH_NAMES[dateObj.month - 1]} ${dateObj.year} Projection`;
}

function parseSummaryTab(ws: unknown, XLSX: typeof import('xlsx')): FinancialSummary | null {
  const rows = XLSX.utils.sheet_to_json(ws as import('xlsx').WorkSheet, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];

  const months: FinancialSummary['months'] = [];
  let originalBid: FinancialSummary['originalBid'] = null;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const label = str(r[0]).toLowerCase();

    if (label.includes('original') && label.includes('bid')) {
      originalBid = {
        revenue: num(r[1]),
        cost: num(r[2]),
        profit: num(r[3]),
        gpPct: num(r[4]),
      };
      continue;
    }

    const dateMatch = str(r[0]).match(
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i,
    );
    if (dateMatch && num(r[1]) > 0) {
      const monthIdx = MONTH_NAMES.findIndex((m) =>
        m.toLowerCase().startsWith((dateMatch[1] ?? '').toLowerCase()),
      );
      const year = parseInt(dateMatch[2] ?? '');
      months.push({
        date: `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`,
        revenue: num(r[1]),
        cost: num(r[2]),
        profit: num(r[3]),
        gpPct: num(r[4]),
      });
    }
  }

  if (!originalBid && months.length === 0) return null;
  return { months, originalBid };
}

export async function parseBatchUpload(files: File[]): Promise<BatchUploadResult> {
  const XLSX = await import('xlsx');
  const cycles: BatchCycle[] = [];
  let financials: FinancialSummary | null = null;
  const errors: Array<{ file: string; message: string }> = [];

  for (const file of files) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const type = classifyWorkbook(wb);

      if (type === 'pm-worksheet') {
        const summarySheet = wb.SheetNames.find((n) => n.toLowerCase() === 'summary');
        if (summarySheet) {
          const parsed = parseSummaryTab(wb.Sheets[summarySheet], XLSX);
          if (parsed) financials = parsed;
        }

        for (const tabName of wb.SheetNames) {
          if (!COST_TAB_RE.test(tabName)) continue;
          const detected = dateFromTabName(tabName);
          const ws = wb.Sheets[tabName];
          if (!ws) continue;
          const rows = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
            blankrows: false,
          }) as unknown[][];
          const { items, notes } = parseSheet(rows, 3);
          if (items.length === 0) continue;

          cycles.push({
            file: file.name,
            tab: tabName,
            type: 'pm-worksheet',
            detectedDate: detected,
            label: dateLabel(detected),
            rowCount: items.length,
            items,
            notes,
          });
        }
      } else {
        const wsName = wb.SheetNames[0] ?? '';
        const ws = wb.Sheets[wsName];
        if (!ws) {
          errors.push({ file: file.name, message: 'Workbook has no sheets' });
          continue;
        }
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          blankrows: false,
        }) as unknown[][];
        const { items } = parseSheet(rows, 1);

        if (items.length === 0) {
          errors.push({
            file: file.name,
            message: 'Could not find Phase/CostType columns or no services found',
          });
          continue;
        }

        const detected = dateFromFileName(file.name);
        cycles.push({
          file: file.name,
          tab: null,
          type: 'vista-dump',
          detectedDate: detected,
          label: dateLabel(detected),
          rowCount: items.length,
          items,
          notes: {},
        });
      }
    } catch (e) {
      errors.push({ file: file.name, message: (e as Error).message });
    }
  }

  cycles.sort((a, b) => {
    if (!a.detectedDate) return 1;
    if (!b.detectedDate) return -1;
    return a.detectedDate.iso.localeCompare(b.detectedDate.iso);
  });

  return { cycles, financials, errors };
}
