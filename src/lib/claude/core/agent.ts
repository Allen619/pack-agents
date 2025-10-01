import { query } from '@anthropic-ai/claude-code';
import { generateId } from '@/lib/utils';
import { ConfigManager } from '@/lib/storage/config-manager';
import { MCPProvider } from '../tools/mcp-provider';
import { SessionStore } from '../../storage/session-store';

export interface ClaudeAgentConfig {
  id: string;
  name: string;
  description: string;
  role: 'main' | 'sub' | 'synthesis';

  // Claude Code SDK 核心配置
  claudeConfig: {
    model: 'claude-sonnet-4-20250514' | 'claude-haiku-20250514';
    systemPrompt: string;
    allowedTools: Array<'Read' | 'Edit' | 'Write' | 'Glob' | 'Grep' | 'Bash'>;
    mcpServers?: Record<string, MCPServerConfig>;
    maxTurns: number;
    temperature?: number;
  };

  // 执行上下文
  context: {
    knowledgeBasePaths: string[];
    workingDirectory: string;
    environmentVariables?: Record<string, string>;
  };

  // 会话管理
  sessionConfig: {
    persistent: boolean;
    timeout: number;
    resumable: boolean;
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    tags: string[];
  };
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  description?: string;
  tags?: string[];
  providers?: string[];
  supportedModels?: string[];
  status?: 'active' | 'disabled';
  tools?: Array<{ name: string; description?: string }>;
}

export interface ExecutionOptions {
  onProgress?: (progress: AgentProgress) => void;
  timeout?: number;
  enableCache?: boolean;
}

export interface AgentProgress {
  type: string;
  content: any;
  timestamp: string;
}

export interface AgentResult {
  success: boolean;
  results?: any[];
  sessionId?: string;
  metadata?: {
    tokensUsed?: number;
    executionTime?: number;
    toolsUsed?: string[];
  };
  error?: {
    message: string;
    code: string;
    sessionId?: string;
    details?: any;
  };
}

export interface AgentMessage {
  type: string;
  content: any;
  agentId: string;
  sessionId: string;
  timestamp: string;
}

export interface SessionInfo {
  id: string;
  agentId: string;
  config: ClaudeAgentConfig;
  createdAt: string;
  lastUsedAt: string;
  status?: string;
  metadata?: any;
}

// 新的 Agent 实现类
export class ClaudeAgent {
  private sessionId?: string;
  private config: ClaudeAgentConfig;
  private mcpProvider: MCPProvider;
  private configManager = new ConfigManager();
  private globalMcpLoaded = false;

  constructor(config: ClaudeAgentConfig) {
    this.config = config;
    this.mcpProvider = new MCPProvider(config.claudeConfig.mcpServers);
  }

  private async ensureGlobalMcpServers(): Promise<void> {
    if (this.globalMcpLoaded) {
      return;
    }

    try {
      const registry = await this.configManager.listMcpServers();
      const model = this.config.claudeConfig.model;

      registry
        .filter((server) => server.status !== 'disabled')
        .filter((server) => {
          if (!server.providers || server.providers.length === 0) {
            return true;
          }
          return server.providers.includes('claude');
        })
        .filter((server) => {
          if (!server.supportedModels || server.supportedModels.length === 0) {
            return true;
          }
          return server.supportedModels.includes(model);
        })
        .forEach((server) => {
          if (this.mcpProvider.hasServer(server.id)) {
            return;
          }

          this.mcpProvider.registerServer(server.id, {
            name: server.name,
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            timeout: server.timeout,
            description: server.description,
            tags: server.tags,
            providers: server.providers,
            supportedModels: server.supportedModels,
            status: server.status,
            tools: server.tools,
          });
        });

      this.globalMcpLoaded = true;
    } catch (error) {
      console.warn('加载全局 MCP 注册表失败:', error);
    }
  }

  // 核心执行方法 - 直接使用 Claude Code SDK
  async execute(
    prompt: string,
    options?: ExecutionOptions
  ): Promise<AgentResult> {
    try {
      // 创建或恢复会话
      await this.ensureGlobalMcpServers();
      const sessionId = await this.getOrCreateSession();

      // 使用 Claude Code SDK 的 query 方法
      const results: any[] = [];
      const startTime = Date.now();

      for await (const message of query({
        prompt,
        options: {
          model: this.config.claudeConfig.model,
          allowedTools: this.config.claudeConfig.allowedTools,
          maxTurns: this.config.claudeConfig.maxTurns,
          resume: sessionId,
          mcpServers: this.mcpProvider.getConfig(),
        },
      })) {
        if (message.type === 'result') {
          results.push(message.result);
        }

        // 实时进度反馈
        if (options?.onProgress) {
          options.onProgress({
            type: message.type,
            content: message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return {
        success: true,
        results,
        sessionId,
        metadata: {
          tokensUsed: this.calculateTokens(results),
          executionTime: Date.now() - startTime,
          toolsUsed: this.extractToolsUsed(results),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'CLAUDE_EXECUTION_ERROR',
          details: error,
        },
      };
    }
  }

  // 流式执行（推荐模式）
  async *executeStream(
    prompt: string | AsyncGenerator<any>
  ): AsyncGenerator<AgentMessage> {
    await this.ensureGlobalMcpServers();
    const sessionId = await this.getOrCreateSession();

    for await (const message of query({
      prompt,
      options: {
        model: this.config.claudeConfig.model,
        allowedTools: this.config.claudeConfig.allowedTools,
        maxTurns: this.config.claudeConfig.maxTurns,
        resume: sessionId,
        mcpServers: this.mcpProvider.getConfig(),
      },
    })) {
      // 转换 Claude Code SDK 消息为 Agent 消息格式
      yield this.transformMessage(message);
    }
  }

  // 会话管理
  private async getOrCreateSession(): Promise<string> {
    if (this.sessionId && this.config.sessionConfig.resumable) {
      return this.sessionId;
    }

    await this.ensureGlobalMcpServers();

    // 通过初始化查询获取会话ID
    const initResult = query({
      prompt: `Initialize session for ${this.config.name}`,
      options: {
        model: this.config.claudeConfig.model,
        maxTurns: 1,
      },
    });

    for await (const message of initResult) {
      if (message.type === 'system' && message.subtype === 'init') {
        this.sessionId = message.session_id;
        // 保存会话信息
        await this.saveSession();
        break;
      }
    }

    return this.sessionId || generateId();
  }

  private async saveSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const sessionStore = new SessionStore();
      await sessionStore.save({
        id: this.sessionId,
        agentId: this.config.id,
        config: this.config,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private transformMessage(message: any): AgentMessage {
    return {
      type: message.type,
      content: message,
      agentId: this.config.id,
      sessionId: this.sessionId || '',
      timestamp: new Date().toISOString(),
    };
  }

  private calculateTokens(results: any[]): number {
    // 简单的token计算，实际实现需要更精确
    return results.reduce((total, result) => {
      if (typeof result === 'string') {
        return total + Math.ceil(result.length / 4);
      }
      return total + 100; // 默认值
    }, 0);
  }

  private extractToolsUsed(results: any[]): string[] {
    const tools = new Set<string>();
    // 从结果中提取使用的工具
    results.forEach(result => {
      if (result && result.toolsUsed) {
        result.toolsUsed.forEach((tool: string) => tools.add(tool));
      }
    });
    return Array.from(tools);
  }

  // 获取Agent配置
  getConfig(): ClaudeAgentConfig {
    return this.config;
  }

  // 更新Agent配置
  updateConfig(updates: Partial<ClaudeAgentConfig>): void {
    this.config = { ...this.config, ...updates };
    this.config.metadata.updatedAt = new Date().toISOString();
  }
}
