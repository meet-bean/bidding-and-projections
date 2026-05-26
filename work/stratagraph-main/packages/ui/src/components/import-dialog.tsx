/**
 * ImportDialog component for CSV file import with preview and validation.
 *
 * @see Issue #246: P17-022: Implement CSV Import Dialog with Preview
 *
 * Features:
 * - Shows expected CSV template format
 * - File upload with drag-and-drop support
 * - Flexible CSV parsing (handles column reordering)
 * - Preview with validation error highlighting
 * - Bulk row deletion via FloatingToolbar
 * - Submit button state based on validation
 * - DataGrid preview with checkbox selection (shift+click range selection)
 */

'use client';

import * as React from 'react';
import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from 'react';
import {
  UploadIcon,
  TrashIcon,
  Loader2Icon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import {
  DataGridTableBase,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableBody,
  DataGridTableBodyRowCell,
} from '@/components/ui/data-grid-table';
import { FloatingToolbar } from '@/components/ui/floating-toolbar';
import { useShiftSelection } from '@/hooks/use-shift-selection';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';

/**
 * Column definition for import
 */
export interface ImportColumn {
  /** Unique key for the column */
  key: string;
  /** Display label for the column */
  label: string;
  /** Whether this column is required */
  required: boolean;
  /** Custom validation function. Optionally receives the full row data for cross-field checks. */
  validate?: (value: string, rowData?: Record<string, string>) => string | null;
  /** Custom cell renderer for entity-aware display (e.g. role badges, site badges) */
  renderCell?: (value: string, row: ParsedRow) => React.ReactNode;
  /** Whether the cell is editable (double-click to edit) */
  editable?: boolean;
  /** Per-row editability check. When provided, overrides `editable` for specific rows. */
  isEditable?: (value: string, row: ParsedRow) => boolean;
  /**
   * Custom editor renderer for entity-aware editing (e.g. role select, site picker).
   * When provided, this replaces the default text Input when editing a cell.
   * Must call onCommit with the new value to save, or onCancel to discard.
   */
  renderEditor?: (
    value: string,
    onCommit: (newValue: string) => void,
    onCancel: () => void
  ) => React.ReactNode;
  /**
   * Transform a raw CSV string into a resolved value at parse time.
   * Called once during CSV parsing. Case-insensitive matching should
   * be handled inside this function.
   * Returns the resolved value string (e.g., site ID, role enum value)
   * or the original string if no match (so validate can flag it).
   */
  transform?: (rawValue: string, rowData?: Record<string, string>) => string;
}

/**
 * Error on a parsed row
 */
export interface RowError {
  column: string;
  message: string;
}

/**
 * Parsed row with data and validation errors
 */
export interface ParsedRow {
  id: string;
  data: Record<string, string>;
  errors: RowError[];
}

/**
 * Result of parsing a CSV file
 */
export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
}

/**
 * Result of a conflict dry-run check
 */
export interface ConflictResult {
  /** Total rows with conflicts */
  conflictCount: number;
  /** Per-row results from dry-run */
  results: Array<{
    status: 'valid' | 'invalid' | 'conflict';
    [key: string]: unknown;
  }>;
}

/**
 * Props for the ImportDialog component
 */
export interface ImportDialogProps {
  /** Dialog title */
  title: string;
  /** Description shown in the dialog */
  description?: string;
  /** Column definitions for the import */
  columns: ImportColumn[];
  /** Callback when import is submitted with valid data */
  onImport: (
    data: Record<string, string>[],
    options?: { conflictStrategy?: 'skip' | 'overwrite' }
  ) => Promise<void>;
  /** Callback when import succeeds. May be async — dialog waits for it before closing. */
  onSuccess?: () => Promise<void> | void;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Custom trigger button label */
  triggerLabel?: string;
  /** Callback to check for conflicts via dry-run. When provided, enables conflict detection flow. */
  onCheckConflicts?: (data: Record<string, string>[]) => Promise<ConflictResult>;
  /**
   * Render prop that provides a bulk edit dialog for selected rows.
   * When provided, a "Bulk Edit..." button appears in the FloatingToolbar.
   * @param selectedRows The currently selected ParsedRow objects
   * @param onSave Callback to apply column updates to all selected rows
   * @param onClose Callback to close the dialog without saving
   */
  renderBulkEditDialog?: (
    selectedRows: ParsedRow[],
    onSave: (updates: Record<string, string>) => void,
    onClose: () => void
  ) => React.ReactNode;
}

/**
 * Parse a CSV string into rows with validation
 */
export function parseCSV(csv: string, columns: ImportColumn[]): ParseResult {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { rows: [], headers: [] };
  }

  // Parse header row
  const firstLine = lines[0];
  if (!firstLine) {
    return { rows: [], headers: [] };
  }
  const headers = parseCSVLine(firstLine).map((h) => h.toLowerCase().trim());

  // Build column index map
  const columnIndexMap: Record<string, number> = {};
  columns.forEach((col) => {
    const index = headers.findIndex(
      (h) => h === col.key.toLowerCase() || h === col.label.toLowerCase()
    );
    if (index !== -1) {
      columnIndexMap[col.key] = index;
    }
  });

  // Parse data rows
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = parseCSVLine(line);
    const data: Record<string, string> = {};
    const errors: RowError[] = [];

    columns.forEach((col) => {
      const index = columnIndexMap[col.key];
      const rawValue = index !== undefined && index < values.length ? values[index] : undefined;
      const value = rawValue?.trim() ?? '';
      const transformed = col.transform ? col.transform(value, data) : value;
      data[col.key] = transformed;

      // Validate required fields
      if (col.required && !transformed) {
        errors.push({
          column: col.key,
          message: `${col.label} is required`,
        });
      }

      // Custom validation (runs even on empty values for cross-field checks)
      if (col.validate) {
        const error = col.validate(transformed, data);
        if (error) {
          errors.push({
            column: col.key,
            message: error,
          });
        }
      }
    });

    rows.push({
      id: `row-${i}`,
      data,
      errors,
    });
  }

  return { rows, headers };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Validate a single row's data against column rules.
 * Returns an array of RowError objects (empty array means valid).
 */
function validateRow(data: Record<string, string>, columns: ImportColumn[]): RowError[] {
  const errors: RowError[] = [];
  columns.forEach((col) => {
    const value = (data[col.key] ?? '').trim();
    if (col.required && !value) {
      errors.push({ column: col.key, message: `${col.label} is required` });
    }
    if (col.validate) {
      const error = col.validate(value, data);
      if (error) errors.push({ column: col.key, message: error });
    }
  });
  return errors;
}

/**
 * Props for the ImportPreviewGrid sub-component
 */
interface ImportPreviewGridProps {
  rows: ParsedRow[];
  columns: ImportColumn[];
  /** Incremented on structural dataset changes (file upload, row deletion) but not cell edits. */
  datasetVersion: number;
  onDeleteRows: (indices: number[]) => void;
  onEditCell?: (rowId: string, columnKey: string, value: string) => void;
  onBulkEdit?: (selectedIds: Set<string>, updates: Record<string, string>) => void;
  renderBulkEditDialog?: (
    selectedRows: ParsedRow[],
    onSave: (updates: Record<string, string>) => void,
    onClose: () => void
  ) => React.ReactNode;
}

// Column helper instance (stable, outside component to avoid recreation)
const columnHelper = createColumnHelper<ParsedRow>();

/**
 * DataGrid-based preview table for the import dialog.
 *
 * Renders parsed CSV rows with:
 * - Validation status bar (valid/invalid counts + toggle for invalid-only view)
 * - Checkbox selection column (with shift+click range selection)
 * - Data columns (with validation error highlighting)
 * - FloatingToolbar for bulk delete of selected rows
 */
function ImportPreviewGrid({
  rows,
  columns,
  datasetVersion,
  onDeleteRows,
  onEditCell,
  onBulkEdit,
  renderBulkEditDialog,
}: ImportPreviewGridProps) {
  // Filter state – local to this sub-component
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  // Bulk edit dialog open state
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Inline editing state (C2)
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);

  // Counts always derived from all rows (not filtered)
  const validCount = useMemo(() => rows.filter((r) => r.errors.length === 0).length, [rows]);
  const invalidCount = useMemo(() => rows.filter((r) => r.errors.length > 0).length, [rows]);

  // Rows visible in the grid (may be filtered)
  const filteredRows = useMemo(() => {
    if (filterMode === 'valid') return rows.filter((r) => r.errors.length === 0);
    if (filterMode === 'invalid') return rows.filter((r) => r.errors.length > 0);
    return rows;
  }, [rows, filterMode]);

  // Pagination state
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  // Reset to page 1 when filter or dataset changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, datasetVersion]);

  // Clamp currentPage when the filtered row count shrinks (e.g., after deleting rows or
  // switching filter modes mid-page).
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  // Paginated rows for the table
  const displayedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  // Row selection state — owned locally, passed to useShiftSelection as controlled input
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Ordered list of displayed row IDs for shift+click range selection
  const displayedRowIds = useMemo(() => displayedRows.map((r) => r.id), [displayedRows]);

  // useShiftSelection provides handleRowClick for shift+click range selection
  const { handleRowClick, clearSelection } = useShiftSelection({
    rowSelection,
    onRowSelectionChange: setRowSelection,
    rowIds: displayedRowIds,
  });

  // "Select all" state derived from rowSelection
  const allSelected = displayedRows.length > 0 && displayedRows.every((r) => rowSelection[r.id]);
  const someSelected = !allSelected && displayedRows.some((r) => rowSelection[r.id]);

  // Clear selection when the dataset structurally changes (new CSV upload, row deletion)
  // or when the filter mode changes (to avoid invisible selected rows).
  useEffect(() => {
    clearSelection();
    setBulkEditOpen(false);
  }, [datasetVersion, filterMode, clearSelection]);

  // Count of selected rows for FloatingToolbar — scoped to current rows
  const selectedCount = useMemo(
    () => rows.filter((r) => rowSelection[r.id]).length,
    [rows, rowSelection]
  );

  // Build TanStack Table column definitions
  const tableColumns = useMemo<ColumnDef<ParsedRow, unknown>[]>(() => {
    const selectionCol = columnHelper.display({
      id: 'select',
      size: 40,
      header: () => null, // rendered manually below
      cell: () => null, // rendered manually below
    });

    const dataCols: ColumnDef<ParsedRow, unknown>[] = columns.map((col) => ({
      id: col.key,
      accessorFn: (row: ParsedRow): unknown => row.data[col.key] ?? '',
      header: () => null, // rendered manually
      cell: () => null, // rendered manually
    }));

    return [selectionCol, ...dataCols];
  }, [columns]);

  const table = useReactTable<ParsedRow>({
    data: displayedRows,
    columns: tableColumns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    state: { rowSelection },
    // onRowSelectionChange is a no-op: useShiftSelection owns the selection state.
    // Individual row checkboxes call handleRowClick; select-all calls handleSelectAll.
    onRowSelectionChange: () => undefined,
  });

  // Handle "select all" toggle — compute full state directly
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const next = { ...rowSelection };
        for (const row of displayedRows) {
          next[row.id] = true;
        }
        setRowSelection(next);
      } else {
        const next = { ...rowSelection };
        for (const row of displayedRows) {
          delete next[row.id];
        }
        setRowSelection(next);
      }
    },
    [displayedRows, rowSelection]
  );

  // Build the header column labels for rendering
  const headerGroups = table.getHeaderGroups();

  // Map from row ID → index in the full (unfiltered) rows array, for stable index references
  const rowIdToFullIndex = useMemo(() => new Map(rows.map((r, i) => [r.id, i])), [rows]);

  // Handle bulk delete of selected rows
  const handleDeleteSelected = useCallback(() => {
    const selectedIndices = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((id) => rowIdToFullIndex.get(id))
      .filter((idx): idx is number => idx !== undefined)
      .sort((a, b) => b - a); // sort descending for safe deletion
    onDeleteRows(selectedIndices);
    clearSelection();
  }, [rowSelection, rowIdToFullIndex, onDeleteRows, clearSelection]);

  // Selected rows (for bulk edit dialog) – derived from the full (unfiltered)
  // rows array so the dialog always reflects every selected row, even when the
  // "Show invalid only" filter hides some of them.
  const selectedRows = useMemo(() => rows.filter((r) => rowSelection[r.id]), [rows, rowSelection]);

  // Handle save from the bulk edit dialog – applies updates to all selected rows
  const handleBulkEditSave = useCallback(
    (updates: Record<string, string>) => {
      const selectedIds = new Set(selectedRows.map((r) => r.id));
      onBulkEdit?.(selectedIds, updates);
      setBulkEditOpen(false);
      clearSelection();
    },
    [selectedRows, onBulkEdit, clearSelection]
  );

  return (
    <div data-slot="import-preview-grid" className="space-y-2">
      {/* Validation status bar */}
      <div data-testid="validation-status-bar" className="flex items-center gap-3 text-sm">
        <span>
          <span data-testid="valid-count" className="text-foreground font-medium">
            {validCount}
          </span>{' '}
          <span className="text-muted-foreground">valid</span>
        </span>
        <span className="text-muted-foreground">/</span>
        <span>
          <span
            data-testid="invalid-count"
            className={cn('font-medium', invalidCount > 0 ? 'text-destructive' : 'text-foreground')}
          >
            {invalidCount}
          </span>{' '}
          <span className="text-muted-foreground">invalid</span>
        </span>
        <ButtonGroup data-testid="filter-button-group" className="ml-auto">
          <Button
            data-testid="filter-all"
            variant={filterMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('all')}
            aria-pressed={filterMode === 'all'}
          >
            All
          </Button>
          <Button
            data-testid="filter-valid"
            variant={filterMode === 'valid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('valid')}
            aria-pressed={filterMode === 'valid'}
          >
            Valid
          </Button>
          <Button
            data-testid="filter-invalid"
            variant={filterMode === 'invalid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('invalid')}
            aria-pressed={filterMode === 'invalid'}
          >
            Invalid
          </Button>
        </ButtonGroup>
      </div>

      <DataGrid
        table={table}
        recordCount={displayedRows.length}
        tableLayout={{ rowBorder: true, headerBorder: true, headerBackground: true, width: 'auto' }}
      >
        <DataGridContainer
          onMouseDown={(e) => {
            if (e.shiftKey) e.preventDefault();
          }}
        >
          <DataGridTableBase>
            <DataGridTableHead>
              {headerGroups.map((headerGroup) => (
                <DataGridTableHeadRow headerGroup={headerGroup} key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const colId = header.column.id;

                    if (colId === 'select') {
                      return (
                        <DataGridTableHeadRowCell header={header} key={header.id}>
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            disabled={displayedRows.length === 0}
                            onCheckedChange={(value) => handleSelectAll(!!value)}
                            aria-label="Select all"
                            className="align-[inherit]"
                          />
                        </DataGridTableHeadRowCell>
                      );
                    }

                    // Data columns
                    const importCol = columns.find((c) => c.key === colId);
                    if (!importCol) return null;

                    return (
                      <DataGridTableHeadRowCell header={header} key={header.id}>
                        {importCol.label}
                        {importCol.required && <span className="text-destructive ml-1">*</span>}
                      </DataGridTableHeadRowCell>
                    );
                  })}
                </DataGridTableHeadRow>
              ))}
            </DataGridTableHead>

            <DataGridTableBody>
              {table.getRowModel().rows.map((row: Row<ParsedRow>) => {
                const parsedRow = row.original;
                // Use the index in the full (unfiltered) rows array for all parent callbacks
                const fullRowIndex = rowIdToFullIndex.get(row.id) ?? 0;
                const rowHasErrors = parsedRow.errors.length > 0;
                const isSelected = Boolean(rowSelection[row.id]);

                return (
                  <Fragment key={row.id}>
                    <tr
                      data-testid={`import-row-${fullRowIndex}`}
                      data-has-errors={rowHasErrors ? 'true' : undefined}
                      data-state={isSelected ? 'selected' : undefined}
                      className={cn(
                        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
                        'border-border border-b [&:not(:last-child)>td]:border-b',
                        '[&_>:first-child]:relative',
                        rowHasErrors && 'bg-destructive/10'
                      )}
                      onClick={(e) => {
                        // Shift+click on any part of the row triggers range selection.
                        // Regular clicks are handled by the checkbox only (to avoid
                        // interfering with double-click-to-edit on data cells).
                        // Skip if the click originated from the checkbox — the checkbox
                        // onClick handler will fire separately and we'd double-fire.
                        if (
                          e.shiftKey &&
                          !(e.target as HTMLElement).closest('input[type="checkbox"]')
                        ) {
                          handleRowClick(row.id, e);
                        }
                      }}
                    >
                      {/* Checkbox cell */}
                      {(() => {
                        const selectCell = row
                          .getVisibleCells()
                          .find((c) => c.column.id === 'select');
                        if (!selectCell) return null;
                        return (
                          <DataGridTableBodyRowCell cell={selectCell}>
                            <div
                              className={cn(
                                'bg-primary absolute bottom-0 start-0 top-0 hidden w-[2px]',
                                isSelected && 'block'
                              )}
                            />
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={undefined}
                              onClick={(e) => handleRowClick(row.id, e)}
                              aria-label={`Select row ${fullRowIndex + 1}`}
                              className="align-[inherit]"
                            />
                          </DataGridTableBodyRowCell>
                        );
                      })()}

                      {/* Data cells */}
                      {columns.map((col) => {
                        const cellError = parsedRow.errors.find((e) => e.column === col.key);
                        const cell = row.getVisibleCells().find((c) => c.column.id === col.key);
                        if (!cell) return null;

                        const cellValue = parsedRow.data[col.key] ?? '';
                        const isEditing =
                          editingCell?.rowId === row.id && editingCell?.columnKey === col.key;
                        const cellEditable =
                          col.editable &&
                          onEditCell &&
                          (!col.isEditable || col.isEditable(cellValue, parsedRow));

                        return (
                          <DataGridTableBodyRowCell cell={cell} key={col.key}>
                            {isEditing && onEditCell ? (
                              col.renderEditor ? (
                                col.renderEditor(
                                  cellValue,
                                  (newValue: string) => {
                                    onEditCell(row.id, col.key, newValue);
                                    setEditingCell(null);
                                  },
                                  () => setEditingCell(null)
                                )
                              ) : (
                                <Input
                                  ref={editInputRef}
                                  defaultValue={cellValue}
                                  autoFocus
                                  aria-label={`Edit ${col.label}`}
                                  className="h-7 text-sm"
                                  onBlur={(e) => {
                                    if (!cancelEditRef.current) {
                                      onEditCell(row.id, col.key, e.target.value);
                                    }
                                    cancelEditRef.current = false;
                                    setEditingCell(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      cancelEditRef.current = false;
                                      e.currentTarget.blur();
                                    } else if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      cancelEditRef.current = true;
                                      setEditingCell(null);
                                    }
                                  }}
                                />
                              )
                            ) : (
                              <div
                                tabIndex={cellEditable ? 0 : undefined}
                                role={cellEditable ? 'button' : undefined}
                                aria-label={cellEditable ? `Edit ${col.label}` : undefined}
                                onDoubleClick={
                                  cellEditable
                                    ? () => setEditingCell({ rowId: row.id, columnKey: col.key })
                                    : undefined
                                }
                                onKeyDown={
                                  cellEditable
                                    ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setEditingCell({ rowId: row.id, columnKey: col.key });
                                        }
                                      }
                                    : undefined
                                }
                                className={cn(
                                  cellEditable && 'cursor-text',
                                  cellEditable &&
                                    'focus-visible:ring-ring rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1'
                                )}
                              >
                                <span className={cn(cellError && 'text-destructive')}>
                                  {col.renderCell
                                    ? col.renderCell(cellValue, parsedRow)
                                    : cellValue || '-'}
                                </span>
                                {cellError && (
                                  <p className="text-destructive mt-1 text-xs">
                                    {cellError.message}
                                  </p>
                                )}
                              </div>
                            )}
                          </DataGridTableBodyRowCell>
                        );
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </DataGridTableBody>
          </DataGridTableBase>
        </DataGridContainer>
      </DataGrid>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div data-testid="import-pagination" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* FloatingToolbar for bulk actions on selected rows */}
      <FloatingToolbar selectedCount={selectedCount} onClear={clearSelection}>
        {renderBulkEditDialog && (
          <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(true)}>
            Bulk Edit...
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
          <TrashIcon className="mr-1 h-4 w-4" aria-hidden="true" />
          Delete selected
        </Button>
      </FloatingToolbar>

      {/* Bulk edit dialog rendered by the consumer via render prop */}
      {renderBulkEditDialog &&
        bulkEditOpen &&
        renderBulkEditDialog(selectedRows, handleBulkEditSave, () => setBulkEditOpen(false))}
    </div>
  );
}

/**
 * ImportDialog component
 */
export function ImportDialog({
  title,
  description,
  columns,
  onImport,
  onSuccess,
  trigger,
  triggerLabel = 'Import...',
  onCheckConflicts,
  renderBulkEditDialog,
}: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [datasetVersion, setDatasetVersion] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite'>('skip');

  // Check if all rows are valid
  const hasErrors = useMemo(() => {
    return rows.some((row) => row.errors.length > 0);
  }, [rows]);

  // Check if we have any data
  const hasData = rows.length > 0;

  // Can submit only when we have data and no errors
  const canSubmit = hasData && !hasErrors && !isLoading;

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRows([]);
      setFileName(null);
      setError(null);
      setIsDragActive(false);
      setConflictResult(null);
      setConflictStrategy('skip');
    }
  }, []);

  // Shared file processing logic (validates .csv extension for both input and drop paths)
  const processFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Only .csv files are accepted');
        return;
      }

      setFileName(file.name);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseCSV(text, columns);
        setRows(result.rows);
        setDatasetVersion((v) => v + 1);
        setConflictResult(null);
        setConflictStrategy('skip');
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    },
    [columns]
  );

  // Handle file upload via input
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      processFile(file);
    },
    [processFile]
  );

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate when drag actually leaves the dropzone boundary,
    // not when moving between child elements inside the label
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      processFile(file);
    },
    [processFile]
  );

  // Bulk delete rows by indices (descending order for safe splicing)
  const handleDeleteRows = useCallback((indices: number[]) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => !indices.includes(i));
      if (next.length === 0) setFileName(null);
      return next;
    });
    setDatasetVersion((v) => v + 1);
    setConflictResult(null);
  }, []);

  // Re-apply transforms and re-validate all rows when columns change (e.g., entity data finishes
  // loading, making transform/validate closures aware of sites/roles that weren't available at
  // parse time).
  useEffect(() => {
    if (rows.length === 0) return;
    setRows((prev) =>
      prev.map((row) => {
        // Re-apply transforms (e.g., site name → site ID when lookup data arrives)
        // Snapshot original data so every transform sees pre-transform values
        const originalData = { ...row.data };
        const newData = { ...row.data };
        for (const col of columns) {
          if (col.transform) {
            newData[col.key] = col.transform(originalData[col.key] ?? '', originalData);
          }
        }
        const newErrors = validateRow(newData, columns);
        const dataChanged = Object.keys(newData).some((k) => newData[k] !== row.data[k]);
        const errorsChanged =
          newErrors.length !== row.errors.length ||
          newErrors.some(
            (e, i) => e.column !== row.errors[i]?.column || e.message !== row.errors[i]?.message
          );
        if (!dataChanged && !errorsChanged) return row;
        return { ...row, data: dataChanged ? newData : row.data, errors: newErrors };
      })
    );
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally re-transform/re-validate on column change only

  // Edit a single cell value and re-validate the row (inline editing)
  const handleEditCell = useCallback(
    (rowId: string, columnKey: string, value: string) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const col = columns.find((c) => c.key === columnKey);
          const transformed = col?.transform ? col.transform(value, row.data) : value;
          const newData = { ...row.data, [columnKey]: transformed };
          const newErrors = validateRow(newData, columns);
          return { ...row, data: newData, errors: newErrors };
        })
      );
      setConflictResult(null);
    },
    [columns]
  );

  // Apply bulk edit updates to selected rows and re-validate them
  const handleBulkEdit = useCallback(
    (selectedIds: Set<string>, updates: Record<string, string>) => {
      setRows((prev) =>
        prev.map((row) => {
          if (!selectedIds.has(row.id)) return row;
          const newData = { ...row.data, ...updates };
          const newErrors = validateRow(newData, columns);
          return { ...row, data: newData, errors: newErrors };
        })
      );
      setConflictResult(null);
    },
    [columns]
  );

  // Handle import submission
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      // If conflict checking is enabled and we haven't checked yet
      if (onCheckConflicts && !conflictResult) {
        const result = await onCheckConflicts(rows.map((row) => row.data));
        setConflictResult(result);
        if (result.conflictCount > 0) {
          // Don't import yet — show conflict resolution UI
          return;
        }
      }

      // Proceed with import
      await onImport(
        rows.map((row) => row.data),
        { conflictStrategy }
      );
      await onSuccess?.();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [
    canSubmit,
    rows,
    onImport,
    onSuccess,
    handleOpenChange,
    onCheckConflicts,
    conflictResult,
    conflictStrategy,
  ]);

  // Handle confirmed import after user has reviewed conflicts and chosen a strategy
  const handleConfirmImport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onImport(
        rows.map((row) => row.data),
        { conflictStrategy }
      );
      await onSuccess?.();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [rows, onImport, onSuccess, handleOpenChange, conflictStrategy]);

  // Generate template CSV content
  const templateContent = useMemo(() => {
    const requiredColumns = columns.filter((c) => c.required);
    const optionalColumns = columns.filter((c) => !c.required);
    return (
      <div data-testid="csv-template" className="space-y-2 text-sm">
        <p className="text-muted-foreground">Your CSV file should have the following columns:</p>
        <div className="bg-muted rounded p-2 font-mono text-xs">
          {columns.map((c) => c.key).join(',')}
        </div>
        {requiredColumns.length > 0 && (
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Required:</span>{' '}
            {requiredColumns.map((c) => c.label).join(', ')}
          </p>
        )}
        {optionalColumns.length > 0 && (
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Optional:</span>{' '}
            {optionalColumns.map((c) => c.label).join(', ')}
          </p>
        )}
      </div>
    );
  }, [columns]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">{triggerLabel}</Button>}
      </DialogTrigger>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col overflow-hidden',
          hasData
            ? 'max-w-[calc(100vw-theme(spacing.8))] sm:max-w-[calc(100vw-theme(spacing.8))]'
            : 'sm:max-w-4xl'
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {/* Upload state: instructions + drag-and-drop */}
          {!hasData && (
            <>
              {templateContent}

              <div className="space-y-2">
                <label
                  htmlFor="csv-file-input"
                  data-testid="csv-dropzone"
                  data-drag-active={isDragActive ? 'true' : undefined}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={cn(
                    'flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed',
                    'hover:bg-muted/50 transition-colors',
                    isDragActive && 'border-primary bg-primary/10',
                    !isDragActive && (fileName ? 'border-primary bg-primary/5' : 'border-border')
                  )}
                >
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <UploadIcon aria-hidden="true" className="text-muted-foreground mb-2 h-8 w-8" />
                    {fileName ? (
                      <p className="text-foreground text-sm font-medium">{fileName}</p>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-1 text-sm">
                          <span className="font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-muted-foreground text-xs">CSV files only</p>
                      </>
                    )}
                  </div>
                  <input
                    id="csv-file-input"
                    data-testid="csv-file-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Editing state: DataGrid preview */}
          {hasData && (
            <ImportPreviewGrid
              rows={rows}
              columns={columns}
              datasetVersion={datasetVersion}
              onDeleteRows={handleDeleteRows}
              onEditCell={handleEditCell}
              onBulkEdit={handleBulkEdit}
              renderBulkEditDialog={renderBulkEditDialog}
            />
          )}

          {/* Conflict resolution banner */}
          {conflictResult && conflictResult.conflictCount > 0 && (
            <div
              data-slot="conflict-banner"
              className="bg-warning/10 border-warning space-y-3 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-warning-foreground text-sm font-medium">
                  {conflictResult.conflictCount} row
                  {conflictResult.conflictCount > 1 ? 's' : ''} match existing records
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="conflict-strategy" className="text-sm">
                  For conflicting rows:
                </label>
                <select
                  id="conflict-strategy"
                  value={conflictStrategy}
                  onChange={(e) => setConflictStrategy(e.target.value as 'skip' | 'overwrite')}
                  className="border-input bg-background rounded-md border px-2 py-1 text-sm"
                >
                  <option value="skip">Skip (keep existing)</option>
                  <option value="overwrite">Overwrite existing</option>
                </select>
              </div>
              <Button onClick={handleConfirmImport} disabled={isLoading} size="sm">
                {isLoading ? 'Importing...' : 'Confirm Import'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Data'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
