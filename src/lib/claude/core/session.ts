import { generateId } from '@/lib/utils';

export interface ClaudeSession {
  id: string;
  agentId: string;
  createdAt: Date;
  lastUsedAt: Date;
  inUse: boolean;
  status: 'active' | 'expired' | 'error';
  metadata: Record<string, any>;
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };
}

export interface SessionInfo {
  id: string;
  agentId: string;
  config: any;
  createdAt: string;
  lastUsedAt: string;
  status?: string;
  metadata?: any;
}

/**
 * 会话池管理器 - 用于复用Claude Code SDK会话，提高性能
 */
export class SessionPool {
  private pools: Map<string, ClaudeSession[]> = new Map();
  private maxPoolSize = 5;
  private sessionTimeout = 30 * 60 * 1000; // 30分钟

  /**
   * 获取可用会话
   */
  async getSession(agentId: string): Promise<ClaudeSession> {
    const pool = this.pools.get(agentId) || [];

    // 查找可用会话
    const availableSession = pool.find(
      (session) =>
        !session.inUse && Date.now() - session.lastUsedAt.getTime() < this.sessionTimeout
    );

    if (availableSession) {
      availableSession.inUse = true;
      availableSession.lastUsedAt = new Date();
      return availableSession;
    }

    // 创建新会话
    const newSession = await this.createSession(agentId);
    pool.push(newSession);

    // 限制池大小
    if (pool.length > this.maxPoolSize) {
      const oldSession = pool.shift();
      if (oldSession) {
        await this.closeSession(oldSession);
      }
    }

    this.pools.set(agentId, pool);
    return newSession;
  }

  /**
   * 释放会话
   */
  releaseSession(session: ClaudeSession): void {
    session.inUse = false;
    session.lastUsedAt = new Date();
  }

  /**
   * 创建新会话
   */
  private async createSession(agentId: string): Promise<ClaudeSession> {
    const sessionId = `claude-session-${agentId}-${Date.now()}`;
    
    return {
      id: sessionId,
      agentId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      inUse: true,
      status: 'active',
      metadata: {},
    };
  }

  /**
   * 关闭会话
   */
  private async closeSession(session: ClaudeSession): Promise<void> {
    session.status = 'expired';
    session.inUse = false;
    // 这里可以添加实际的会话清理逻辑
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    
    for (const [agentId, pool] of this.pools) {
      const validSessions = pool.filter(session => {
        const isExpired = now - session.lastUsedAt.getTime() > this.sessionTimeout;
        if (isExpired && !session.inUse) {
          this.closeSession(session);
          return false;
        }
        return true;
      });
      
      this.pools.set(agentId, validSessions);
    }
  }

  /**
   * 获取会话池统计信息
   */
  getPoolStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [agentId, pool] of this.pools) {
      stats[agentId] = {
        total: pool.length,
        active: pool.filter(s => s.inUse).length,
        available: pool.filter(s => !s.inUse && s.status === 'active').length,
      };
    }
    
    return stats;
  }

  /**
   * 处理会话错误
   */
  async handleSessionError(sessionId: string, error: Error): Promise<void> {
    for (const pool of this.pools.values()) {
      const session = pool.find(s => s.id === sessionId);
      if (session) {
        session.status = 'error';
        session.lastError = {
          message: error.message,
          timestamp: new Date(),
          stack: error.stack,
        };
        session.inUse = false;
        break;
      }
    }
  }
}

// 全局会话池实例
let globalSessionPool: SessionPool | null = null;

/**
 * 获取全局会话池实例
 */
export function getSessionPool(): SessionPool {
  if (!globalSessionPool) {
    globalSessionPool = new SessionPool();
    
    // 定期清理过期会话
    setInterval(() => {
      globalSessionPool?.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }
  
  return globalSessionPool;
}

/**
 * 会话管理器 - 负责会话的持久化和恢复
 */
export class SessionManager {
  private sessionStore: Map<string, SessionInfo> = new Map();

  /**
   * 创建新会话
   */
  async createSession(executionId: string): Promise<string> {
    const sessionId = `claude-session-${executionId}-${Date.now()}`;

    const sessionInfo: SessionInfo = {
      id: sessionId,
      agentId: executionId,
      config: {},
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: 'active',
      metadata: {},
    };

    this.sessionStore.set(sessionId, sessionInfo);
    return sessionId;
  }

  /**
   * 获取会话信息
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.sessionStore.get(sessionId);
    
    if (session) {
      session.lastUsedAt = new Date().toISOString();
      this.sessionStore.set(sessionId, session);
    }

    return session || null;
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    this.sessionStore.delete(sessionId);
  }

  /**
   * 处理会话错误
   */
  async handleError(sessionId: string, error: Error): Promise<void> {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.status = 'error';
      session.metadata = {
        ...session.metadata,
        lastError: {
          message: error.message,
          timestamp: new Date().toISOString(),
          stack: error.stack,
        },
      };
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * 更新会话信息
   */
  private async updateSession(session: SessionInfo): Promise<void> {
    this.sessionStore.set(session.id, session);
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessionStore.values()).filter(
      session => session.status === 'active'
    );
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessionStore) {
      const lastUsed = new Date(session.lastUsedAt).getTime();
      if (now - lastUsed > maxAge) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.closeSession(sessionId);
    }
  }
}
