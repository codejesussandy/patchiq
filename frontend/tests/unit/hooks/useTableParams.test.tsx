import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useTableParams } from '@/hooks/useTableParams';

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

describe('useTableParams', () => {
  it('should have correct default values', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.search).toBe('');
    expect(result.current.sort).toBeUndefined();
    expect(result.current.filters).toEqual({});
  });

  it('should accept custom defaultPageSize', () => {
    const { result } = renderHook(
      () => useTableParams({ defaultPageSize: 20 }),
      { wrapper: createWrapper() },
    );

    expect(result.current.pageSize).toBe(20);
  });

  it('should accept defaultSort', () => {
    const { result } = renderHook(
      () => useTableParams({ defaultSort: { field: 'name', order: 'asc' } }),
      { wrapper: createWrapper() },
    );

    expect(result.current.sort).toEqual({ field: 'name', order: 'asc' });
  });

  it('should update page with setPage', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
  });

  it('should reset page to 1 when setPageSize is called', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPage(5);
    });
    expect(result.current.page).toBe(5);

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.page).toBe(1);
  });

  it('should update sort with setSort', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSort('createdAt', 'desc');
    });

    expect(result.current.sort).toEqual({ field: 'createdAt', order: 'desc' });
  });

  it('should reset page to 1 when setSearch is called', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPage(3);
    });

    act(() => {
      result.current.setSearch('query');
    });

    expect(result.current.search).toBe('query');
    expect(result.current.page).toBe(1);
  });

  it('should merge filters with setFilters', () => {
    interface TestFilters {
      status: string;
      severity: string;
    }
    const { result } = renderHook(
      () =>
        useTableParams<TestFilters>({
          defaultFilters: { status: '', severity: '' },
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setFilters({ status: 'active' });
    });

    expect(result.current.filters).toEqual({ status: 'active', severity: '' });

    act(() => {
      result.current.setFilters({ severity: 'high' });
    });

    expect(result.current.filters).toEqual({
      status: 'active',
      severity: 'high',
    });
  });

  it('should reset page to 1 when setFilters is called', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPage(4);
    });

    act(() => {
      result.current.setFilters({ status: 'active' });
    });

    expect(result.current.page).toBe(1);
  });

  it('should resetFilters to defaults', () => {
    interface TestFilters {
      status: string;
    }
    const { result } = renderHook(
      () =>
        useTableParams<TestFilters>({
          defaultFilters: { status: '' },
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setSearch('test');
      result.current.setPage(3);
      result.current.setFilters({ status: 'active' });
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual({ status: '' });
    expect(result.current.search).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('should compute queryParams correctly', () => {
    const { result } = renderHook(
      () =>
        useTableParams({
          defaultSort: { field: 'name', order: 'asc' },
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.queryParams).toEqual({
      page: 1,
      pageSize: 10,
      sort: 'name',
      order: 'asc',
    });

    act(() => {
      result.current.setSearch('hello');
      result.current.setPage(2);
    });

    expect(result.current.queryParams).toEqual({
      page: 2,
      pageSize: 10,
      sort: 'name',
      order: 'asc',
      search: 'hello',
    });
  });

  it('should not include sort/search in queryParams when not set', () => {
    const { result } = renderHook(() => useTableParams(), {
      wrapper: createWrapper(),
    });

    expect(result.current.queryParams).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it('should include filters in queryParams', () => {
    interface TestFilters {
      category: string;
    }
    const { result } = renderHook(
      () =>
        useTableParams<TestFilters>({
          defaultFilters: { category: '' },
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setFilters({ category: 'server' });
    });

    expect(result.current.queryParams).toEqual({
      page: 1,
      pageSize: 10,
      category: 'server',
    });
  });
});
