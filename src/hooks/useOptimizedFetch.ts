import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCache } from '@/lib/cache/api-cache';

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  cancel: () => void;
}

export interface FetchOptions {
  immediate?: boolean; // 是否立即执行
  cache?: boolean; // 是否使用缓存
  cacheTtl?: number; // 缓存时间
  retries?: number; // 重试次数
  retryDelay?: number; // 重试延迟
  timeout?: number; // 请求超时
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

// 优化的 fetch hook
export function useOptimizedFetch<T>(
  url: string | null,
  options: FetchOptions = {}
): FetchState<T> {
  const {
    immediate = true,
    cache = true,
    cacheTtl,
    retries = 1,
    retryDelay = 1000,
    timeout = 10000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // 取消请求
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 执行请求
  const executeFetch = useCallback(async (): Promise<void> => {
    if (!url) return;

    // 检查缓存
    if (cache) {
      const cachedData = apiCache.get<T>(url);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setError(null);
        onSuccess?.(cachedData);
        return;
      }
    }

    // 取消之前的请求
    cancel();

    setLoading(true);
    setError(null);

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 设置超时
      const timeoutId = setTimeout(() => {
        cancel();
      }, timeout);

      const response = await fetch(url, { signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 缓存结果
      if (cache) {
        apiCache.set(url, result, { ttl: cacheTtl });
      }

      setData(result);
      setError(null);
      onSuccess?.(result);
      retryCountRef.current = 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // 请求被取消，不需要处理
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));

      // 重试逻辑
      if (retryCountRef.current < retries) {
        retryCountRef.current++;
        console.warn(
          `Request failed, retrying (${retryCountRef.current}/${retries}):`,
          error.message
        );

        setTimeout(() => {
          executeFetch();
        }, retryDelay * retryCountRef.current); // 指数退避

        return;
      }

      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    url,
    cache,
    cacheTtl,
    retries,
    retryDelay,
    timeout,
    onSuccess,
    onError,
    cancel,
  ]);

  // 重新获取数据
  const refetch = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await executeFetch();
  }, [executeFetch]);

  // 自动执行
  useEffect(() => {
    if (immediate && url) {
      executeFetch();
    }

    // 清理函数
    return () => {
      cancel();
    };
  }, [url, immediate, executeFetch, cancel]);

  return {
    data,
    loading,
    error,
    refetch,
    cancel,
  };
}

// 批量请求 hook
export function useBatchFetch<T>(
  urls: string[],
  options: FetchOptions = {}
): {
  data: (T | null)[];
  loading: boolean;
  errors: (Error | null)[];
  refetchAll: () => Promise<void>;
  cancelAll: () => void;
} {
  const [data, setData] = useState<(T | null)[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<(Error | null)[]>([]);

  const abortControllersRef = useRef<AbortController[]>([]);

  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current = [];
  }, []);

  const executeBatchFetch = useCallback(async (): Promise<void> => {
    if (urls.length === 0) return;

    setLoading(true);
    setData(new Array(urls.length).fill(null));
    setErrors(new Array(urls.length).fill(null));

    // 清理之前的控制器
    cancelAll();

    // 为每个请求创建 AbortController
    abortControllersRef.current = urls.map(() => new AbortController());

    const fetchPromises = urls.map(async (url, index) => {
      try {
        // 检查缓存
        if (options.cache) {
          const cachedData = apiCache.get<T>(url);
          if (cachedData) {
            return { index, data: cachedData, error: null };
          }
        }

        const signal = abortControllersRef.current[index].signal;
        const response = await fetch(url, { signal });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // 缓存结果
        if (options.cache) {
          apiCache.set(url, result, { ttl: options.cacheTtl });
        }

        return { index, data: result, error: null };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { index, data: null, error: null };
        }

        const error = err instanceof Error ? err : new Error(String(err));
        return { index, data: null, error };
      }
    });

    try {
      const results = await Promise.all(fetchPromises);

      const newData = new Array(urls.length).fill(null);
      const newErrors = new Array(urls.length).fill(null);

      results.forEach(({ index, data, error }) => {
        newData[index] = data;
        newErrors[index] = error;
      });

      setData(newData);
      setErrors(newErrors);
    } catch (error) {
      console.error('Batch fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [urls, options.cache, options.cacheTtl, cancelAll]);

  const refetchAll = useCallback(async (): Promise<void> => {
    await executeBatchFetch();
  }, [executeBatchFetch]);

  useEffect(() => {
    if (options.immediate !== false && urls.length > 0) {
      executeBatchFetch();
    }

    return () => {
      cancelAll();
    };
  }, [urls, executeBatchFetch, cancelAll, options.immediate]);

  return {
    data,
    loading,
    errors,
    refetchAll,
    cancelAll,
  };
}

// 无限滚动 hook
export function useInfiniteScroll<T>(
  baseUrl: string,
  options: FetchOptions & {
    pageParam?: string;
    getNextPageParam?: (lastPage: any) => string | null;
    initialPageParam?: string;
  } = {}
): {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
} {
  const {
    pageParam = 'page',
    getNextPageParam,
    initialPageParam = '1',
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<string>(initialPageParam);

  const buildUrl = useCallback(
    (page: string) => {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${pageParam}=${page}`;
    },
    [baseUrl, pageParam]
  );

  const fetchPage = useCallback(
    async (page: string, append = false): Promise<void> => {
      const url = buildUrl(page);

      try {
        if (append) {
          setIsFetchingNextPage(true);
        } else {
          setLoading(true);
          setData([]);
        }

        setError(null);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (append) {
          setData((prev) => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }

        // 检查是否有下一页
        const nextPage = getNextPageParam?.(result);
        setHasNextPage(!!nextPage);
        if (nextPage) {
          setCurrentPage(nextPage);
        }
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [buildUrl, getNextPageParam]
  );

  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchPage(currentPage, true);
  }, [currentPage, hasNextPage, isFetchingNextPage, fetchPage]);

  const refetch = useCallback(async (): Promise<void> => {
    setCurrentPage(initialPageParam);
    await fetchPage(initialPageParam, false);
  }, [initialPageParam, fetchPage]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetchPage(initialPageParam, false);
    }
  }, [options.immediate, initialPageParam, fetchPage]);

  return {
    data,
    loading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  };
}
