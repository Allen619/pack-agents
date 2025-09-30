import React, { Suspense } from 'react';
import { Spin } from 'antd';

export const LoadingSpinner: React.FC<{ tip?: string; size?: 'small' | 'default' | 'large' }> = ({
  tip = '加载中...',
  size = 'default',
}) => (
  <div className="flex flex-col items-center justify-center p-8 gap-2 text-center">
    <Spin size={size} />
    {tip ? <span className="text-sm text-gray-500">{tip}</span> : null}
  </div>
);

// 创建懒加载组件的高阶函数
export function withLazyLoading<T extends React.ComponentType<any>>(
  lazyComponent: () => Promise<{ default: T }>,
  fallbackComponent?: React.ComponentType
) {
  const LazyComponent = React.lazy(lazyComponent);
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const DefaultFallback = () => (
      <LoadingSpinner size="large" tip="加载中..." />
    );

    const FallbackComponent = fallbackComponent || DefaultFallback;

    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    );
  });
}

// 页面级别的懒加载封装
export function withPageLazyLoading<T extends React.ComponentType<any>>(
  lazyComponent: () => Promise<{ default: T }>
) {
  const PageFallback = () => (
    <LoadingSpinner size="large" tip="页面加载中..." />
  );

  return withLazyLoading(lazyComponent, PageFallback);
}

// 组件级别的懒加载封装
export function withComponentLazyLoading<T extends React.ComponentType<any>>(
  lazyComponent: () => Promise<{ default: T }>
) {
  const ComponentFallback = () => (
    <LoadingSpinner tip="组件加载中..." />
  );

  return withLazyLoading(lazyComponent, ComponentFallback);
}

// 预加载函数
export function preloadComponent(lazyComponent: () => Promise<any>) {
  // 立即调用懒加载函数以预加载组件
  lazyComponent();
}

// 路由级别的懒加载
export const createLazyRoute = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>
) => {
  return withPageLazyLoading(importFunc);
};

// 常用的 Fallback 组件
export const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    <div className="h-32 bg-gray-200 rounded"></div>
  </div>
);

// 代码分割的预加载策略
export class PreloadStrategy {
  private static preloadedComponents = new Set<string>();

  // 在路由变化时预加载
  static preloadOnHover(componentName: string, importFunc: () => Promise<any>) {
    if (!this.preloadedComponents.has(componentName)) {
      this.preloadedComponents.add(componentName);
      importFunc();
    }
  }

  // 在用户滚动到特定位置时预加载
  static preloadOnScroll(componentName: string, importFunc: () => Promise<any>, threshold = 0.1) {
    if (this.preloadedComponents.has(componentName)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.preloadedComponents.add(componentName);
            importFunc();
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    // 创建一个触发元素
    const triggerElement = document.createElement('div');
    triggerElement.style.position = 'absolute';
    triggerElement.style.top = '80vh';
    triggerElement.style.height = '1px';
    triggerElement.style.width = '1px';
    document.body.appendChild(triggerElement);
    observer.observe(triggerElement);
  }

  // 在空闲时间预加载
  static preloadOnIdle(componentName: string, importFunc: () => Promise<any>) {
    if (this.preloadedComponents.has(componentName)) return;

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadedComponents.add(componentName);
        importFunc();
      });
    } else {
      // 后备方案
      setTimeout(() => {
        this.preloadedComponents.add(componentName);
        importFunc();
      }, 1000);
    }
  }
}


