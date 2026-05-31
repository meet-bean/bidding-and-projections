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
import { Upload, AlertCircle, CheckCircle, Check, X, AlertTriangle, GripVertical } from 'lucide-react';
import { parseBatchUpload, detectColumns, parseWithMetrics, uid, findMetric } from '@repo/projections';
import type { ProjectionAdapter, BatchUploadResult, DetectionSummary, DetectionResult, Metric } from '@repo/projections';
import { useStore } from '~/lib/store';
import * as XLSX from 'xlsx';

function scoreSimilarity(header: string, metric: Metric): number {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = metric.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h === n) return 100;
  if (h.includes(n) || n.includes(h)) return 80;
  for (const alias of metric.aliases) {
    const a = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (h === a) return 95;
    if (h.includes(a) || a.includes(h)) return 75;
  }
  const hWords = header.toLowerCase().split(/\s+/);
  const nWords = metric.name.toLowerCase().split(/\s+/);
  const overlap = hWords.filter((w) => nWords.includes(w)).length;
  if (overlap > 0) return 30 + overlap * 20;
  return 0;
}

function MetricSelect({
  header,
  value,
  metrics,
  onChange,
}: {
  header: string;
  value: string | null;
  metrics: Metric[];
  onChange: (metricId: string, metric: Metric | null) => void;
}) {
  const ranked = metrics
    .map((m) => ({ metric: m, score: scoreSimilarity(header, m) }))
    .sort((a, b) => b.score - a.score);
  const suggested = ranked.filter((r) => r.score >= 30);
  const rest = ranked.filter((r) => r.score < 30);

  return (
    <select
      className="rounded border border-border bg-background px-2 py-1 text-xs max-w-56"
      value={value ?? '__new__'}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '__new__') {
          onChange(`custom-${uid()}`, null);
        } else {
          const metric = metrics.find((m) => m.id === val);
          onChange(val, metric ?? null);
        }
      }}
    >
      <option value="__new__">+ Create new metric</option>
      {suggested.length > 0 && (
        <optgroup label="Suggested">
          {suggested.map(({ metric: m }) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </optgroup>
      )}
      {rest.length > 0 && (
        <optgroup label={suggested.length > 0 ? 'All metrics' : 'Existing metrics'}>
          {rest.map(({ metric: m }) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

interface ProjectionUploadProps {
  adapter: ProjectionAdapter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchImport: (result: BatchUploadResult) => void;
}

type Step = 'upload' | 'mapper' | 'review';

export function ProjectionUpload({
  adapter: _adapter,
  open,
  onOpenChange,
  onBatchImport,
}: ProjectionUploadProps) {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<BatchUploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [detection, setDetection] = useState<DetectionSummary | null>(null);
  const [mappedResults, setMappedResults] = useState<DetectionResult[]>([]);
  const [reviewCycles, setReviewCycles] = useState<BatchUploadResult['cycles']>([]);
  const [rawSheetData, setRawSheetData] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useStore((s) => s.metricsCatalog);
  const addMetric = useStore((s) => s.addMetricToStore);
  const updateMetric = useStore((s) => s.updateMetricInStore);

  /* ── File handling ── */

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    setFiles(arr);
    setLoading(true);

    try {
      const file = arr[0]!;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);

      // Detect PM-worksheet format: tabs named "Cost 01-26", "Cost 02-26", etc.
      const COST_TAB_RE = /^Cost\s+\d{2}-\d{2}\s*$/i;
      const costTabs = workbook.SheetNames.filter((n) => COST_TAB_RE.test(n));

      let dataSheetName: string;

      if (costTabs.length > 0) {
        // PM worksheet — use first cost tab
        dataSheetName = costTabs[0]!;
      } else {
        // Single-sheet dump — first sheet
        dataSheetName = workbook.SheetNames[0]!;
      }

      const sheet = workbook.Sheets[dataSheetName]!;
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }) as unknown[][];

      // Find the header row by scanning for known column names
      const HEADER_MARKERS = ['phase', 'costtype', 'cost type', 'service', 'description', 'ctp qty', 'ctd qty', 'f qty', 'f cost'];
      let headerRow = rawRows.findIndex((r) =>
        r && r.some((c) => {
          const val = String(c ?? '').trim().toLowerCase();
          return HEADER_MARKERS.some((m) => val === m || val.includes(m));
        }),
      );
      if (headerRow === -1) headerRow = 0; // fallback to first row

      // Extract headers from the detected row
      const headerCells = (rawRows[headerRow] ?? []).map((c) => String(c ?? '').trim()).filter(Boolean);

      // Build keyed rows from data rows (after header)
      const jsonRows: Record<string, unknown>[] = [];
      for (let i = headerRow + 1; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (!raw) continue;
        const obj: Record<string, unknown> = {};
        for (let c = 0; c < headerCells.length; c++) {
          obj[headerCells[c]!] = raw[c] ?? null;
        }
        jsonRows.push(obj);
      }

      const headers = headerCells;
      const sampleRows = jsonRows.slice(0, 20);

      setRawSheetData({ headers, rows: jsonRows });

      const detectionResult = detectColumns(headers, sampleRows, catalog);
      setDetection(detectionResult);
      // Auto-assign metric IDs to unmatched columns so they get registered on confirm
      const resultsWithIds = detectionResult.results.map((r) =>
        !r.matched && !r.metricId
          ? { ...r, metricId: `col-${uid()}` }
          : r,
      );
      setMappedResults(resultsWithIds);

      if (detectionResult.newCount > 0) {
        setStep('mapper');
      } else {
        await runGenericParse(detectionResult.results, jsonRows, arr);
      }
    } catch (e) {
      console.error('Generic detection failed, falling back to Vista adapter', e);
      try {
        const result = await parseBatchUpload(arr);
        setPreview(result);
        setReviewCycles(result.cycles);
      } catch (e2) {
        console.error('Vista fallback also failed', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const runGenericParse = async (
    columns: DetectionResult[],
    rows: Record<string, unknown>[],
    originalFiles: File[],
  ) => {
    const fieldMap: Record<string, { group: string | null; field: string }> = {};
    for (const col of columns) {
      if (col.metricId && !col.skipped) {
        const metric = catalog.metrics.find((m) => m.id === col.metricId);
        if (metric) {
          fieldMap[col.metricId] = { group: metric.group, field: metric.field };
        }
      }
    }

    const structure = detection?.structure ?? 'flat';
    const parseResult = parseWithMetrics(rows, columns, fieldMap, structure);

    if (parseResult.items.length === 0) {
      console.warn('Generic parser produced 0 items, falling back to Vista adapter');
      const result = await parseBatchUpload(originalFiles);
      setPreview(result);
      setReviewCycles(result.cycles);
      return;
    }

    const batchResult: BatchUploadResult = {
      cycles: [{
        file: originalFiles[0]?.name ?? 'upload',
        tab: null,
        type: 'vista-dump',
        detectedDate: null,
        label: `Upload ${new Date().toLocaleDateString()}`,
        rowCount: parseResult.items.length,
        items: parseResult.items,
        notes: {},
      }],
      financials: null,
      errors: [],
    };

    if (parseResult.warnings.length > 0) {
      for (const w of parseResult.warnings) {
        batchResult.errors.push({ file: originalFiles[0]?.name ?? 'upload', message: `Warning: ${w}` });
      }
    }

    setPreview(batchResult);
    setReviewCycles(batchResult.cycles);
  };

  /* ── Mapper logic ── */

  const groups = catalog.groups;

  const showOnlyNew = detection ? detection.recognizedCount > 0 : false;
  const visibleResults = showOnlyNew
    ? mappedResults.filter((r) => !r.matched)
    : mappedResults;

  const updateResult = (globalIndex: number, patch: Partial<DetectionResult>) => {
    setMappedResults((prev) =>
      prev.map((r, i) => (i === globalIndex ? { ...r, ...patch } : r)),
    );
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (globalIndex: number) => (e: React.DragEvent) => {
    setDragIndex(globalIndex);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (globalIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(globalIndex);
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setMappedResults((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved!);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleMapperConfirm = async () => {
    for (const r of mappedResults) {
      if (r.skipped || !r.metricId) continue;
      const existingMetric = catalog.metrics.find((m) => m.id === r.metricId);
      if (existingMetric) {
        const headerNorm = r.columnHeader.toLowerCase().trim();
        const nameNorm = existingMetric.name.toLowerCase().trim();
        const alreadyKnown = nameNorm === headerNorm ||
          existingMetric.aliases.some((a) => a.toLowerCase().trim() === headerNorm);
        if (!alreadyKnown) {
          updateMetric(existingMetric.id, {
            aliases: [...existingMetric.aliases, r.columnHeader],
          });
        }
      } else if (!r.matched) {
        addMetric({
          id: r.metricId,
          name: r.columnHeader,
          aliases: [],
          group: r.group,
          field: r.type === 'formula' ? 'uc' : 'qty',
          type: r.type,
          formula: r.formulaGuess?.expression ?? null,
          formulaRefs: r.formulaGuess?.refs ?? [],
        });
      }
    }

    // Parse with confirmed mappings
    if (rawSheetData) {
      setLoading(true);
      try {
        await runGenericParse(mappedResults, rawSheetData.rows, files);
        setStep('review');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSkipAllNew = async () => {
    const updated = mappedResults.map((r) => (r.matched ? r : { ...r, skipped: true }));
    setMappedResults(updated);

    if (rawSheetData) {
      setLoading(true);
      try {
        await runGenericParse(updated, rawSheetData.rows, files);
        setStep('review');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSkipMapping = async () => {
    // Bypass generic detection entirely — use Vista adapter
    setLoading(true);
    try {
      const result = await parseBatchUpload(files);
      setPreview(result);
      setReviewCycles(result.cycles);
      setStep('review');
    } catch (e) {
      console.error('Vista parse failed', e);
    } finally {
      setLoading(false);
    }
  };

  /* ── Review logic ── */

  const updateCycleLabel = (idx: number, label: string) => {
    setReviewCycles((prev) => prev.map((c, i) => (i === idx ? { ...c, label } : c)));
  };

  const handleReviewConfirm = () => {
    if (!preview) return;
    onBatchImport({ ...preview, cycles: reviewCycles });
    handleClose();
  };

  /* ── Close / reset ── */

  const handleClose = () => {
    setStep('upload');
    setFiles([]);
    setPreview(null);
    setDetection(null);
    setMappedResults([]);
    setReviewCycles([]);
    setRawSheetData(null);
    setLoading(false);
    onOpenChange(false);
  };

  /* ── Derived ── */

  const dialogSize = step === 'mapper' ? 'w-fit max-w-[95vw] sm:max-w-[95vw]' : 'sm:max-w-lg';
  const title =
    step === 'upload' ? 'Import Projection Data' :
    step === 'mapper' ? 'Map Columns' :
    'Review Import';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className={`${dialogSize} max-h-[85vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {step === 'mapper' && detection && (
            <p className="text-sm text-muted-foreground">
              {detection.recognizedCount} columns recognized
              {detection.newCount > 0 && ` · ${detection.newCount} new columns to review`}
            </p>
          )}
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
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

            {preview && !loading && (
              <div className="space-y-2">
                {preview.errors.length > 0 && (
                  <div className="space-y-1">
                    {preview.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
                      >
                        <AlertCircle className="size-3 shrink-0" />
                        <span>{err.file}: {err.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                {preview.cycles.map((cycle, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-success" />
                      <div>
                        <p className="text-sm font-medium">{cycle.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {cycle.file} · {cycle.rowCount} items
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep('review')} disabled={!preview?.cycles.length}>
                Import{' '}
                {preview?.cycles.length
                  ? `${preview.cycles.length} version${preview.cycles.length !== 1 ? 's' : ''}`
                  : ''}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step: Mapper ── */}
        {step === 'mapper' && detection && (
          <>
            <div className="flex-1 overflow-auto -mx-6 px-6">
              <table className="text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium whitespace-nowrap w-8"></th>
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap">Column</th>
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap">Sample</th>
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap">Detected As</th>
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap min-w-48">Formula</th>
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap">Group</th>
                    <th className="text-center py-2 font-medium whitespace-nowrap">Include</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResults.map((r) => {
                    const globalIndex = mappedResults.indexOf(r);
                    const isDragging = dragIndex === globalIndex;
                    const isOver = dragOverIndex === globalIndex && dragIndex !== globalIndex;
                    return (
                      <tr
                        key={r.columnIndex}
                        draggable
                        onDragStart={handleDragStart(globalIndex)}
                        onDragOver={handleDragOver(globalIndex)}
                        onDrop={handleDrop(globalIndex)}
                        onDragEnd={handleDragEnd}
                        className={`border-b transition-colors ${
                          isDragging ? 'opacity-30' :
                          isOver ? 'border-t-2 border-t-primary border-b-border' :
                          'border-border'
                        } ${
                          r.skipped ? 'opacity-40' :
                          r.matched ? 'hover:bg-muted/40' :
                          r.formulaGuess ? 'bg-warning/5 hover:bg-warning/10' :
                          'bg-destructive/5 hover:bg-destructive/10'
                        }`}
                      >
                        {/* Drag handle */}
                        <td className="py-2 pr-3 whitespace-nowrap cursor-grab active:cursor-grabbing">
                          <GripVertical className="size-4 text-muted-foreground" />
                        </td>

                        <td className="py-2 pr-4 font-medium whitespace-nowrap">{r.columnHeader}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap max-w-40 truncate">
                          {r.sampleValue}
                        </td>

                        {/* Detected As */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {r.matched ? (() => {
                            const matchedMetric = catalog.metrics.find((m) => m.id === r.metricId);
                            return (
                              <Badge variant="outline" className="text-xs text-success border-success/30">
                                <Check className="size-3 mr-1" />
                                {matchedMetric?.name ?? r.metricId}
                              </Badge>
                            );
                          })() : (
                            <MetricSelect
                              header={r.columnHeader}
                              value={r.metricId}
                              metrics={catalog.metrics}
                              onChange={(metricId, metric) => {
                                if (metric) {
                                  updateResult(globalIndex, {
                                    metricId: metric.id,
                                    group: metric.group,
                                    type: metric.type,
                                  });
                                } else {
                                  updateResult(globalIndex, { metricId });
                                }
                              }}
                            />
                          )}
                        </td>

                        {/* Formula */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {r.formulaGuess ? (
                            <input
                              type="text"
                              className="min-w-48 rounded border border-warning/40 bg-warning/5 px-2 py-0.5 font-mono text-xs"
                              value={r.formulaGuess.expression}
                              onChange={(e) => {
                                updateResult(globalIndex, {
                                  formulaGuess: { ...r.formulaGuess!, expression: e.target.value },
                                });
                              }}
                            />
                          ) : r.matched ? (
                            <span className="text-muted-foreground text-xs">— raw data</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">— not recognized</span>
                          )}
                        </td>

                        {/* Group selector */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <select
                            className="rounded border border-border bg-background px-2 py-1 text-xs"
                            value={r.group ?? ''}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              updateResult(globalIndex, { group: val as DetectionResult['group'] });
                            }}
                          >
                            <option value="">— None —</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Include toggle */}
                        <td className="py-2 text-center">
                          <button
                            onClick={() => updateResult(globalIndex, { skipped: !r.skipped })}
                            className={`rounded p-1 transition-colors ${r.skipped ? 'text-muted-foreground hover:text-foreground' : 'text-success hover:text-success/80'}`}
                          >
                            {r.skipped ? <X className="size-4" /> : <Check className="size-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {detection.structure === 'breakout' && (
              <div className="flex items-center gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs">
                <AlertTriangle className="size-3.5 text-warning" />
                <span className="text-warning">Breakout structure detected (parent/child rows with suffix pattern)</span>
              </div>
            )}

            {loading && (
              <p className="text-center text-sm text-muted-foreground py-2">Parsing data...</p>
            )}

            <DialogFooter>
              <div className="mr-auto flex gap-2">
                <Button variant="ghost" onClick={handleSkipMapping} disabled={loading}>
                  Skip Mapping
                </Button>
                {detection.newCount > 0 && (
                  <Button variant="ghost" onClick={handleSkipAllNew} disabled={loading}>
                    Skip All New
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button onClick={handleMapperConfirm} disabled={loading}>
                Confirm & Import
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step: Review ── */}
        {step === 'review' && preview && (
          <>
            <p className="text-sm text-muted-foreground">
              {reviewCycles.length} cycle{reviewCycles.length !== 1 ? 's' : ''} detected. Review and adjust labels before importing.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto">
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
              {reviewCycles.map((cycle, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-success" />
                      <span className="text-sm font-medium">{cycle.file}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{cycle.rowCount} items</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Label:</span>
                    <Input
                      className="h-7 text-sm"
                      value={cycle.label}
                      onChange={(e) => updateCycleLabel(i, e.target.value)}
                    />
                  </div>
                  {cycle.detectedDate && (
                    <p className="text-xs text-muted-foreground">
                      Auto-detected date: {cycle.detectedDate.iso}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleReviewConfirm} disabled={reviewCycles.length === 0}>
                Import {reviewCycles.length} version{reviewCycles.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
