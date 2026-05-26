import { useCallback, useEffect, useRef } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';

/**
 * Options for the useShiftSelection hook.
 */
export interface UseShiftSelectionOptions {
  /**
   * Current row selection state (controlled externally).
   * The hook reads this via ref so the stable `handleRowClick` callback
   * always sees the latest value.
   */
  rowSelection: RowSelectionState;
  /**
   * Callback fired whenever the selection changes.
   * Mirrors TanStack Table's `onRowSelectionChange` signature.
   * Required — the hook does NOT own selection state.
   */
  onRowSelectionChange: (state: RowSelectionState) => void;
  /**
   * Ordered list of all row IDs currently displayed. Required for
   * shift+click range selection to determine which rows fall between
   * the anchor and the clicked row.
   */
  rowIds?: string[];
}

/**
 * Return type for the useShiftSelection hook.
 */
export interface UseShiftSelectionReturn {
  /**
   * Call this on a checkbox or row click event.
   *
   * - Regular click: toggles the single row and sets it as the anchor.
   * - Shift+click: selects (or deselects) all rows between the anchor
   *   and the clicked row, inclusive. Calls `preventDefault` to suppress
   *   text selection.
   */
  handleRowClick: (rowId: string, event: MouseEvent | React.MouseEvent) => void;
  /**
   * Clears all row selections.
   */
  clearSelection: () => void;
}

/**
 * Wraps TanStack Table row-selection state to add shift+click range selection.
 *
 * Regular click toggles a single row and records it as the "anchor".
 * Shift+click selects all rows between the anchor and the clicked row.
 * When `rowIds` is not provided, shift+click falls back to single-row toggle.
 *
 * This is a **controlled** hook — the caller owns `rowSelection` state and
 * provides it via options. All mutations go through `onRowSelectionChange`.
 *
 * @example
 * ```tsx
 * const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
 * const rowIds = rows.map(r => r.id);
 * const { handleRowClick, clearSelection } = useShiftSelection({
 *   rowSelection,
 *   onRowSelectionChange: setRowSelection,
 *   rowIds,
 * });
 * ```
 */
export function useShiftSelection({
  rowSelection,
  onRowSelectionChange,
  rowIds,
}: UseShiftSelectionOptions): UseShiftSelectionReturn {
  // Keep mutable refs so the stable callbacks always read the latest values.
  const rowSelectionRef = useRef<RowSelectionState>(rowSelection);
  rowSelectionRef.current = rowSelection;

  const onChangeRef = useRef(onRowSelectionChange);
  onChangeRef.current = onRowSelectionChange;

  const rowIdsRef = useRef<string[] | undefined>(rowIds);
  rowIdsRef.current = rowIds;

  // Anchor row for shift+click range selection
  const anchorRef = useRef<string | null>(null);

  // Clear anchor whenever the selection is emptied externally (e.g., "Clear all" button).
  useEffect(() => {
    if (Object.keys(rowSelection).length === 0) {
      anchorRef.current = null;
    }
  }, [rowSelection]);

  const clearSelection = useCallback(() => {
    onChangeRef.current({});
    anchorRef.current = null;
  }, []);

  const handleRowClick = useCallback(
    (rowId: string, event: MouseEvent | React.MouseEvent) => {
      const prev = rowSelectionRef.current;

      if (event.shiftKey) {
        event.preventDefault();

        const ids = rowIdsRef.current;
        const anchor = anchorRef.current;

        // Range selection: if we have an anchor and rowIds, select/deselect the range
        if (anchor && ids && ids.length > 0) {
          const anchorIdx = ids.indexOf(anchor);
          const clickIdx = ids.indexOf(rowId);

          if (anchorIdx !== -1 && clickIdx !== -1) {
            const start = Math.min(anchorIdx, clickIdx);
            const end = Math.max(anchorIdx, clickIdx);
            const next = { ...prev };

            // Select all rows in the range
            for (let i = start; i <= end; i++) {
              const id = ids[i];
              if (id) {
                next[id] = true;
              }
            }
            onChangeRef.current(next);
            return;
          }
        }

        // Fallback: no anchor or no rowIds — just toggle the single row
        const next = { ...prev };
        if (next[rowId]) {
          delete next[rowId];
        } else {
          next[rowId] = true;
        }
        anchorRef.current = rowId;
        onChangeRef.current(next);
      } else {
        // Regular click: toggle single row, set anchor
        const next = { ...prev };
        if (next[rowId]) {
          delete next[rowId];
        } else {
          next[rowId] = true;
        }
        anchorRef.current = rowId;
        onChangeRef.current(next);
      }
    },
    [] // Stable: all mutable state accessed via refs
  );

  return { handleRowClick, clearSelection };
}
