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
} from '@repo/ui';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { parseBatchUpload, detectColumns, parseWithMetrics } from '@repo/projections';
import type { ProjectionAdapter, BatchUploadResult, DetectionSummary, DetectionResult } from '@repo/projections';
import { useStore } from '~/lib/store';
import { MappingDialog } from './mapping-dialog';
import { ProjectionImportReview } from './projection-import-review';
import * as XLSX from 'xlsx';

interface ProjectionUploadProps {
  adapter: ProjectionAdapter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchImport: (result: BatchUploadResult) => void;
}

export function ProjectionUpload({
  adapter: _adapter,
  open,
  onOpenChange,
  onBatchImport,
}: ProjectionUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<BatchUploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [detection, setDetection] = useState<DetectionSummary | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rawSheetData, setRawSheetData] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useStore((s) => s.metricsCatalog);

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    setFiles(arr);
    setLoading(true);

    try {
      const file = arr[0]!;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0]!;
      const sheet = workbook.Sheets[sheetName]!;
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]!) : [];
      const sampleRows = jsonRows.slice(0, 20);

      setRawSheetData({ headers, rows: jsonRows });

      const detectionResult = detectColumns(headers, sampleRows, catalog);
      setDetection(detectionResult);

      if (detectionResult.newCount > 0) {
        setShowMapper(true);
      } else {
        await runGenericParse(detectionResult.results, jsonRows, arr);
      }
    } catch (e) {
      console.error('Generic detection failed, falling back to Vista adapter', e);
      try {
        const result = await parseBatchUpload(arr);
        setPreview(result);
      } catch (e2) {
        console.error('Vista fallback also failed', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const runGenericParse = async (
    mappedColumns: DetectionResult[],
    rows: Record<string, unknown>[],
    originalFiles: File[],
  ) => {
    const fieldMap: Record<string, { sliceGroup: string | null; field: string }> = {};
    for (const col of mappedColumns) {
      if (col.metricId && !col.skipped) {
        const metric = catalog.metrics.find((m) => m.id === col.metricId);
        if (metric) {
          fieldMap[col.metricId] = { sliceGroup: metric.sliceGroup, field: metric.field };
        }
      }
    }

    const structure = detection?.structure ?? 'flat';
    const parseResult = parseWithMetrics(rows, mappedColumns, fieldMap, structure);

    if (parseResult.items.length === 0) {
      console.warn('Generic parser produced 0 items, falling back to Vista adapter');
      const result = await parseBatchUpload(originalFiles);
      setPreview(result);
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
  };

  const handleMapperConfirm = async (mappedResults: DetectionResult[]) => {
    setShowMapper(false);
    if (rawSheetData) {
      await runGenericParse(mappedResults, rawSheetData.rows, files);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    setShowReview(true);
  };

  const handleReviewConfirm = (result: BatchUploadResult) => {
    onBatchImport(result);
    setShowReview(false);
    handleClose();
  };

  const handleClose = () => {
    setFiles([]);
    setPreview(null);
    setDetection(null);
    setShowMapper(false);
    setShowReview(false);
    setRawSheetData(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showMapper} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Projection Data</DialogTitle>
          </DialogHeader>

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
                      <span>
                        {err.file}: {err.message}
                      </span>
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
                  <Badge variant="secondary" className="text-xs">
                    Auto-detected
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!preview?.cycles.length}>
              Import{' '}
              {preview?.cycles.length
                ? `${preview.cycles.length} version${preview.cycles.length !== 1 ? 's' : ''}`
                : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showMapper && detection && (
        <MappingDialog
          open={showMapper}
          onOpenChange={(o) => {
            if (!o) {
              setShowMapper(false);
              setLoading(false);
            }
          }}
          detection={detection}
          onConfirm={handleMapperConfirm}
          showOnlyNew={detection.recognizedCount > 0}
        />
      )}

      {showReview && preview && (
        <ProjectionImportReview
          open={showReview}
          preview={preview}
          onConfirm={handleReviewConfirm}
          onCancel={() => setShowReview(false)}
        />
      )}
    </>
  );
}
