// packages/projections/src/export/vista-xlsx.ts

import type { ProjectionItem, ProjectionProject } from '../types';

const HEADERS = [
  'Phase', 'PhaseDescription', 'CostType UM',
  'CTP Qty', 'CTP Hours', 'CTP U/M', 'CTP M/U', 'CTP UC', 'CTP Cost',
  'CTD Qty', 'CTD Hours', 'CTD U/M', 'CTD M/U', 'CTD UC', 'CTD Cost',
  'CTC Qty', 'CTC Hours', 'CTC U/M', 'CTC M/U', 'CTC UC', 'CTC Cost',
  'F Qty', 'F Hours', 'Calc Hrs', 'F U/M', 'F M/U', 'F UC', 'F Cost',
  'Last Months Forecast',
  'OE Qty', 'OE Hours', 'OE U/M', 'OE M/U', 'OE UC', 'OE Cost',
  'EstVar', 'Comp',
  'Current Projection / Forecast', 'Change From Prev', 'Left To Spend', 'Change From Orig',
  'Qty % Complete', '$ % Complete', 'Risk', 'Notes',
];

// Column letter helper (1-indexed)
function colLetter(col: number): string {
  let s = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

// Build column-index map from header names
function buildColMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[h] = i + 1; // 1-indexed
  });
  return map;
}

const COL_MAP = buildColMap(HEADERS);

// Safe accessor — all our keys are known to exist
function getCol(name: string): number {
  return COL_MAP[name] ?? 0;
}

// Pre-computed column indices for all used header names
const COL = {
  'Phase': getCol('Phase'),
  'PhaseDescription': getCol('PhaseDescription'),
  'CostType UM': getCol('CostType UM'),
  'CTP Qty': getCol('CTP Qty'),
  'CTP Hours': getCol('CTP Hours'),
  'CTP U/M': getCol('CTP U/M'),
  'CTP M/U': getCol('CTP M/U'),
  'CTP UC': getCol('CTP UC'),
  'CTP Cost': getCol('CTP Cost'),
  'CTD Qty': getCol('CTD Qty'),
  'CTD Hours': getCol('CTD Hours'),
  'CTD U/M': getCol('CTD U/M'),
  'CTD M/U': getCol('CTD M/U'),
  'CTD UC': getCol('CTD UC'),
  'CTD Cost': getCol('CTD Cost'),
  'CTC Qty': getCol('CTC Qty'),
  'CTC Hours': getCol('CTC Hours'),
  'CTC U/M': getCol('CTC U/M'),
  'CTC M/U': getCol('CTC M/U'),
  'CTC UC': getCol('CTC UC'),
  'CTC Cost': getCol('CTC Cost'),
  'F Qty': getCol('F Qty'),
  'F Hours': getCol('F Hours'),
  'Calc Hrs': getCol('Calc Hrs'),
  'F U/M': getCol('F U/M'),
  'F M/U': getCol('F M/U'),
  'F UC': getCol('F UC'),
  'F Cost': getCol('F Cost'),
  'Last Months Forecast': getCol('Last Months Forecast'),
  'OE Qty': getCol('OE Qty'),
  'OE Hours': getCol('OE Hours'),
  'OE U/M': getCol('OE U/M'),
  'OE M/U': getCol('OE M/U'),
  'OE UC': getCol('OE UC'),
  'OE Cost': getCol('OE Cost'),
  'EstVar': getCol('EstVar'),
  'Comp': getCol('Comp'),
  'Current Projection / Forecast': getCol('Current Projection / Forecast'),
  'Change From Prev': getCol('Change From Prev'),
  'Left To Spend': getCol('Left To Spend'),
  'Change From Orig': getCol('Change From Orig'),
  'Qty % Complete': getCol('Qty % Complete'),
  '$ % Complete': getCol('$ % Complete'),
  'Risk': getCol('Risk'),
  'Notes': getCol('Notes'),
} as const;

function cellRef(col: number, row: number): string {
  return `${colLetter(col)}${row}`;
}

export async function exportProjectionToVistaXLSX(
  items: ProjectionItem[],
  projectName: string,
  cycleLabel: string,
  _project?: ProjectionProject,
): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Superior Stratagraph';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Cost Report', {
    pageSetup: { fitToPage: true, fitToWidth: 1, paperSize: 9 },
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
  });

  // --- Title rows ---
  const titleRow = sheet.addRow([projectName, cycleLabel]);
  titleRow.font = { bold: true, size: 12 };
  titleRow.height = 20;
  sheet.mergeCells('A1:D1');

  const subtitleRow = sheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
  subtitleRow.font = { italic: true, size: 10, color: { argb: 'FF888888' } };
  sheet.mergeCells(`A2:D2`);

  // --- Headers row (row 3) ---
  const headerRow = sheet.addRow(HEADERS);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFD700' }, size: 9 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    } as any;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF9E9E9E' } },
      left: { style: 'thin', color: { argb: 'FF9E9E9E' } },
      bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
      right: { style: 'thin', color: { argb: 'FF9E9E9E' } },
    } as any;
  });

  const HEADER_ROW_NUM = 3;
  const DATA_START = HEADER_ROW_NUM + 1; // row 4
  const dataRowCount = items.length;
  const TOTALS_ROW = DATA_START + dataRowCount;

  // --- Helper: build a SUM formula for a column over the data rows ---
  const sumFormula = (col: number): string =>
    `SUM(${cellRef(col, DATA_START)}:${cellRef(col, TOTALS_ROW - 1)})`;

  // --- Data rows ---
  items.forEach((it, idx) => {
    const rowNum = DATA_START + idx;
    const isEven = idx % 2 === 0;

    const phase = it.keyParts[0] ?? '';
    const costType = it.keyParts[1] ?? '';
    const ctum = costType + (it.unitOfMeasure ? ' ' + it.unitOfMeasure : '');

    // CTC formulas: F - CTD
    const ctcQtyFormula = `=${cellRef(COL['F Qty'], rowNum)}-${cellRef(COL['CTD Qty'], rowNum)}`;
    const ctcHrsFormula = `=${cellRef(COL['F Hours'], rowNum)}-${cellRef(COL['CTD Hours'], rowNum)}`;
    const ctcCostFormula = `=${cellRef(COL['F Cost'], rowNum)}-${cellRef(COL['CTD Cost'], rowNum)}`;

    // Derived rate formulas
    const fUMFormula = `=IF(${cellRef(COL['F Hours'], rowNum)}>0,${cellRef(COL['F Qty'], rowNum)}/${cellRef(COL['F Hours'], rowNum)},0)`;
    const fMUFormula = `=IF(${cellRef(COL['F Qty'], rowNum)}>0,${cellRef(COL['F Hours'], rowNum)}/${cellRef(COL['F Qty'], rowNum)},0)`;
    const fUCFormula = `=IF(${cellRef(COL['F Qty'], rowNum)}>0,${cellRef(COL['F Cost'], rowNum)}/${cellRef(COL['F Qty'], rowNum)},0)`;

    const calcHrsFormula = `=IF(${cellRef(COL['CTD Cost'], rowNum)}>0,(${cellRef(COL['CTD Hours'], rowNum)}/${cellRef(COL['CTD Cost'], rowNum)})*${cellRef(COL['F Cost'], rowNum)},0)`;
    const compFormula = `=IF(${cellRef(COL['F Cost'], rowNum)}>0,${cellRef(COL['CTD Cost'], rowNum)}/${cellRef(COL['F Cost'], rowNum)},0)`;
    const estVarFormula = `=${cellRef(COL['OE Cost'], rowNum)}-${cellRef(COL['F Cost'], rowNum)}`;

    // Current Projection / Forecast = F Cost
    const currentProjFormula = `=${cellRef(COL['F Cost'], rowNum)}`;
    // Change From Prev = F Cost - Last Months Forecast
    const changeFromPrevFormula = `=${cellRef(COL['F Cost'], rowNum)}-${cellRef(COL['Last Months Forecast'], rowNum)}`;
    // Left To Spend = F Cost - CTD Cost
    const leftToSpendFormula = `=${cellRef(COL['F Cost'], rowNum)}-${cellRef(COL['CTD Cost'], rowNum)}`;
    // Change From Orig = F Cost - OE Cost
    const changeFromOrigFormula = `=${cellRef(COL['F Cost'], rowNum)}-${cellRef(COL['OE Cost'], rowNum)}`;
    // Qty % Complete
    const qtyPctFormula = `=IF(${cellRef(COL['F Qty'], rowNum)}>0,${cellRef(COL['CTD Qty'], rowNum)}/${cellRef(COL['F Qty'], rowNum)},0)`;
    // $ % Complete = comp
    const dollarPctFormula = compFormula;

    const ctpUMFormula = `=IF(${cellRef(COL['CTP Hours'], rowNum)}>0,${cellRef(COL['CTP Qty'], rowNum)}/${cellRef(COL['CTP Hours'], rowNum)},0)`;
    const ctpMUFormula = `=IF(${cellRef(COL['CTP Qty'], rowNum)}>0,${cellRef(COL['CTP Hours'], rowNum)}/${cellRef(COL['CTP Qty'], rowNum)},0)`;
    const ctpUCFormula = `=IF(${cellRef(COL['CTP Qty'], rowNum)}>0,${cellRef(COL['CTP Cost'], rowNum)}/${cellRef(COL['CTP Qty'], rowNum)},0)`;

    const ctdUMFormula = `=IF(${cellRef(COL['CTD Hours'], rowNum)}>0,${cellRef(COL['CTD Qty'], rowNum)}/${cellRef(COL['CTD Hours'], rowNum)},0)`;
    const ctdMUFormula = `=IF(${cellRef(COL['CTD Qty'], rowNum)}>0,${cellRef(COL['CTD Hours'], rowNum)}/${cellRef(COL['CTD Qty'], rowNum)},0)`;
    const ctdUCFormula = `=IF(${cellRef(COL['CTD Qty'], rowNum)}>0,${cellRef(COL['CTD Cost'], rowNum)}/${cellRef(COL['CTD Qty'], rowNum)},0)`;

    const ctcUMFormula = `=IF(${cellRef(COL['CTC Hours'], rowNum)}>0,${cellRef(COL['CTC Qty'], rowNum)}/${cellRef(COL['CTC Hours'], rowNum)},0)`;
    const ctcMUFormula = `=IF(${cellRef(COL['CTC Qty'], rowNum)}>0,${cellRef(COL['CTC Hours'], rowNum)}/${cellRef(COL['CTC Qty'], rowNum)},0)`;
    const ctcUCFormula = `=IF(${cellRef(COL['CTC Qty'], rowNum)}>0,${cellRef(COL['CTC Cost'], rowNum)}/${cellRef(COL['CTC Qty'], rowNum)},0)`;

    const oeUMFormula = `=IF(${cellRef(COL['OE Hours'], rowNum)}>0,${cellRef(COL['OE Qty'], rowNum)}/${cellRef(COL['OE Hours'], rowNum)},0)`;
    const oeMUFormula = `=IF(${cellRef(COL['OE Qty'], rowNum)}>0,${cellRef(COL['OE Hours'], rowNum)}/${cellRef(COL['OE Qty'], rowNum)},0)`;
    const oeUCFormula = `=IF(${cellRef(COL['OE Qty'], rowNum)}>0,${cellRef(COL['OE Cost'], rowNum)}/${cellRef(COL['OE Qty'], rowNum)},0)`;

    const rowData: (string | number | { formula: string })[] = [
      phase,                              // Phase
      it.label,                           // PhaseDescription
      ctum,                               // CostType UM
      it.CTP.qty,                         // CTP Qty
      it.CTP.hours,                       // CTP Hours
      { formula: ctpUMFormula },          // CTP U/M
      { formula: ctpMUFormula },          // CTP M/U
      { formula: ctpUCFormula },          // CTP UC
      it.CTP.cost,                        // CTP Cost
      it.CTD.qty,                         // CTD Qty
      it.CTD.hours,                       // CTD Hours
      { formula: ctdUMFormula },          // CTD U/M
      { formula: ctdMUFormula },          // CTD M/U
      { formula: ctdUCFormula },          // CTD UC
      it.CTD.cost,                        // CTD Cost
      { formula: ctcQtyFormula },         // CTC Qty
      { formula: ctcHrsFormula },         // CTC Hours
      { formula: ctcUMFormula },          // CTC U/M
      { formula: ctcMUFormula },          // CTC M/U
      { formula: ctcUCFormula },          // CTC UC
      { formula: ctcCostFormula },        // CTC Cost
      it.F.qty,                           // F Qty
      it.F.hours,                         // F Hours
      { formula: calcHrsFormula },        // Calc Hrs
      { formula: fUMFormula },            // F U/M
      { formula: fMUFormula },            // F M/U
      { formula: fUCFormula },            // F UC
      it.F.cost,                          // F Cost
      it.prevForecast,                    // Last Months Forecast
      it.Est.qty,                         // OE Qty
      it.Est.hours,                       // OE Hours
      { formula: oeUMFormula },           // OE U/M
      { formula: oeMUFormula },           // OE M/U
      { formula: oeUCFormula },           // OE UC
      it.Est.cost,                        // OE Cost
      { formula: estVarFormula },         // EstVar
      { formula: compFormula },           // Comp
      { formula: currentProjFormula },    // Current Projection / Forecast
      { formula: changeFromPrevFormula }, // Change From Prev
      { formula: leftToSpendFormula },    // Left To Spend
      { formula: changeFromOrigFormula }, // Change From Orig
      { formula: qtyPctFormula },         // Qty % Complete
      { formula: dollarPctFormula },      // $ % Complete
      it.wsRisk,                          // Risk
      '',                                 // Notes
    ];

    const excelRow = sheet.addRow(rowData);
    excelRow.height = 16;

    const bgColor = isEven ? 'FFFFFFFF' : 'FFF2F2F2';

    excelRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      } as any;
      cell.font = { size: 9 };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        left: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        right: { style: 'hair', color: { argb: 'FFD0D0D0' } },
      } as any;

      // Format numbers
      const header = HEADERS[colNum - 1];
      if (!header) return;

      if (header.includes('Cost') || header.includes('Forecast') || header.includes('Spend') || header.includes('Orig') || header.includes('Prev') || header === 'EstVar' || header === 'Risk') {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (header.includes('Qty') || header.includes('Hours') || header.includes('Hrs')) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (header === 'Comp' || header.includes('% Complete')) {
        cell.numFmt = '0.0%';
        cell.alignment = { horizontal: 'right' };
      } else if (header.includes('U/M') || header.includes('M/U') || header.includes('UC')) {
        cell.numFmt = '#,##0.0000';
        cell.alignment = { horizontal: 'right' };
      } else if (colNum <= 3) {
        cell.alignment = { horizontal: 'left' };
      }
    });
  });

  // --- TOTALS row ---
  const totalsRowData: (string | { formula: string })[] = HEADERS.map((h, i) => {
    const col = i + 1;
    if (col <= 3) return col === 1 ? 'TOTALS' : '';

    // Skip derived formula columns — sum the raw value columns instead
    const skipFormulas = new Set([
      'CTP U/M', 'CTP M/U', 'CTP UC',
      'CTD U/M', 'CTD M/U', 'CTD UC',
      'CTC Qty', 'CTC Hours', 'CTC U/M', 'CTC M/U', 'CTC UC', 'CTC Cost',
      'Calc Hrs', 'F U/M', 'F M/U', 'F UC',
      'OE U/M', 'OE M/U', 'OE UC',
      'EstVar', 'Comp',
      'Current Projection / Forecast', 'Change From Prev', 'Left To Spend', 'Change From Orig',
      'Qty % Complete', '$ % Complete', 'Risk', 'Notes',
    ]);

    if (skipFormulas.has(h)) return '';

    return { formula: sumFormula(col) };
  });

  const totalsRow = sheet.addRow(totalsRowData);
  totalsRow.height = 20;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    } as any;
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1F3864' } },
      bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
    } as any;

    const header = HEADERS[colNum - 1];
    if (!header) return;
    if (header.includes('Cost') || header.includes('Forecast') || header.includes('Qty') || header.includes('Hours') || header.includes('Hrs')) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
  });

  // --- Conditional formatting: variance columns ---
  const varCols: Array<keyof typeof COL> = ['EstVar', 'Change From Prev', 'Left To Spend', 'Change From Orig'];
  for (const colName of varCols) {
    const colIdx = COL[colName];
    if (!colIdx) continue;
    const col = colLetter(colIdx);
    const range = `${col}${DATA_START}:${col}${TOTALS_ROW - 1}`;

    sheet.addConditionalFormatting({
      ref: range,
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: ['0'],
          priority: 1,
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: 'FFFFC7CE' },
            } as any,
            font: { color: { argb: 'FF9C0006' } },
          },
        },
        {
          type: 'cellIs',
          operator: 'lessThan',
          formulae: ['0'],
          priority: 2,
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: 'FFC6EFCE' },
            } as any,
            font: { color: { argb: 'FF276221' } },
          },
        },
      ],
    });
  }

  // --- Column widths ---
  sheet.getColumn(1).width = 14; // Phase
  sheet.getColumn(2).width = 28; // PhaseDescription
  sheet.getColumn(3).width = 14; // CostType UM
  for (let c = 4; c <= HEADERS.length; c++) {
    const h = HEADERS[c - 1] ?? '';
    if (h === 'Notes') {
      sheet.getColumn(c).width = 20;
    } else if (h.includes('Description') || h.includes('Forecast') || h.includes('Projection')) {
      sheet.getColumn(c).width = 14;
    } else {
      sheet.getColumn(c).width = 11;
    }
  }

  // --- Write to Blob ---
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
