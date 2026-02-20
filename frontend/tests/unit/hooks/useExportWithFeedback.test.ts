import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportWithFeedback } from '@/hooks/useExportWithFeedback';
import type { ExportFormat } from '@/hooks/useExportWithFeedback';

// Mock antd App.useApp
const mockMessage = {
  loading: vi.fn().mockReturnValue(vi.fn()),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};

vi.mock('antd', () => ({
  App: {
    useApp: () => ({
      message: mockMessage,
    }),
  },
}));

describe('useExportWithFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const onExport = vi.fn();
    const { result } = renderHook(() =>
      useExportWithFeedback({ onExport }),
    );

    expect(result.current.exporting).toBe(false);
    expect(result.current.exportFormat).toBeNull();
    expect(typeof result.current.handleExport).toBe('function');
    expect(typeof result.current.isExporting).toBe('function');
  });

  it('should handle successful export', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useExportWithFeedback({ onExport }),
    );

    await act(async () => {
      await result.current.handleExport('csv');
    });

    expect(onExport).toHaveBeenCalledWith('csv');
    expect(mockMessage.loading).toHaveBeenCalledWith('Exporting to CSV...', 0);
    expect(mockMessage.success).toHaveBeenCalledWith(
      'Export completed successfully',
      3,
    );
    expect(result.current.exporting).toBe(false);
    expect(result.current.exportFormat).toBeNull();
  });

  it('should handle export error', async () => {
    const onExport = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() =>
      useExportWithFeedback({ onExport }),
    );

    await act(async () => {
      await result.current.handleExport('pdf');
    });

    expect(mockMessage.error).toHaveBeenCalledWith(
      'Failed to export data',
      3,
    );
    expect(result.current.exporting).toBe(false);
    expect(result.current.exportFormat).toBeNull();
  });

  it('should use custom success/error messages', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useExportWithFeedback({
        onExport,
        successMessage: 'Done!',
        errorMessage: 'Oops!',
      }),
    );

    await act(async () => {
      await result.current.handleExport('json');
    });

    expect(mockMessage.success).toHaveBeenCalledWith('Done!', 3);
  });

  it('should report isExporting correctly for specific format', async () => {
    let resolveExport: () => void;
    const onExport = vi.fn(
      () => new Promise<void>((resolve) => { resolveExport = resolve; }),
    );
    const { result } = renderHook(() =>
      useExportWithFeedback({ onExport }),
    );

    // Before export, isExporting should be false
    expect(result.current.isExporting('csv')).toBe(false);

    let exportPromise: Promise<void>;
    act(() => {
      exportPromise = result.current.handleExport('csv');
    });

    // During export
    expect(result.current.exporting).toBe(true);
    expect(result.current.exportFormat).toBe('csv');
    expect(result.current.isExporting('csv')).toBe(true);
    expect(result.current.isExporting('pdf')).toBe(false);

    await act(async () => {
      resolveExport!();
      await exportPromise!;
    });

    expect(result.current.exporting).toBe(false);
  });
});
