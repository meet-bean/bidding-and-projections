/**
 * useShiftSelection hook tests.
 *
 * Tests verify:
 * - Hook returns `handleRowClick` and `clearSelection`
 * - Regular click toggles single row
 * - Shift+click toggles single row and calls preventDefault
 * - handleRowClick is a stable function reference across re-renders
 * - clearSelection clears all selections
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { useShiftSelection } from './use-shift-selection';

// Helper to build a synthetic mouse event with optional shiftKey
function makeMouseEvent(shiftKey = false): MouseEvent {
  return {
    shiftKey,
    preventDefault: vi.fn(),
  } as unknown as MouseEvent;
}

/**
 * Wrapper hook that pairs useState with useShiftSelection for testing.
 * This mirrors how consumers use the hook in practice.
 */
function useControlledShiftSelection(opts?: { initial?: RowSelectionState; rowIds?: string[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(opts?.initial ?? {});
  const result = useShiftSelection({
    rowSelection,
    onRowSelectionChange: setRowSelection,
    rowIds: opts?.rowIds,
  });
  return { rowSelection, ...result };
}

describe('useShiftSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns handleRowClick and clearSelection', () => {
      const { result } = renderHook(() => useControlledShiftSelection());

      expect(result.current.rowSelection).toEqual({});
      expect(typeof result.current.handleRowClick).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
    });

    it('accepts an initial rowSelection state', () => {
      const initial: RowSelectionState = { 'row-1': true };
      const { result } = renderHook(() => useControlledShiftSelection({ initial }));

      expect(result.current.rowSelection).toEqual({ 'row-1': true });
    });
  });

  describe('Regular click (no shift)', () => {
    it('selects a previously unselected row', () => {
      const { result } = renderHook(() => useControlledShiftSelection());

      act(() => {
        result.current.handleRowClick('row-2', makeMouseEvent(false));
      });

      expect(result.current.rowSelection).toEqual({ 'row-2': true });
    });

    it('deselects a previously selected row', () => {
      const initial: RowSelectionState = { 'row-2': true };
      const { result } = renderHook(() => useControlledShiftSelection({ initial }));

      act(() => {
        result.current.handleRowClick('row-2', makeMouseEvent(false));
      });

      expect(result.current.rowSelection['row-2']).toBeFalsy();
    });

    it('does not call preventDefault on regular click', () => {
      const { result } = renderHook(() => useControlledShiftSelection());
      const event = makeMouseEvent(false);

      act(() => {
        result.current.handleRowClick('row-0', event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Shift+click (single row toggle)', () => {
    it('selects a single row on shift+click', () => {
      const { result } = renderHook(() => useControlledShiftSelection());

      act(() => {
        result.current.handleRowClick('row-2', makeMouseEvent(true));
      });

      expect(result.current.rowSelection).toEqual({ 'row-2': true });
    });

    it('deselects a single row on shift+click', () => {
      const initial: RowSelectionState = { 'row-2': true };
      const { result } = renderHook(() => useControlledShiftSelection({ initial }));

      act(() => {
        result.current.handleRowClick('row-2', makeMouseEvent(true));
      });

      expect(result.current.rowSelection['row-2']).toBeFalsy();
    });

    it('calls preventDefault on shift+click to prevent text selection', () => {
      const { result } = renderHook(() => useControlledShiftSelection());

      const shiftEvent = makeMouseEvent(true);
      act(() => {
        result.current.handleRowClick('row-2', shiftEvent);
      });

      expect(shiftEvent.preventDefault).toHaveBeenCalledOnce();
    });

    it('falls back to single toggle when rowIds is not provided', () => {
      const { result } = renderHook(() => useControlledShiftSelection());

      // Click row-1, then shift+click row-3 (no rowIds → no range)
      act(() => {
        result.current.handleRowClick('row-1', makeMouseEvent(false));
      });
      act(() => {
        result.current.handleRowClick('row-3', makeMouseEvent(true));
      });

      // Only row-1 and row-3 should be selected — no range fill
      expect(result.current.rowSelection['row-1']).toBe(true);
      expect(result.current.rowSelection['row-2']).toBeFalsy();
      expect(result.current.rowSelection['row-3']).toBe(true);
    });
  });

  describe('Range selection (with rowIds)', () => {
    const rowIds = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4'];

    it('selects range between anchor and shift+clicked row', () => {
      const { result } = renderHook(() => useControlledShiftSelection({ rowIds }));

      // Click row-1 (sets anchor)
      act(() => {
        result.current.handleRowClick('row-1', makeMouseEvent(false));
      });
      // Shift+click row-3 (selects range 1–3)
      act(() => {
        result.current.handleRowClick('row-3', makeMouseEvent(true));
      });

      expect(result.current.rowSelection['row-0']).toBeFalsy();
      expect(result.current.rowSelection['row-1']).toBe(true);
      expect(result.current.rowSelection['row-2']).toBe(true);
      expect(result.current.rowSelection['row-3']).toBe(true);
      expect(result.current.rowSelection['row-4']).toBeFalsy();
    });

    it('selects range in reverse direction (anchor after target)', () => {
      const { result } = renderHook(() => useControlledShiftSelection({ rowIds }));

      // Click row-3 (anchor), then shift+click row-1
      act(() => {
        result.current.handleRowClick('row-3', makeMouseEvent(false));
      });
      act(() => {
        result.current.handleRowClick('row-1', makeMouseEvent(true));
      });

      expect(result.current.rowSelection['row-0']).toBeFalsy();
      expect(result.current.rowSelection['row-1']).toBe(true);
      expect(result.current.rowSelection['row-2']).toBe(true);
      expect(result.current.rowSelection['row-3']).toBe(true);
      expect(result.current.rowSelection['row-4']).toBeFalsy();
    });

    it('adds to existing selection when shift+clicking a new range', () => {
      const { result } = renderHook(() =>
        useControlledShiftSelection({ initial: { 'row-0': true }, rowIds })
      );

      // Click row-2 (new anchor)
      act(() => {
        result.current.handleRowClick('row-2', makeMouseEvent(false));
      });
      // Shift+click row-4
      act(() => {
        result.current.handleRowClick('row-4', makeMouseEvent(true));
      });

      // row-0 was already selected, row-2 through row-4 added
      expect(result.current.rowSelection['row-0']).toBe(true);
      expect(result.current.rowSelection['row-2']).toBe(true);
      expect(result.current.rowSelection['row-3']).toBe(true);
      expect(result.current.rowSelection['row-4']).toBe(true);
    });
  });

  describe('Controlled onRowSelectionChange callback', () => {
    it('calls onRowSelectionChange with the updated state on regular click', () => {
      const onRowSelectionChange = vi.fn();
      const { result } = renderHook(() => {
        const [rowSelection] = useState<RowSelectionState>({});
        return useShiftSelection({
          rowSelection,
          onRowSelectionChange,
        });
      });

      act(() => {
        result.current.handleRowClick('row-0', makeMouseEvent(false));
      });

      expect(onRowSelectionChange).toHaveBeenCalledOnce();
      const firstCall = onRowSelectionChange.mock.calls[0];
      expect(firstCall).toBeDefined();
      const arg = firstCall![0] as RowSelectionState;
      expect(arg['row-0']).toBe(true);
    });

    it('calls onRowSelectionChange with the updated state on shift+click', () => {
      const spy = vi.fn();
      const { result } = renderHook(() => {
        const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
        const onChange = (state: RowSelectionState) => {
          spy(state);
          setRowSelection(state);
        };
        return useShiftSelection({
          rowSelection,
          onRowSelectionChange: onChange,
        });
      });

      act(() => {
        result.current.handleRowClick('row-1', makeMouseEvent(false));
      });
      act(() => {
        result.current.handleRowClick('row-3', makeMouseEvent(true));
      });

      expect(spy).toHaveBeenCalledTimes(2);
      const secondCall = spy.mock.calls[1];
      expect(secondCall).toBeDefined();
      const lastArg = secondCall![0] as RowSelectionState;
      expect(lastArg['row-1']).toBe(true);
      expect(lastArg['row-3']).toBe(true);
    });
  });

  describe('clearSelection', () => {
    it('clears all selections', () => {
      const { result } = renderHook(() => useControlledShiftSelection());

      act(() => {
        result.current.handleRowClick('row-1', makeMouseEvent(false));
      });
      expect(result.current.rowSelection).toEqual({ 'row-1': true });

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.rowSelection).toEqual({});
    });
  });

  describe('Function Stability', () => {
    it('handleRowClick reference is stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useControlledShiftSelection());

      const handleRowClick1 = result.current.handleRowClick;
      rerender();
      const handleRowClick2 = result.current.handleRowClick;

      expect(handleRowClick1).toBe(handleRowClick2);
    });
  });
});
