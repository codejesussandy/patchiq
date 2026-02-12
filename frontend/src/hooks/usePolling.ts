import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UsePollingOptions<T> {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  interval: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
}

interface UsePollingReturn<T> {
  data: T | undefined;
  isPolling: boolean;
  pause: () => void;
  resume: () => void;
}

/**
 * Configurable polling hook that wraps React Query's `refetchInterval`.
 * Provides pause/resume controls for managing polling lifecycle.
 *
 * @example
 * ```tsx
 * function JobStatus({ jobId }: { jobId: string }) {
 *   const { data, isPolling, pause } = usePolling({
 *     queryKey: ['job', jobId],
 *     queryFn: () => jobService.getStatus(jobId),
 *     interval: 5000,
 *     onSuccess: (job) => {
 *       if (job.status === 'COMPLETED') pause();
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <span>Status: {data?.status}</span>
 *       {isPolling && <Spin size="small" />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePolling<T = unknown>(options: UsePollingOptions<T>): UsePollingReturn<T> {
  const { queryKey, queryFn, interval, enabled = true, onSuccess } = options;
  const [paused, setPaused] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; });

  const isActive = enabled && !paused;

  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval: isActive ? interval : false,
    enabled,
  });

  useEffect(() => {
    if (query.data !== undefined && onSuccessRef.current) {
      onSuccessRef.current(query.data);
    }
  }, [query.data]);

  const pause = useCallback(() => {
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  return {
    data: query.data,
    isPolling: isActive && query.isFetching,
    pause,
    resume,
  };
}
