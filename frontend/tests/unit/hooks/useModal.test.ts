import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from '@/hooks/useModal';

describe('useModal', () => {
  it('should have correct initial state', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.open).toBe(false);
    expect(result.current.selectedItem).toBeNull();
    expect(typeof result.current.onOpen).toBe('function');
    expect(typeof result.current.onClose).toBe('function');
  });

  it('should open modal without item', () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.onOpen();
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toBeNull();
  });

  it('should open modal with item', () => {
    const { result } = renderHook(() => useModal<{ id: string; name: string }>());
    const item = { id: '1', name: 'Test Item' };

    act(() => {
      result.current.onOpen(item);
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toEqual(item);
  });

  it('should close modal and reset selectedItem', () => {
    const { result } = renderHook(() => useModal<{ id: string }>());

    act(() => {
      result.current.onOpen({ id: '1' });
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toEqual({ id: '1' });

    act(() => {
      result.current.onClose();
    });

    expect(result.current.open).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('should handle multiple open/close cycles', () => {
    const { result } = renderHook(() => useModal<string>());

    act(() => {
      result.current.onOpen('first');
    });
    expect(result.current.selectedItem).toBe('first');

    act(() => {
      result.current.onClose();
    });
    expect(result.current.selectedItem).toBeNull();

    act(() => {
      result.current.onOpen('second');
    });
    expect(result.current.selectedItem).toBe('second');
  });
});
