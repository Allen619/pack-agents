// 优化的数据获取 Hook
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOptions {
  enabled?: boolean;
  retryCount?: number;
  retryDelay?: number;
  cacheKey?: string;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const {
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
    cacheKey
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      const result = await fetchFn();

      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setData(result);
      setError(null);
      retryCountRef.current = 0; // 重置重试计数
    } catch (err) {
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : '请求失败';

      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;

        setTimeout(() => {
          fetchData(true);
        }, retryDelay);

        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled, retryCount, retryDelay]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}