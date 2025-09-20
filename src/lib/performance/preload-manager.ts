import { preloadConfig } from '@/components/lazy';

export class PreloadManager {
  private static instance: PreloadManager;
  private preloadedComponents = new Set<string>();
  private preloadQueue: Array<{
    priority: number;
    loader: () => Promise<any>;
    name: string;
  }> = [];

  private constructor() {}

  static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  // 初始化预加载策略
  initialize() {
    this.schedulePreloading();
    this.setupEventListeners();
  }

  // 安排预加载任务
  private schedulePreloading() {
    // 高优先级组件立即预加载
    preloadConfig.highPriority.forEach((loader, index) => {
      this.addToQueue({
        priority: 1,
        loader,
        name: `high-priority-${index}`,
      });
    });

    // 中优先级组件在空闲时预加载
    preloadConfig.mediumPriority.forEach((loader, index) => {
      this.addToQueue({
        priority: 2,
        loader,
        name: `medium-priority-${index}`,
      });
    });

    // 低优先级组件延迟预加载
    preloadConfig.lowPriority.forEach((loader, index) => {
      this.addToQueue({
        priority: 3,
        loader,
        name: `low-priority-${index}`,
      });
    });

    this.processQueue();
  }

  // 添加到预加载队列
  private addToQueue(item: {
    priority: number;
    loader: () => Promise<any>;
    name: string;
  }) {
    this.preloadQueue.push(item);
    this.preloadQueue.sort((a, b) => a.priority - b.priority);
  }

  // 处理预加载队列
  private async processQueue() {
    while (this.preloadQueue.length > 0) {
      const item = this.preloadQueue.shift();
      if (!item || this.preloadedComponents.has(item.name)) continue;

      try {
        if (item.priority === 1) {
          // 高优先级立即加载
          await this.preloadComponent(item.loader, item.name);
        } else if (item.priority === 2) {
          // 中优先级在空闲时加载
          await this.preloadOnIdle(item.loader, item.name);
        } else {
          // 低优先级延迟加载
          await this.preloadWithDelay(item.loader, item.name, 2000);
        }
      } catch (error) {
        console.warn(`Failed to preload component ${item.name}:`, error);
      }
    }
  }

  // 预加载组件
  private async preloadComponent(
    loader: () => Promise<any>,
    name: string
  ): Promise<void> {
    if (this.preloadedComponents.has(name)) return;

    try {
      await loader();
      this.preloadedComponents.add(name);
      console.log(`✅ Preloaded component: ${name}`);
    } catch (error) {
      console.warn(`❌ Failed to preload component ${name}:`, error);
    }
  }

  // 在空闲时预加载
  private preloadOnIdle(
    loader: () => Promise<any>,
    name: string
  ): Promise<void> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          await this.preloadComponent(loader, name);
          resolve();
        });
      } else {
        // 后备方案
        setTimeout(async () => {
          await this.preloadComponent(loader, name);
          resolve();
        }, 100);
      }
    });
  }

  // 延迟预加载
  private preloadWithDelay(
    loader: () => Promise<any>,
    name: string,
    delay: number
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        await this.preloadComponent(loader, name);
        resolve();
      }, delay);
    });
  }

  // 设置事件监听器
  private setupEventListeners() {
    // 鼠标悬停预加载
    this.setupHoverPreloading();

    // 滚动预加载
    this.setupScrollPreloading();

    // 网络状态监听
    this.setupNetworkAwarePreloading();
  }

  // 鼠标悬停预加载
  private setupHoverPreloading() {
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const preloadHint = target.getAttribute('data-preload');

      if (preloadHint && !this.preloadedComponents.has(preloadHint)) {
        this.triggerRoutePreload(preloadHint);
      }
    });
  }

  // 滚动预加载
  private setupScrollPreloading() {
    let scrollTimeout: NodeJS.Timeout;

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.checkScrollBasedPreloading();
      }, 150);
    });
  }

  // 检查滚动基础的预加载
  private checkScrollBasedPreloading() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercentage = scrollY / (documentHeight - windowHeight);

    // 当用户滚动到页面 70% 时，开始预加载下一个可能的页面
    if (scrollPercentage > 0.7) {
      this.preloadNextLikelyComponents();
    }
  }

  // 预加载下一个可能的组件
  private preloadNextLikelyComponents() {
    const currentPath = window.location.pathname;

    // 根据当前路径预测用户可能访问的下一个页面
    const nextComponents = this.predictNextComponents(currentPath);

    nextComponents.forEach((componentName) => {
      if (!this.preloadedComponents.has(componentName)) {
        this.preloadedComponents.add(componentName);
      }
    });
  }

  // 预测下一个组件
  private predictNextComponents(currentPath: string): string[] {
    const predictions: Record<string, string[]> = {
      '/': ['agents-list', 'workflows-list'],
      '/agents': ['agent-create', 'agent-templates'],
      '/workflows': ['workflow-create', 'workflow-templates'],
      '/agents/create': ['agent-chat'],
      '/workflows/create': ['workflow-edit'],
    };

    return predictions[currentPath] || [];
  }

  // 网络感知预加载
  private setupNetworkAwarePreloading() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      // 在快速网络连接时更积极地预加载
      if (
        connection.effectiveType === '4g' ||
        connection.effectiveType === '3g'
      ) {
        this.enableAggressivePreloading();
      } else {
        this.enableConservativePreloading();
      }

      connection.addEventListener('change', () => {
        if (
          connection.effectiveType === '4g' ||
          connection.effectiveType === '3g'
        ) {
          this.enableAggressivePreloading();
        } else {
          this.enableConservativePreloading();
        }
      });
    }
  }

  // 积极预加载模式
  private enableAggressivePreloading() {
    console.log('🚀 Enabling aggressive preloading mode');
    // 预加载更多组件
    this.processQueue();
  }

  // 保守预加载模式
  private enableConservativePreloading() {
    console.log('🐌 Enabling conservative preloading mode');
    // 只预加载高优先级组件
    this.preloadQueue = this.preloadQueue.filter((item) => item.priority === 1);
  }

  // 手动触发路由预加载
  private triggerRoutePreload(route: string) {
    // 这里可以根据路由名称预加载对应的组件
    console.log(`🔮 Triggering preload for route: ${route}`);
  }

  // 获取预加载统计信息
  getStats() {
    return {
      preloadedCount: this.preloadedComponents.size,
      queueLength: this.preloadQueue.length,
      preloadedComponents: Array.from(this.preloadedComponents),
    };
  }

  // 清理预加载管理器
  cleanup() {
    this.preloadQueue = [];
    this.preloadedComponents.clear();
  }
}

// 导出单例实例
export const preloadManager = PreloadManager.getInstance();
