import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from '../useModal';

describe('useModal', () => {
  it('initializes with closed state', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.open).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('opens modal without item', () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.onOpen();
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toBeNull();
  });

  it('opens modal with selected item', () => {
    interface TestItem {
      id: string;
      name: string;
    }

    const { result } = renderHook(() => useModal<TestItem>());
    const testItem = { id: '1', name: 'Test Item' };

    act(() => {
      result.current.onOpen(testItem);
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toEqual(testItem);
  });

  it('closes modal and clears selected item', () => {
    interface TestItem {
      id: string;
      name: string;
    }

    const { result } = renderHook(() => useModal<TestItem>());
    const testItem = { id: '1', name: 'Test Item' };

    // First open with item
    act(() => {
      result.current.onOpen(testItem);
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toEqual(testItem);

    // Then close
    act(() => {
      result.current.onClose();
    });

    expect(result.current.open).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('handles multiple open/close cycles', () => {
    const { result } = renderHook(() => useModal<string>());

    // Open with first item
    act(() => {
      result.current.onOpen('first');
    });
    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toBe('first');

    // Close
    act(() => {
      result.current.onClose();
    });
    expect(result.current.open).toBe(false);
    expect(result.current.selectedItem).toBeNull();

    // Open with second item
    act(() => {
      result.current.onOpen('second');
    });
    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toBe('second');
  });

  it('handles complex objects as selected items', () => {
    interface Patch {
      id: string;
      name: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      affectedAssets: number;
    }

    const { result } = renderHook(() => useModal<Patch>());
    const patch: Patch = {
      id: 'patch-123',
      name: 'Security Update',
      severity: 'CRITICAL',
      affectedAssets: 42,
    };

    act(() => {
      result.current.onOpen(patch);
    });

    expect(result.current.selectedItem).toEqual(patch);
    expect(result.current.selectedItem?.severity).toBe('CRITICAL');
    expect(result.current.selectedItem?.affectedAssets).toBe(42);
  });

  it('replaces selected item when opening with new item', () => {
    const { result } = renderHook(() => useModal<number>());

    act(() => {
      result.current.onOpen(1);
    });
    expect(result.current.selectedItem).toBe(1);

    // Open again with different item (without closing first)
    act(() => {
      result.current.onOpen(2);
    });
    expect(result.current.selectedItem).toBe(2);
  });

  it('maintains referential equality for callbacks', () => {
    const { result, rerender } = renderHook(() => useModal());

    const firstOnOpen = result.current.onOpen;
    const firstOnClose = result.current.onClose;

    // Rerender should not create new callback references
    rerender();

    expect(result.current.onOpen).toBe(firstOnOpen);
    expect(result.current.onClose).toBe(firstOnClose);
  });
});
