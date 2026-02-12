import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDebouncedSearchOptions {
  delay?: number;
  initialValue?: string;
}

interface UseDebouncedSearchReturn {
  value: string;
  debouncedValue: string;
  setValue: (value: string) => void;
  clear: () => void;
}

/**
 * Provides a debounced search value with configurable delay.
 * The `value` updates immediately for responsive input display,
 * while `debouncedValue` updates after the delay for API calls.
 *
 * @example
 * ```tsx
 * function SearchableList() {
 *   const search = useDebouncedSearch({ delay: 500 });
 *
 *   const { data } = useQuery({
 *     queryKey: ['items', search.debouncedValue],
 *     queryFn: () => api.search(search.debouncedValue),
 *   });
 *
 *   return (
 *     <Input
 *       value={search.value}
 *       onChange={(e) => search.setValue(e.target.value)}
 *       allowClear
 *       onClear={() => search.clear()}
 *     />
 *   );
 * }
 * ```
 */
export function useDebouncedSearch(options?: UseDebouncedSearchOptions): UseDebouncedSearchReturn {
  const { delay = 300, initialValue = '' } = options ?? {};

  const [value, setValueState] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  const setValue = useCallback((v: string) => {
    setValueState(v);
  }, []);

  const clear = useCallback(() => {
    setValueState('');
    setDebouncedValue('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return { value, debouncedValue, setValue, clear };
}
