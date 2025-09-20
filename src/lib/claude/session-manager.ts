// Claude Code SDK 会话管理器
import { ClaudeSessionInfo, ClaudeMessage } from './types';
import { generateId } from '@/utils';

export class ClaudeSessionManager {
  private sessions: Map<string, ClaudeSessionInfo> = new Map();
  private sessionMessages: Map<string, ClaudeMessage[]> = new Map();
  private maxSessions: number = 100;
  private sessionTimeoutMs: number = 60 * 60 * 1000; // 1小时

  constructor(maxSessions?: number, sessionTimeoutMs?: number) {
    if (maxSessions) this.maxSessions = maxSessions;
    if (sessionTimeoutMs) this.sessionTimeoutMs = sessionTimeoutMs;

    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  async createSession(executionId: string): Promise<string> {
    const sessionId = `claude-session-${executionId}-${generateId()}`;

    const sessionInfo: ClaudeSessionInfo = {
      id: sessionId,
      executionId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      status: 'active',
      metadata: {},
    };

    this.sessions.set(sessionId, sessionInfo);
    this.sessionMessages.set(sessionId, []);

    // 如果会话数量超过限制，清理最旧的会话
    if (this.sessions.size > this.maxSessions) {
      await this.cleanupOldestSessions(10);
    }

    return sessionId;
  }

  async getSession(sessionId: string): Promise<ClaudeSessionInfo | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // 检查是否过期
    if (this.isSessionExpired(session)) {
      await this.closeSession(sessionId);
      return null;
    }

    // 更新最后使用时间
    session.lastUsedAt = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  async addMessage(sessionId: string, message: ClaudeMessage): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found or expired`);
    }

    const messages = this.sessionMessages.get(sessionId) || [];

    // 添加时间戳
    message.metadata = {
      ...message.metadata,
      timestamp: new Date(),
    };

    messages.push(message);

    // 限制消息历史长度，避免内存过度使用
    const maxMessages = 50;
    if (messages.length > maxMessages) {
      messages.splice(0, messages.length - maxMessages);
    }

    this.sessionMessages.set(sessionId, messages);
  }

  async getMessages(sessionId: string): Promise<ClaudeMessage[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found or expired`);
    }

    return this.sessionMessages.get(sessionId) || [];
  }

  async clearMessages(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found or expired`);
    }

    this.sessionMessages.set(sessionId, []);
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found or expired`);
    }

    session.metadata = {
      ...session.metadata,
      ...metadata,
    };

    this.sessions.set(sessionId, session);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.lastUsedAt = new Date();
    }

    this.sessions.delete(sessionId);
    this.sessionMessages.delete(sessionId);
  }

  async handleError(sessionId: string, error: Error): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'error';
      session.lastError = {
        message: error.message,
        timestamp: new Date(),
        stack: error.stack,
      };
      session.lastUsedAt = new Date();

      this.sessions.set(sessionId, session);
    }
  }

  async getActiveSessionsForExecution(
    executionId: string
  ): Promise<ClaudeSessionInfo[]> {
    const activeSessions: ClaudeSessionInfo[] = [];

    for (const session of this.sessions.values()) {
      if (session.executionId === executionId && session.status === 'active') {
        activeSessions.push(session);
      }
    }

    return activeSessions;
  }

  async getSessionStats(): Promise<{
    total: number;
    active: number;
    error: number;
    completed: number;
    oldestSessionAge: number; // in minutes
  }> {
    let active = 0;
    let error = 0;
    let completed = 0;
    let oldestTimestamp = Date.now();

    for (const session of this.sessions.values()) {
      switch (session.status) {
        case 'active':
          active++;
          break;
        case 'error':
          error++;
          break;
        case 'completed':
          completed++;
          break;
      }

      const sessionTime = session.createdAt.getTime();
      if (sessionTime < oldestTimestamp) {
        oldestTimestamp = sessionTime;
      }
    }

    const oldestSessionAge =
      this.sessions.size > 0
        ? Math.floor((Date.now() - oldestTimestamp) / (1000 * 60))
        : 0;

    return {
      total: this.sessions.size,
      active,
      error,
      completed,
      oldestSessionAge,
    };
  }

  private isSessionExpired(session: ClaudeSessionInfo): boolean {
    const now = Date.now();
    const lastUsed = session.lastUsedAt.getTime();
    return now - lastUsed > this.sessionTimeoutMs;
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.closeSession(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(
        `Cleaned up ${expiredSessions.length} expired Claude sessions`
      );
    }
  }

  private async cleanupOldestSessions(count: number): Promise<void> {
    const sessions = Array.from(this.sessions.entries())
      .sort(([, a], [, b]) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime())
      .slice(0, count);

    for (const [sessionId] of sessions) {
      await this.closeSession(sessionId);
    }

    console.log(`Cleaned up ${sessions.length} oldest Claude sessions`);
  }

  // 用于开发和调试
  async debugSessionInfo(): Promise<Record<string, any>> {
    const stats = await this.getSessionStats();
    const sessions = Array.from(this.sessions.entries()).map(
      ([id, session]) => ({
        id,
        executionId: session.executionId,
        status: session.status,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        messageCount: this.sessionMessages.get(id)?.length || 0,
      })
    );

    return {
      stats,
      sessions,
    };
  }
}
