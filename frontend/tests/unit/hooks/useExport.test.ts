import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '@/hooks/useExport';

describe('useExport', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createdLinks: HTMLAnchorElement[];
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    clickSpy = vi.fn();
    createdLinks = [];

    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = originalCreateElement(tag, options);
      if (tag === 'a') {
        el.click = clickSpy;
        createdLinks.push(el as HTMLAnchorElement);
      }
      return el;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useExport());

    expect(result.current.exporting).toBe(false);
    expect(typeof result.current.exportCSV).toBe('function');
    expect(typeof result.current.exportJSON).toBe('function');
  });

  it('should export CSV with column definitions', () => {
    const { result } = renderHook(() => useExport());

    const data = [
      { name: 'Patch A', severity: 'high' },
      { name: 'Patch B', severity: 'low' },
    ];

    act(() => {
      result.current.exportCSV(data, 'patches.csv', [
        { key: 'name', header: 'Name' },
        { key: 'severity', header: 'Severity' },
      ]);
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    const link = createdLinks[createdLinks.length - 1];
    expect(link.download).toBe('patches.csv');
    expect(result.current.exporting).toBe(false);
  });

  it('should export CSV without column definitions (auto-detect from keys)', () => {
    const { result } = renderHook(() => useExport());

    const data = [{ id: '1', name: 'Test' }];

    act(() => {
      result.current.exportCSV(data, 'test');
    });

    const link = createdLinks[createdLinks.length - 1];
    expect(link.download).toBe('test.csv');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should not export CSV when data is empty', () => {
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportCSV([], 'empty.csv');
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('should export JSON', () => {
    const { result } = renderHook(() => useExport());

    const data = { items: [1, 2, 3] };

    act(() => {
      result.current.exportJSON(data, 'data.json');
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    const link = createdLinks[createdLinks.length - 1];
    expect(link.download).toBe('data.json');
    expect(result.current.exporting).toBe(false);
  });

  it('should append .json extension if missing', () => {
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportJSON({ a: 1 }, 'data');
    });

    const link = createdLinks[createdLinks.length - 1];
    expect(link.download).toBe('data.json');
  });
});
