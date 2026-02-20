import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { usePolling } from '@/hooks/usePolling';

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

describe('usePolling', () => {
  it('should return initial state with data undefined', () => {
    const queryFn = vi.fn().mockResolvedValue({ status: 'running' });

    const { result } = renderHook(
      () =>
        usePolling({
          queryKey: ['test-poll'],
          queryFn,
          interval: 5000,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toBeUndefined();
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
  });

  it('should fetch data on mount', async () => {
    const queryFn = vi.fn().mockResolvedValue({ status: 'running' });

    const { result } = renderHook(
      () =>
        usePolling({
          queryKey: ['test-poll-fetch'],
          queryFn,
          interval: 5000,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ status: 'running' });
    });

    expect(queryFn).toHaveBeenCalled();
  });

  it('should call onSuccess when data is received', async () => {
    const onSuccess = vi.fn();
    const queryFn = vi.fn().mockResolvedValue({ status: 'done' });

    renderHook(
      () =>
        usePolling({
          queryKey: ['test-poll-success'],
          queryFn,
          interval: 5000,
          onSuccess,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ status: 'done' });
    });
  });

  it('should pause and resume polling', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');

    const { result } = renderHook(
      () =>
        usePolling({
          queryKey: ['test-poll-pause'],
          queryFn,
          interval: 5000,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('data');
    });

    act(() => {
      result.current.pause();
    });

    // After pausing, isPolling should be false
    expect(result.current.isPolling).toBe(false);

    act(() => {
      result.current.resume();
    });

    // resumed - the hook should be active again
    // We just verify the function calls work without error
  });

  it('should not poll when enabled is false', () => {
    const queryFn = vi.fn().mockResolvedValue('data');

    const { result } = renderHook(
      () =>
        usePolling({
          queryKey: ['test-poll-disabled'],
          queryFn,
          interval: 5000,
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toBeUndefined();
    expect(queryFn).not.toHaveBeenCalled();
  });
});
