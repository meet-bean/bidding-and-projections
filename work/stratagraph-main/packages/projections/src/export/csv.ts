import type { ProjectionItem } from '../types';

const csvField = (v: unknown): string => {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function exportProjectionToCSV(items: ProjectionItem[], filename = 'vista_import_ready.csv'): void {
  const headers = [
    'Phase', 'PhaseDescription', 'CostType', 'UM',
    'F Qty', 'F Hours', 'F U/M', 'F M/U', 'F UC', 'F Cost', 'Notes',
  ];
  const lines = [headers.join(',')];
  for (const it of items) {
    lines.push([
      csvField(it.keyParts[0]?.trim()),
      csvField(it.label),
      csvField(it.keyParts[1]),
      csvField(it.unitOfMeasure),
      csvField(it.F.qty),
      csvField(it.F.hours),
      csvField(it.F.upm),
      csvField(it.F.mpu),
      csvField(it.F.uc),
      csvField(it.F.cost),
      csvField(''),
    ].join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
