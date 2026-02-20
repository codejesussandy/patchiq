import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/reports.service', () => ({
  reportsService: {
    getReports: vi.fn().mockResolvedValue([{ id: 'r1', name: 'Monthly Report' }]),
    getReport: vi.fn().mockResolvedValue({ id: 'r1' }),
    getTemplates: vi.fn().mockResolvedValue([]),
    getSchedules: vi.fn().mockResolvedValue([]),
    getVulnerabilityReports: vi.fn().mockResolvedValue([]),
    getPreview: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useReports,
  useReportTemplates,
  useReportSchedules,
  useVulnerabilityReports,
  reportKeys,
} from '@/hooks/useReports';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('useReports hooks', () => {
  it('useReports should return loading initially', () => {
    const { result } = renderHook(() => useReports(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useReports should return data on success', async () => {
    const { result } = renderHook(() => useReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'r1', name: 'Monthly Report' }]);
  });

  it('useReportTemplates should return loading initially', () => {
    const { result } = renderHook(() => useReportTemplates(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useReportSchedules should return loading initially', () => {
    const { result } = renderHook(() => useReportSchedules(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useVulnerabilityReports should return loading initially', () => {
    const { result } = renderHook(() => useVulnerabilityReports(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('reportKeys should generate correct keys', () => {
      expect(reportKeys.all).toEqual(['reports']);
      expect(reportKeys.detail('r1')).toEqual(['reports', 'detail', 'r1']);
      expect(reportKeys.templates()).toEqual(['reports', 'templates']);
      expect(reportKeys.schedules()).toEqual(['reports', 'schedules']);
    });
  });
});
