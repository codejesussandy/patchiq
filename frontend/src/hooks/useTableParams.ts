import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface SortState {
  field: string;
  order: 'asc' | 'desc';
}

interface UseTableParamsOptions<TFilters> {
  defaultPageSize?: number;
  defaultSort?: SortState;
  syncUrl?: boolean;
  defaultFilters?: TFilters;
}

interface UseTableParamsReturn<TFilters> {
  page: number;
  pageSize: number;
  sort: SortState | undefined;
  search: string;
  filters: TFilters;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;
  setSearch: (value: string) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  resetFilters: () => void;
  queryParams: { page: number; pageSize: number; sort?: string; order?: string; search?: string } & TFilters;
}

/**
 * Manages table pagination, sorting, search, and filter state.
 * Optionally syncs state to URL query parameters for shareable links.
 *
 * @example
 * ```tsx
 * interface MyFilters { status: string; severity: string }
 *
 * function PatchList() {
 *   const table = useTableParams<MyFilters>({
 *     defaultPageSize: 20,
 *     defaultSort: { field: 'createdAt', order: 'desc' },
 *     syncUrl: true,
 *   });
 *
 *   const { data } = useQuery({
 *     queryKey: ['patches', table.queryParams],
 *     queryFn: () => patchService.getAll(table.queryParams),
 *   });
 *
 *   return (
 *     <DataTable
 *       page={table.page}
 *       pageSize={table.pageSize}
 *       onPageChange={table.setPage}
 *       onSort={(field, order) => table.setSort(field, order)}
 *     />
 *   );
 * }
 * ```
 */
export function useTableParams<TFilters = Record<string, unknown>>(
  options?: UseTableParamsOptions<TFilters>,
): UseTableParamsReturn<TFilters> {
  const {
    defaultPageSize = 10,
    defaultSort,
    syncUrl = false,
    defaultFilters = {} as TFilters,
  } = options ?? {};

  // Always call useSearchParams to satisfy rules of hooks.
  // When syncUrl is false, we simply ignore the URL state.
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialPage = () => {
    if (syncUrl) {
      const val = searchParams.get('page');
      return val ? Number(val) || 1 : 1;
    }
    return 1;
  };

  const getInitialPageSize = () => {
    if (syncUrl) {
      const val = searchParams.get('pageSize');
      return val ? Number(val) || defaultPageSize : defaultPageSize;
    }
    return defaultPageSize;
  };

  const getInitialSearch = () => {
    if (syncUrl) {
      return searchParams.get('search') ?? '';
    }
    return '';
  };

  const getInitialSort = (): SortState | undefined => {
    if (syncUrl) {
      const field = searchParams.get('sort');
      const order = searchParams.get('order');
      if (field && order) {
        return { field, order: order as 'asc' | 'desc' };
      }
    }
    return defaultSort;
  };

  const [page, setPageState] = useState(getInitialPage);
  const [pageSize, setPageSizeState] = useState(getInitialPageSize);
  const [sort, setSortState] = useState<SortState | undefined>(getInitialSort);
  const [search, setSearchState] = useState(getInitialSearch);
  const [filters, setFiltersState] = useState<TFilters>(defaultFilters);

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      if (!syncUrl) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [syncUrl, setSearchParams],
  );

  const setPage = useCallback(
    (p: number) => {
      setPageState(p);
      updateUrl({ page: String(p) });
    },
    [updateUrl],
  );

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setPageState(1);
      updateUrl({ pageSize: String(size), page: '1' });
    },
    [updateUrl],
  );

  const setSort = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortState({ field, order });
      updateUrl({ sort: field, order });
    },
    [updateUrl],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setPageState(1);
      updateUrl({ search: value || undefined, page: '1' });
    },
    [updateUrl],
  );

  const setFilters = useCallback(
    (partial: Partial<TFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...partial }));
      setPageState(1);
      if (syncUrl) {
        const updates: Record<string, string | undefined> = { page: '1' };
        for (const [key, value] of Object.entries(partial as Record<string, unknown>)) {
          updates[key] = value != null ? String(value) : undefined;
        }
        updateUrl(updates);
      }
    },
    [syncUrl, updateUrl],
  );

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setSearchState('');
    setPageState(1);
    if (syncUrl) {
      setSearchParams(new URLSearchParams());
    }
  }, [defaultFilters, syncUrl, setSearchParams]);

  const queryParams = useMemo(() => {
    const base: Record<string, unknown> = {
      page,
      pageSize,
    };
    if (sort) {
      base.sort = sort.field;
      base.order = sort.order;
    }
    if (search) {
      base.search = search;
    }
    return { ...base, ...filters } as { page: number; pageSize: number; sort?: string; order?: string; search?: string } & TFilters;
  }, [page, pageSize, sort, search, filters]);

  return {
    page,
    pageSize,
    sort,
    search,
    filters,
    setPage,
    setPageSize,
    setSort,
    setSearch,
    setFilters,
    resetFilters,
    queryParams,
  };
}
