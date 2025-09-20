'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // 数据缓存时间：5分钟
          staleTime: 5 * 60 * 1000,
          // 缓存垃圾回收时间：10分钟
          gcTime: 10 * 60 * 1000,
          // 重试次数
          retry: 2,
          // 重试延迟
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          // 网络恢复时重新获取
          refetchOnWindowFocus: false,
          // 网络重连时重新获取
          refetchOnReconnect: true,
        },
        mutations: {
          // 重试次数
          retry: 1,
          // 重试延迟
          retryDelay: 1000,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
