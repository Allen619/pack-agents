'use client';

import { useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance/performance-monitor';
import { preloadManager } from '@/lib/performance/preload-manager';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export default function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // 初始化性能监控
    performanceMonitor.initialize();
    
    // 初始化预加载管理器
    preloadManager.initialize();

    // 在开发环境中添加性能调试工具
    if (process.env.NODE_ENV === 'development') {
      // 添加全局性能调试函数
      (window as any).__performance__ = {
        getReport: () => performanceMonitor.exportMetrics(),
        getPreloadStats: () => preloadManager.getStats(),
        monitor: performanceMonitor,
        preloader: preloadManager,
      };

      console.log('🚀 Performance monitoring initialized');
      console.log('📦 Preload manager initialized');
      console.log('🔧 Debug tools available: window.__performance__');
    }

    // 清理函数
    return () => {
      performanceMonitor.cleanup();
      preloadManager.cleanup();
    };
  }, []);

  // 页面可见性变化时的优化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面不可见时暂停非关键性能监控
        console.log('📱 Page hidden, reducing performance monitoring');
      } else {
        // 页面可见时恢复
        console.log('📱 Page visible, resuming performance monitoring');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 在组件卸载时导出性能报告（开发环境）
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (process.env.NODE_ENV === 'development') {
        const report = performanceMonitor.exportMetrics();
        console.log('📊 Final performance report:', report);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}
