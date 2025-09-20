// API 缓存管理器
export interface CacheConfig {
  ttl: number; // 存活时间（毫秒）
  maxSize: number; // 最大缓存条目数
  enableCompression: boolean; // 是否启用压缩
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

export class ApiCache {
  private static instance: ApiCache;
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 默认 5 分钟
      maxSize: 100, // 最大 100 个条目
      enableCompression: false, // 暂时禁用压缩
      ...config,
    };

    this.startCleanupInterval();
  }

  static getInstance(config?: Partial<CacheConfig>): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache(config);
    }
    return ApiCache.instance;
  }

  // 生成缓存键
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  // 计算数据大小（字节）
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // 粗略估算（Unicode 字符 2 字节）
  }

  // 检查条目是否过期
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // 获取缓存数据
  get<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(url, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    // 增加命中次数
    entry.hits++;

    console.log(`🎯 Cache hit: ${key} (hits: ${entry.hits})`);
    return entry.data;
  }

  // 设置缓存数据
  set<T>(
    url: string,
    data: T,
    options?: { ttl?: number; params?: Record<string, any> }
  ): void {
    const key = this.generateKey(url, options?.params);
    const ttl = options?.ttl || this.config.ttl;
    const size = this.calculateSize(data);

    // 检查缓存是否已满
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size,
    };

    this.cache.set(key, entry);
    console.log(`💾 Cache set: ${key} (TTL: ${ttl}ms, Size: ${size} bytes)`);
  }

  // 删除缓存条目
  delete(url: string, params?: Record<string, any>): boolean {
    const key = this.generateKey(url, params);
    const deleted = this.cache.delete(key);

    if (deleted) {
      console.log(`🗑️ Cache deleted: ${key}`);
    }

    return deleted;
  }

  // 清空所有缓存
  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  // 驱逐最少使用的条目
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let keyToEvict = '';

    for (const [key, entry] of this.cache) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        keyToEvict = key;
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      console.log(`🚮 Evicted least used: ${keyToEvict} (hits: ${minHits})`);
    }
  }

  // 清理过期条目
  private cleanup(): void {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`🧼 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // 启动定期清理
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  // 停止定期清理
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // 获取缓存统计信息
  getStats() {
    let totalSize = 0;
    let totalHits = 0;
    const entries = Array.from(this.cache.values());

    entries.forEach((entry) => {
      totalSize += entry.size;
      totalHits += entry.hits;
    });

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalSize,
      totalHits,
      hitRate: entries.length > 0 ? totalHits / entries.length : 0,
      config: this.config,
    };
  }

  // 获取缓存条目详情
  getEntries() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      ...entry,
      expired: this.isExpired(entry),
    }));
  }

  // 更新配置
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Cache config updated:', this.config);
  }
}

// 创建缓存中间件
export class CacheMiddleware {
  private cache: ApiCache;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = ApiCache.getInstance(config);
  }

  // 包装 fetch 函数
  wrapFetch(originalFetch: typeof fetch) {
    return async (
      url: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const urlString = url.toString();
      const method = init?.method || 'GET';

      // 只缓存 GET 请求
      if (method.toUpperCase() !== 'GET') {
        return originalFetch(url, init);
      }

      // 检查缓存
      const cachedData = this.cache.get(urlString);
      if (cachedData) {
        // 返回缓存的响应
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        });
      }

      // 发起实际请求
      const response = await originalFetch(url, init);

      // 只缓存成功的响应
      if (
        response.ok &&
        response.headers.get('content-type')?.includes('application/json')
      ) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();

        // 根据响应头决定 TTL
        const cacheControl = response.headers.get('cache-control');
        let ttl = this.cache.getStats().config.ttl; // 默认 TTL

        if (cacheControl) {
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          if (maxAgeMatch) {
            ttl = parseInt(maxAgeMatch[1]) * 1000; // 转换为毫秒
          }
        }

        this.cache.set(urlString, data, { ttl });
      }

      return response;
    };
  }

  // React Query 集成
  createQueryKey(url: string, params?: Record<string, any>): string[] {
    return [url, params].filter(Boolean);
  }

  // 缓存失效策略
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.getEntries().map((entry) => entry.key)) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });

    console.log(
      `🔄 Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`
    );
  }

  // 预热缓存
  async warmupCache(urls: string[]): Promise<void> {
    const warmupPromises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          this.cache.set(url, data);
        }
      } catch (error) {
        console.warn(`Failed to warmup cache for ${url}:`, error);
      }
    });

    await Promise.all(warmupPromises);
    console.log(`🔥 Cache warmed up for ${urls.length} URLs`);
  }
}

// 导出默认实例
export const apiCache = ApiCache.getInstance();
export const cacheMiddleware = new CacheMiddleware();
