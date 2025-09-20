import { promises as fs } from 'fs';
import path from 'path';
import { generateId } from '@/lib/utils';

export interface SessionInfo {
  id: string;
  agentId: string;
  config: any;
  createdAt: string;
  lastUsedAt: string;
  status?: string;
  metadata?: any;
}

export interface ExecutionRecord {
  id: string;
  agentId?: string;
  workflowId?: string;
  sessionId?: string;
  prompt?: string;
  request?: any;
  result?: any;
  timestamp: string;
  status?: string;
  metadata?: {
    tokensUsed?: number;
    executionTime?: number;
    toolsUsed?: string[];
  };
}

/**
 * 会话存储管理器 - 负责会话的持久化存储
 */
export class SessionStore {
  private configRoot: string;

  constructor(configRoot: string = './config') {
    this.configRoot = configRoot;
  }

  /**
   * 初始化存储目录
   */
  async initialize(): Promise<void> {
    const dirs = [
      'sessions',
      'sessions/active',
      'sessions/archived',
      'executions',
      'executions/current',
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.configRoot, dir), { recursive: true });
    }
  }

  /**
   * 保存会话信息
   */
  async save(session: SessionInfo): Promise<void> {
    await this.initialize();
    
    const filePath = path.join(
      this.configRoot,
      'sessions/active',
      `${session.id}.json`
    );
    
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * 加载会话信息
   */
  async load(sessionId: string): Promise<SessionInfo | null> {
    try {
      // 先从活跃会话中查找
      let filePath = path.join(
        this.configRoot,
        'sessions/active',
        `${sessionId}.json`
      );
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }

      // 如果活跃会话中没有，从归档中查找
      filePath = path.join(
        this.configRoot,
        'sessions/archived',
        `${sessionId}.json`
      );
      
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * 删除会话
   */
  async delete(sessionId: string): Promise<void> {
    const activePath = path.join(
      this.configRoot,
      'sessions/active',
      `${sessionId}.json`
    );
    
    const archivedPath = path.join(
      this.configRoot,
      'sessions/archived',
      `${sessionId}.json`
    );

    try {
      await fs.unlink(activePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    try {
      await fs.unlink(archivedPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  /**
   * 列出所有活跃会话
   */
  async listActiveSessions(): Promise<SessionInfo[]> {
    try {
      await this.initialize();
      const sessionsDir = path.join(this.configRoot, 'sessions/active');
      const files = await fs.readdir(sessionsDir);
      const sessions: SessionInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = path.basename(file, '.json');
          const session = await this.load(sessionId);
          if (session) sessions.push(session);
        }
      }

      return sessions.sort(
        (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * 归档会话
   */
  async archiveSession(sessionId: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) return;

    await this.initialize();
    
    // 保存到归档目录
    const archivedPath = path.join(
      this.configRoot,
      'sessions/archived',
      `${sessionId}.json`
    );
    
    session.status = 'archived';
    await fs.writeFile(archivedPath, JSON.stringify(session, null, 2), 'utf-8');

    // 从活跃目录删除
    const activePath = path.join(
      this.configRoot,
      'sessions/active',
      `${sessionId}.json`
    );
    
    try {
      await fs.unlink(activePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const activeSessions = await this.listActiveSessions();
    const now = Date.now();

    for (const session of activeSessions) {
      const lastUsed = new Date(session.lastUsedAt).getTime();
      if (now - lastUsed > maxAge) {
        await this.archiveSession(session.id);
      }
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(): Promise<any> {
    const activeSessions = await this.listActiveSessions();
    
    const stats = {
      totalActive: activeSessions.length,
      byAgent: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      oldestSession: null as string | null,
      newestSession: null as string | null,
    };

    for (const session of activeSessions) {
      // 按Agent统计
      stats.byAgent[session.agentId] = (stats.byAgent[session.agentId] || 0) + 1;
      
      // 按状态统计
      const status = session.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    }

    if (activeSessions.length > 0) {
      const sorted = activeSessions.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      stats.oldestSession = sorted[0].id;
      stats.newestSession = sorted[sorted.length - 1].id;
    }

    return stats;
  }
}

/**
 * 执行记录存储管理器
 */
export class ExecutionStore {
  private configRoot: string;

  constructor(configRoot: string = './config') {
    this.configRoot = configRoot;
  }

  /**
   * 初始化存储目录
   */
  async initialize(): Promise<void> {
    const dirs = [
      'executions',
      'executions/current',
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.configRoot, dir), { recursive: true });
    }
  }

  /**
   * 保存执行记录
   */
  async saveExecutionRecord(record: ExecutionRecord): Promise<void> {
    await this.initialize();
    
    const date = new Date().toISOString().slice(0, 7); // YYYY-MM
    const dirPath = path.join(this.configRoot, 'executions', date);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${record.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');

    // 如果是活跃执行，也保存到 current 目录
    if (record.status && ['pending', 'planning', 'running', 'paused'].includes(record.status)) {
      const currentPath = path.join(
        this.configRoot,
        'executions/current',
        `${record.id}.json`
      );
      await fs.writeFile(currentPath, JSON.stringify(record, null, 2), 'utf-8');
    } else {
      // 完成后从 current 目录删除
      try {
        const currentPath = path.join(
          this.configRoot,
          'executions/current',
          `${record.id}.json`
        );
        await fs.unlink(currentPath);
      } catch (error: any) {
        // 忽略文件不存在的错误
        if (error.code !== 'ENOENT') {
          console.error('Error removing execution from current:', error);
        }
      }
    }
  }

  /**
   * 加载执行记录
   */
  async loadExecutionRecord(executionId: string): Promise<ExecutionRecord | null> {
    try {
      // 先从 current 目录查找活跃执行
      const currentPath = path.join(
        this.configRoot,
        'executions/current',
        `${executionId}.json`
      );
      
      try {
        const content = await fs.readFile(currentPath, 'utf-8');
        return JSON.parse(content);
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }

      // 如果 current 目录没有，搜索历史记录
      const executionsDir = path.join(this.configRoot, 'executions');
      const monthDirs = await fs.readdir(executionsDir);

      for (const monthDir of monthDirs) {
        if (monthDir === 'current') continue;

        try {
          const filePath = path.join(executionsDir, monthDir, `${executionId}.json`);
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content);
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error;
          continue;
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }

    return null;
  }

  /**
   * 列出当前活跃的执行
   */
  async listActiveExecutions(): Promise<ExecutionRecord[]> {
    try {
      await this.initialize();
      const currentDir = path.join(this.configRoot, 'executions/current');
      const files = await fs.readdir(currentDir);
      const executions: ExecutionRecord[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const executionId = path.basename(file, '.json');
          const execution = await this.loadExecutionRecord(executionId);
          if (execution) executions.push(execution);
        }
      }

      return executions.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * 获取执行统计信息
   */
  async getExecutionStats(): Promise<any> {
    const activeExecutions = await this.listActiveExecutions();
    
    const stats = {
      totalActive: activeExecutions.length,
      byStatus: {} as Record<string, number>,
      byAgent: {} as Record<string, number>,
      byWorkflow: {} as Record<string, number>,
      totalTokensUsed: 0,
      avgExecutionTime: 0,
    };

    let totalExecutionTime = 0;
    let executionsWithTime = 0;

    for (const execution of activeExecutions) {
      // 按状态统计
      const status = execution.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // 按Agent统计
      if (execution.agentId) {
        stats.byAgent[execution.agentId] = (stats.byAgent[execution.agentId] || 0) + 1;
      }
      
      // 按工作流统计
      if (execution.workflowId) {
        stats.byWorkflow[execution.workflowId] = (stats.byWorkflow[execution.workflowId] || 0) + 1;
      }

      // 统计tokens使用
      if (execution.metadata?.tokensUsed) {
        stats.totalTokensUsed += execution.metadata.tokensUsed;
      }

      // 统计执行时间
      if (execution.metadata?.executionTime) {
        totalExecutionTime += execution.metadata.executionTime;
        executionsWithTime++;
      }
    }

    if (executionsWithTime > 0) {
      stats.avgExecutionTime = totalExecutionTime / executionsWithTime;
    }

    return stats;
  }
}

// 全局存储实例
let globalSessionStore: SessionStore | null = null;
let globalExecutionStore: ExecutionStore | null = null;

/**
 * 获取全局会话存储实例
 */
export function getSessionStore(): SessionStore {
  if (!globalSessionStore) {
    globalSessionStore = new SessionStore();
  }
  return globalSessionStore;
}

/**
 * 获取全局执行存储实例
 */
export function getExecutionStore(): ExecutionStore {
  if (!globalExecutionStore) {
    globalExecutionStore = new ExecutionStore();
  }
  return globalExecutionStore;
}
