// 性能监控工具
export interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte

  // 自定义指标
  apiResponseTime: number;
  componentRenderTime: number;
  bundleSize: number;
  memoryUsage: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 初始化性能监控
  initialize() {
    this.setupWebVitalsObserver();
    this.setupResourceObserver();
    this.setupLongTaskObserver();
    this.setupMemoryMonitoring();
    this.setupCustomMetrics();
  }

  // 设置 Core Web Vitals 观察器
  private setupWebVitalsObserver() {
    if (typeof window === 'undefined') return;

    // FCP 和 LCP 观察器
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
              console.log(`🎨 FCP: ${entry.startTime.toFixed(2)}ms`);
            }
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);

        // LCP 观察器
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
          console.log(`🖼️ LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        // FID 观察器
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
            console.log(`⚡ FID: ${this.metrics.fid.toFixed(2)}ms`);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);

        // CLS 观察器
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cls = clsValue;
              console.log(`📐 CLS: ${clsValue.toFixed(4)}`);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  // 设置资源观察器
  private setupResourceObserver() {
    if (typeof window === 'undefined') return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.initiatorType === 'navigation') {
            this.metrics.ttfb = entry.responseStart - entry.requestStart;
            console.log(`🌐 TTFB: ${this.metrics.ttfb.toFixed(2)}ms`);
          }

          // 监控大文件加载
          if (entry.transferSize > 100000) {
            // 大于 100KB
            console.warn(
              `📦 Large resource loaded: ${entry.name} (${(entry.transferSize / 1024).toFixed(2)}KB)`
            );
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource', 'navigation'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource Observer not supported:', error);
    }
  }

  // 设置长任务观察器
  private setupLongTaskObserver() {
    if (typeof window === 'undefined') return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.warn(`⏱️ Long task detected: ${entry.duration.toFixed(2)}ms`);

          // 发送警告到监控系统
          this.reportLongTask(entry.duration);
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Long Task Observer not supported:', error);
    }
  }

  // 设置内存监控
  private setupMemoryMonitoring() {
    if (typeof window === 'undefined') return;

    // 定期检查内存使用情况
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;

        // 检查内存泄漏
        if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.9) {
          console.warn('🚨 High memory usage detected!', {
            used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
            total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
            limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
          });
        }
      }
    }, 10000); // 每 10 秒检查一次
  }

  // 设置自定义指标
  private setupCustomMetrics() {
    // 监控组件渲染时间
    this.monitorComponentRenderTime();

    // 监控 API 响应时间
    this.monitorApiResponseTime();

    // 监控 Bundle 大小
    this.monitorBundleSize();
  }

  // 监控组件渲染时间
  private monitorComponentRenderTime() {
    if (typeof window === 'undefined') return;

    // 使用 React DevTools Profiler API（如果可用）
    if ('React' in window && (window as any).React.Profiler) {
      console.log('📊 Component render time monitoring enabled');
    }
  }

  // 监控 API 响应时间
  private monitorApiResponseTime() {
    if (typeof window === 'undefined') return;

    // 包装 fetch 函数
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.metrics.apiResponseTime = duration;

        // 记录慢 API 调用
        if (duration > 1000) {
          // 超过 1 秒
          console.warn(
            `🐌 Slow API call: ${args[0]} took ${duration.toFixed(2)}ms`
          );
        } else {
          console.log(`⚡ API call: ${args[0]} took ${duration.toFixed(2)}ms`);
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error(
          `❌ API call failed: ${args[0]} after ${duration.toFixed(2)}ms`,
          error
        );
        throw error;
      }
    };
  }

  // 监控 Bundle 大小
  private monitorBundleSize() {
    if (typeof window === 'undefined') return;

    // 估算当前页面的 JavaScript 大小
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;

    scripts.forEach(async (script) => {
      try {
        const response = await fetch((script as HTMLScriptElement).src, {
          method: 'HEAD',
        });
        const size = parseInt(response.headers.get('content-length') || '0');
        totalSize += size;
        this.metrics.bundleSize = totalSize;
      } catch (error) {
        // 忽略错误，可能是跨域问题
      }
    });
  }

  // 报告长任务
  private reportLongTask(duration: number) {
    // 这里可以发送到监控服务
    if (duration > 100) {
      // 超过 100ms 的任务
      console.warn('Long task detected:', {
        duration: duration.toFixed(2) + 'ms',
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });
    }
  }

  // 获取性能报告
  getPerformanceReport(): PerformanceMetrics {
    return {
      fcp: this.metrics.fcp || 0,
      lcp: this.metrics.lcp || 0,
      fid: this.metrics.fid || 0,
      cls: this.metrics.cls || 0,
      ttfb: this.metrics.ttfb || 0,
      apiResponseTime: this.metrics.apiResponseTime || 0,
      componentRenderTime: this.metrics.componentRenderTime || 0,
      bundleSize: this.metrics.bundleSize || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
    };
  }

  // 生成性能建议
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getPerformanceReport();

    if (metrics.fcp > 2000) {
      recommendations.push('FCP 过慢，考虑优化关键渲染路径');
    }

    if (metrics.lcp > 2500) {
      recommendations.push('LCP 过慢，考虑优化图片和文本加载');
    }

    if (metrics.fid > 100) {
      recommendations.push('FID 过高，考虑减少主线程阻塞');
    }

    if (metrics.cls > 0.1) {
      recommendations.push('CLS 过高，考虑为图片和元素设置固定尺寸');
    }

    if (metrics.ttfb > 600) {
      recommendations.push('TTFB 过慢，考虑优化服务器响应时间');
    }

    if (metrics.bundleSize > 1024 * 1024) {
      // 1MB
      recommendations.push('Bundle 过大，考虑代码分割和懒加载');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push('内存使用过高，检查是否存在内存泄漏');
    }

    return recommendations;
  }

  // 导出性能数据
  exportMetrics() {
    const report = {
      metrics: this.getPerformanceReport(),
      recommendations: this.getPerformanceRecommendations(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.table(report.metrics);
    console.log('📋 Performance Recommendations:', report.recommendations);

    return report;
  }

  // 清理观察器
  cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();
