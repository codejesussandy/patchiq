import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have correct initial state with defaults', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    expect(result.current.value).toBe('');
    expect(result.current.debouncedValue).toBe('');
    expect(typeof result.current.setValue).toBe('function');
    expect(typeof result.current.clear).toBe('function');
  });

  it('should use custom initialValue', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch({ initialValue: 'hello' }),
    );

    expect(result.current.value).toBe('hello');
    expect(result.current.debouncedValue).toBe('hello');
  });

  it('should update value immediately on setValue', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    act(() => {
      result.current.setValue('test');
    });

    expect(result.current.value).toBe('test');
    // debouncedValue should NOT have updated yet
    expect(result.current.debouncedValue).toBe('');
  });

  it('should update debouncedValue after default delay (300ms)', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    act(() => {
      result.current.setValue('search term');
    });

    expect(result.current.debouncedValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe('search term');
  });

  it('should update debouncedValue after custom delay', () => {
    const { result } = renderHook(() => useDebouncedSearch({ delay: 500 }));

    act(() => {
      result.current.setValue('custom');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.debouncedValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedValue).toBe('custom');
  });

  it('should reset both values on clear', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    act(() => {
      result.current.setValue('something');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.value).toBe('something');
    expect(result.current.debouncedValue).toBe('something');

    act(() => {
      result.current.clear();
    });

    expect(result.current.value).toBe('');
    expect(result.current.debouncedValue).toBe('');
  });

  it('should debounce rapid value changes', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    act(() => {
      result.current.setValue('a');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setValue('ab');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setValue('abc');
    });

    // Only 200ms passed since last change, debounced should still be empty
    expect(result.current.debouncedValue).toBe('');
    expect(result.current.value).toBe('abc');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe('abc');
  });
});
