import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
} from '@repo/ui';
import { Check, X, AlertTriangle } from 'lucide-react';
import { useStore } from '~/lib/store';
import { uid } from '@repo/projections';
import type { Metric } from '@repo/projections';
import type { DetectionResult, DetectionSummary } from '@repo/projections';

interface MappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detection: DetectionSummary;
  onConfirm: (results: DetectionResult[]) => void;
  showOnlyNew?: boolean;
}

const SLICE_OPTIONS = ['CTP', 'CTD', 'CTC', 'F', 'Est'] as const;
const FIELD_OPTIONS = ['qty', 'hours', 'cost', 'uc', 'mpu', 'upm', 'service', 'costType', 'description', 'unitOfMeasure'] as const;

export function MappingDialog({
  open,
  onOpenChange,
  detection,
  onConfirm,
  showOnlyNew = false,
}: MappingDialogProps) {
  const catalog = useStore((s) => s.metricsCatalog);
  const addMetric = useStore((s) => s.addMetricToStore);
  const [results, setResults] = useState<DetectionResult[]>(detection.results);

  const visibleResults = showOnlyNew
    ? results.filter((r) => !r.matched)
    : results;

  const updateResult = (index: number, patch: Partial<DetectionResult>) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const handleConfirm = () => {
    for (const r of results) {
      if (!r.matched && !r.skipped && r.metricId) {
        const existingMetric = catalog.metrics.find((m) => m.id === r.metricId);
        if (!existingMetric) {
          addMetric({
            id: r.metricId,
            name: r.columnHeader,
            aliases: [],
            sliceGroup: r.sliceGroup,
            field: r.kind === 'formula' ? 'uc' : 'qty',
            kind: r.kind,
            formula: r.formulaGuess?.expression ?? null,
            formulaRefs: r.formulaGuess?.refs ?? [],
          });
        }
      }
    }
    onConfirm(results);
  };

  const handleSkipAll = () => {
    const updated = results.map((r) => (r.matched ? r : { ...r, skipped: true }));
    onConfirm(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Columns</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {detection.recognizedCount} columns recognized
            {detection.newCount > 0 && ` · ${detection.newCount} new columns to review`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Column</th>
                <th className="text-left py-2 font-medium w-24">Sample</th>
                <th className="text-left py-2 font-medium w-36">Detected As</th>
                <th className="text-left py-2 font-medium">Formula</th>
                <th className="text-left py-2 font-medium w-20">Slice</th>
                <th className="text-center py-2 font-medium w-16">Include</th>
              </tr>
            </thead>
            <tbody>
              {visibleResults.map((r) => {
                const globalIndex = results.indexOf(r);
                return (
                  <tr
                    key={r.columnIndex}
                    className={`border-b ${
                      r.skipped ? 'opacity-40' :
                      r.matched ? '' :
                      r.formulaGuess ? 'bg-amber-50 dark:bg-amber-950/20' :
                      'bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <td className="py-2 font-medium">{r.columnHeader}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground truncate max-w-24">
                      {r.sampleValue}
                    </td>
                    <td className="py-2">
                      {r.matched ? (
                        <Badge variant="outline" className="text-xs">
                          <Check className="size-3 mr-1" />
                          {r.metricId}
                        </Badge>
                      ) : (
                        <select
                          className="w-full rounded border px-2 py-1 text-xs"
                          value={r.metricId ?? '__new__'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__new__') {
                              const newId = `custom-${uid()}`;
                              updateResult(globalIndex, { metricId: newId });
                            } else {
                              const metric = catalog.metrics.find((m) => m.id === val);
                              if (metric) {
                                updateResult(globalIndex, {
                                  metricId: metric.id,
                                  sliceGroup: metric.sliceGroup,
                                  kind: metric.kind,
                                });
                              }
                            }
                          }}
                        >
                          <option value="__new__">— New metric —</option>
                          {catalog.metrics.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2">
                      {r.formulaGuess ? (
                        <code className="text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                          {r.formulaGuess.expression}
                        </code>
                      ) : r.matched ? (
                        <span className="text-muted-foreground text-xs">— raw data</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">— not recognized</span>
                      )}
                    </td>
                    <td className="py-2">
                      {r.sliceGroup ? (
                        <Badge variant="secondary" className="text-xs">{r.sliceGroup}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => updateResult(globalIndex, { skipped: !r.skipped })}
                        className={`rounded p-1 ${r.skipped ? 'text-muted-foreground' : 'text-green-600'}`}
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
          <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs">
            <AlertTriangle className="size-3.5 text-amber-600" />
            <span>Breakout structure detected (parent/child rows with suffix pattern)</span>
          </div>
        )}

        <DialogFooter>
          {detection.newCount > 0 && (
            <Button variant="ghost" onClick={handleSkipAll} className="mr-auto">
              Skip All New
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
