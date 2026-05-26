// packages/projections/src/adapters/vista.ts

import { makeLineKey, blankSlice } from '../engine';
import type { ProjectionItem } from '../types';
import type { ProjectionAdapter } from './types';

// --- Parsing helpers (ported from parseVista.js) ---

const SLICE_FIELDS = ['qty', 'hours', 'upm', 'mpu', 'uc', 'cost'] as const;

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function splitCostTypeUM(raw: unknown): { costType: string; um: string } {
  const s = String(raw ?? '').trim();
  if (!s) return { costType: '', um: '' };
  const tokens = s.split(/\s+/);
  const first = tokens[0] ?? '';
  const digitMatch = first.match(/^(\d+)([A-Za-z]+)?$/);
  if (!digitMatch) return { costType: '', um: '' };
  const digits = digitMatch[1] ?? '';
  let name = digitMatch[2] ?? '';
  let umStart = 1;
  if (!name && tokens.length > 1 && /^[A-Za-z]/.test(tokens[1] ?? '')) {
    name = tokens[1] ?? '';
    umStart = 2;
  }
  if (!name) return { costType: '', um: '' };
  return { costType: digits + name, um: tokens.slice(umStart).join(' ') };
}

function sliceFromRow(row: unknown[], startIdx: number) {
  const obj: Record<string, number> = {};
  SLICE_FIELDS.forEach((field, i) => {
    obj[field] = num(row[startIdx + i]);
  });
  return obj as { qty: number; hours: number; upm: number; mpu: number; uc: number; cost: number };
}

function firstOf(idxOf: (n: string) => number, ...names: string[]): number {
  for (const n of names) {
    const i = idxOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

function fSliceIsConsecutive(headers: string[], fQtyIdx: number): boolean {
  if (fQtyIdx < 0) return false;
  const next = (headers[fQtyIdx + 2] ?? '').toLowerCase();
  return next.includes('u/m') || next.includes('upm');
}

interface ColumnMap {
  phase: number;
  desc: number;
  ctum: number;
  CTP_start: number;
  CTD_start: number;
  CTC_start: number;
  F_consecutive: boolean;
  F_start: number;
  F_qty: number;
  F_hours: number;
  F_upm: number;
  F_mpu: number;
  F_uc: number;
  F_cost: number;
  F_cost_alt: number;
  Est_start: number;
  estVar: number;
  comp: number;
  calcHrs: number;
  prevForecast: number;
  risk: number;
  notes: number;
}

function resolveColumns(headers: string[]): ColumnMap {
  const idxOf = (name: string) =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const fQtyIdx = idxOf('F Qty');
  const consecutive = fSliceIsConsecutive(headers, fQtyIdx);

  return {
    phase: idxOf('Phase'),
    desc: firstOf(idxOf, 'PhaseDescription', 'Phase Description'),
    ctum: firstOf(idxOf, 'CostType UM', 'Cost Type/UM'),
    CTP_start: idxOf('CTP Qty'),
    CTD_start: idxOf('CTD Qty'),
    CTC_start: idxOf('CTC Qty'),
    F_consecutive: consecutive,
    F_start: consecutive ? fQtyIdx : -1,
    F_qty: fQtyIdx,
    F_hours: firstOf(idxOf, 'F Hours', 'F Hrs'),
    F_upm: idxOf('F U/M'),
    F_mpu: idxOf('F M/U'),
    F_uc: idxOf('F UC'),
    F_cost: firstOf(idxOf, 'F Cost', 'Current Projection / Forecast', 'Current Projection'),
    F_cost_alt: firstOf(idxOf, 'Current Projection / Forecast', 'Current Projection'),
    Est_start: firstOf(idxOf, 'Est Qty', 'OE Qty'),
    estVar: idxOf('EstVar'),
    comp: firstOf(idxOf, 'Comp', '$ % Complete'),
    calcHrs: idxOf('Calc Hrs'),
    prevForecast: firstOf(idxOf, 'Last months forecast', "Last Month's Forecast"),
    risk: idxOf('Risk'),
    notes: idxOf('Notes'),
  };
}

function fSliceFromRow(row: unknown[], cols: ColumnMap) {
  if (cols.F_consecutive && cols.F_start >= 0) {
    return sliceFromRow(row, cols.F_start);
  }
  let cost = cols.F_cost >= 0 ? num(row[cols.F_cost]) : 0;
  if (cost === 0 && cols.F_cost_alt >= 0) {
    cost = num(row[cols.F_cost_alt]);
  }
  return {
    qty: cols.F_qty >= 0 ? num(row[cols.F_qty]) : 0,
    hours: cols.F_hours >= 0 ? num(row[cols.F_hours]) : 0,
    upm: cols.F_upm >= 0 ? num(row[cols.F_upm]) : 0,
    mpu: cols.F_mpu >= 0 ? num(row[cols.F_mpu]) : 0,
    uc: cols.F_uc >= 0 ? num(row[cols.F_uc]) : 0,
    cost,
  };
}

export function parseSheet(
  rows: unknown[][],
  fallbackHeaderRow = 1,
): { items: ProjectionItem[]; cols: ColumnMap; notes: Record<string, string> } {
  let headerRowIdx = rows.findIndex(
    (r) => r && r.some((c) => String(c ?? '').trim().toLowerCase() === 'phase'),
  );
  if (headerRowIdx === -1) headerRowIdx = fallbackHeaderRow;

  const headers = (rows[headerRowIdx] || []).map((c) => String(c ?? '').trim());
  const cols = resolveColumns(headers);

  if (cols.phase < 0 || cols.ctum < 0) {
    return { items: [], cols, notes: {} };
  }

  const items: ProjectionItem[] = [];
  const notes: Record<string, string> = {};

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const phase = str(r[cols.phase]);
    if (!phase) continue;
    const { costType, um } = splitCostTypeUM(r[cols.ctum]);
    if (!costType) continue;

    const lineKey = makeLineKey(phase, costType);

    const item: ProjectionItem = {
      lineKey,
      keyParts: [phase, costType],
      label: str(r[cols.desc >= 0 ? cols.desc : cols.phase + 1]),
      unitOfMeasure: um,
      CTP: cols.CTP_start >= 0 ? sliceFromRow(r, cols.CTP_start) : blankSlice(),
      CTD: cols.CTD_start >= 0 ? sliceFromRow(r, cols.CTD_start) : blankSlice(),
      CTC: cols.CTC_start >= 0 ? sliceFromRow(r, cols.CTC_start) : blankSlice(),
      F: fSliceFromRow(r, cols),
      Est: cols.Est_start >= 0 ? sliceFromRow(r, cols.Est_start) : blankSlice(),
      estVar: cols.estVar >= 0 ? num(r[cols.estVar]) : 0,
      comp: cols.comp >= 0 ? num(r[cols.comp]) : 0,
      prevForecast: 0,
      calcHrs: 0,
      wsRisk: 0,
      isNew: false,
      stale: false,
    };

    items.push(item);

    if (cols.notes >= 0) {
      const note = str(r[cols.notes]);
      if (note) {
        notes[lineKey] = note;
      }
    }
  }

  return { items, cols, notes };
}

async function parseVistaWorkbook(arrayBuffer: ArrayBuffer): Promise<ProjectionItem[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const wsName = wb.SheetNames[0] ?? '';
  const ws = wb.Sheets[wsName];
  if (!ws) throw new Error('Workbook has no sheets');
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as unknown[][];
  const { items } = parseSheet(rows, 1);

  if (items.length === 0) {
    throw new Error(
      'Could not find required columns (Phase / CostType UM / Cost Type/UM). ' +
        'Is this a Vista cost-report or PM worksheet export?',
    );
  }

  return items;
}

// --- The adapter ---

export const vistaAdapter: ProjectionAdapter = {
  id: 'vista',
  label: 'Vista Cost Report',
  fileTypes: ['.xls', '.xlsx', '.csv'],

  async parse(file: File): Promise<ProjectionItem[]> {
    const buf = await file.arrayBuffer();
    return parseVistaWorkbook(buf);
  },

  columnLabels: {
    keyPartLabels: ['Phase', 'Cost Type'],
  },
};
