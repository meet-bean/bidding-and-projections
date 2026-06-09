'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  Input,
} from '@repo/ui';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { parseBatchUpload, detectColumns, parseWithMetrics } from '@repo/projections';
import type { BatchUploadResult } from '@repo/projections';
import { useStore } from '~/lib/store';
import * as XLSX from 'xlsx';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface ProjectionUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchImport: (result: BatchUploadResult) => void;
}

export function ProjectionUpload({
  open,
  onOpenChange,
  onBatchImport,
}: ProjectionUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<BatchUploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewCycles, setReviewCycles] = useState<BatchUploadResult['cycles']>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useStore((s) => s.metricsCatalog);

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    setFiles(arr);
    setLoading(true);

    try {
      // Try the batch parser first — it handles both PM worksheets (multi-tab)
      // and Vista dumps, with date detection from tab/file names.
      const result = await parseBatchUpload(arr, catalog);

      if (result.cycles.length > 0) {
        // NOTE: uploads never create columns. The projections table layout is
        // the Metrics catalog (which mirrors the forecast document); the only
        // values we pull from any file are metrics whose Type is `vista-upload`
        // (mapped via their vistaField inside parseSheet / resolveColumns).
        // To add a column, add a metric on the Metrics page — not via upload.
        setPreview(result);
        setReviewCycles(result.cycles);
        setLoading(false);
        return;
      }

      // If batch parser found nothing, try generic detection as fallback
      await tryGenericFallback(arr);
    } catch (e) {
      console.error('Parse failed', e);
      // Try generic fallback on error
      try {
        await tryGenericFallback(arr);
      } catch (e2) {
        console.error('Generic fallback also failed', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const tryGenericFallback = async (fileList: File[]) => {
    const file = fileList[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);

    const COST_TAB_RE = /^Cost\s+\d{2}-\d{2}\s*$/i;
    const costTabs = workbook.SheetNames.filter((n) => COST_TAB_RE.test(n));
    const dataSheetName = costTabs.length > 0 ? costTabs[0]! : workbook.SheetNames[0]!;
    const sheet = workbook.Sheets[dataSheetName]!;

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1, defval: null, blankrows: false,
    }) as unknown as unknown[][];

    const HEADER_MARKERS = ['phase', 'costtype', 'cost type', 'service', 'description', 'ctp qty', 'ctd qty', 'f qty', 'f cost'];
    let headerRow = rawRows.findIndex((r) =>
      r && r.some((c) => {
        const val = String(c ?? '').trim().toLowerCase();
        return HEADER_MARKERS.some((m) => val === m || val.includes(m));
      }),
    );
    if (headerRow === -1) headerRow = 0;

    const headerCells = (rawRows[headerRow] ?? []).map((c) => String(c ?? '').trim()).filter(Boolean);
    const jsonRows: Record<string, unknown>[] = [];
    for (let i = headerRow + 1; i < rawRows.length; i++) {
      const raw = rawRows[i];
      if (!raw) continue;
      const obj: Record<string, unknown> = {};
      for (let c = 0; c < headerCells.length; c++) obj[headerCells[c]!] = raw[c] ?? null;
      jsonRows.push(obj);
    }

    const detection = detectColumns(headerCells, jsonRows.slice(0, 20), catalog);

    // Uploads never create columns: unmatched headers are ignored, and only
    // values for existing catalog metrics are pulled in. New columns are added
    // by the user on the Metrics page, never auto-registered from a file.
    const fieldMap: Record<string, { group: string | null; field: string }> = {};
    for (const col of detection.results) {
      if (col.metricId && !col.skipped) {
        const metric = catalog.metrics.find((m) => m.id === col.metricId);
        if (metric) fieldMap[col.metricId] = { group: metric.group, field: metric.field };
      }
    }

    const parseResult = parseWithMetrics(jsonRows, detection.results, fieldMap, detection.structure);
    if (parseResult.items.length === 0) return;

    const batchResult: BatchUploadResult = {
      cycles: [{
        file: file.name,
        tab: null,
        type: 'vista-dump',
        detectedDate: null,
        label: `Upload ${new Date().toLocaleDateString()}`,
        rowCount: parseResult.items.length,
        items: parseResult.items,
        notes: {},
      }],
      financials: null,
      errors: parseResult.warnings.map((w) => ({ file: file.name, message: `Warning: ${w}` })),
    };

    setPreview(batchResult);
    setReviewCycles(batchResult.cycles);
  };

  /* ── Review logic ── */

  const updateCycleMonth = (idx: number, month: number) => {
    setReviewCycles((prev) => prev.map((c, i) => {
      if (i !== idx) return c;
      const year = c.detectedDate?.year ?? new Date().getFullYear();
      return {
        ...c,
        detectedDate: { month, year, iso: `${year}-${String(month).padStart(2, '0')}-01` },
        label: `${MONTHS[month - 1]} ${year} Projection`,
      };
    }));
  };

  const updateCycleYear = (idx: number, year: number) => {
    setReviewCycles((prev) => prev.map((c, i) => {
      if (i !== idx) return c;
      const month = c.detectedDate?.month ?? 1;
      return {
        ...c,
        detectedDate: { month, year, iso: `${year}-${String(month).padStart(2, '0')}-01` },
        label: `${MONTHS[month - 1]} ${year} Projection`,
      };
    }));
  };

  const handleReviewConfirm = () => {
    if (!preview) return;
    onBatchImport({ ...preview, cycles: reviewCycles });
    handleClose();
  };

  const handleClose = () => {
    setFiles([]);
    setPreview(null);
    setReviewCycles([]);
    setLoading(false);
    onOpenChange(false);
  };

  const allDated = reviewCycles.length > 0 && reviewCycles.every((c) => c.detectedDate?.month);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {preview ? 'Confirm Import' : 'Import Projection Data'}
          </DialogTitle>
          {preview && (
            <p className="text-sm text-muted-foreground">
              {reviewCycles.length} cycle{reviewCycles.length !== 1 ? 's' : ''} detected
              {preview.financials ? ' · Summary tab found' : ''}
              {' — confirm the dates before importing.'}
            </p>
          )}
        </DialogHeader>

        {/* Upload step */}
        {!preview && (
          <>
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Spreadsheet files (.xls, .xlsx, .csv)
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept=".xls,.xlsx,.csv"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {loading && (
              <p className="text-center text-sm text-muted-foreground py-2">Analyzing file...</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </DialogFooter>
          </>
        )}

        {/* Review step — confirm months */}
        {preview && (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto flex-1">
              {preview.errors.length > 0 && (
                <div className="space-y-1">
                  {preview.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="size-3 shrink-0" />
                      {err.file}: {err.message}
                    </div>
                  ))}
                </div>
              )}

              {preview.financials && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="size-3.5 shrink-0" />
                  Revenue/cost/profit data found — {preview.financials.months.length} months of history
                </div>
              )}

              {reviewCycles.map((cycle, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-success" />
                      <span className="text-sm font-medium truncate">{cycle.file}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{cycle.rowCount} items</Badge>
                  </div>

                  {cycle.tab && (
                    <p className="text-xs text-muted-foreground">Sheet: {cycle.tab}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Date:</span>
                    <select
                      className="rounded border border-border bg-background px-2 py-1 text-sm flex-1"
                      value={cycle.detectedDate?.month ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) updateCycleMonth(i, parseInt(val));
                      }}
                    >
                      <option value="">Pick month</option>
                      {MONTHS.map((m, mi) => (
                        <option key={mi} value={mi + 1}>{m}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      className="h-8 w-20 text-sm"
                      value={cycle.detectedDate?.year ?? new Date().getFullYear()}
                      min={2020}
                      max={2035}
                      onChange={(e) => updateCycleYear(i, parseInt(e.target.value) || new Date().getFullYear())}
                    />
                    {cycle.detectedDate && (
                      <Badge variant="outline" className="text-2xs shrink-0">auto-detected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleReviewConfirm} disabled={!allDated || reviewCycles.length === 0}>
                Import {reviewCycles.length} version{reviewCycles.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
