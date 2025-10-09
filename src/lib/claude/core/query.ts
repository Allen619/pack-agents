import { query as claudeQuery } from '@anthropic-ai/claude-code';
import {
  ClaudeAgentConfig,
  ExecutionOptions,
  AgentResult,
  MCPServerConfig,
  MCPServerDefinition,
} from '../../../lib/types';
import { ConfigManager } from '../../../lib/storage/config-manager';
import { generateId } from '../../../lib/utils';

export interface QueryRequest {
  prompt: string | AsyncGenerator<any>;
  config: ClaudeAgentConfig;
  options?: ExecutionOptions;
}

export interface QueryResult {
  success: boolean;
  messages: any[];
  sessionId?: string;
  metadata: {
    tokensUsed: number;
    executionTime: number;
    toolsUsed: string[];
    messagesCount: number;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface PromptOptimizationOptions {
  enableCompression: boolean;
  maxContextLength: number;
  prioritizeRecent: boolean;
  removeRedundancy: boolean;
}

/**
 * Claude Code SDK 查询引擎封装
 * 提供统一的查询接口和优化功能
 */
export class ClaudeQueryEngine {
  private configManager = new ConfigManager();
  private cache: Map<string, QueryResult> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 执行查询
   */
  async execute(request: QueryRequest): Promise<QueryResult> {
    const startTime = Date.now();
    const messages: any[] = [];
    const toolsUsed = new Set<string>();

    try {
      // 检查缓存
      if (request.options?.enableCache) {
        const cached = this.getFromCache(request);
        if (cached) {
          return cached;
        }
      }

      // 构建Claude Code SDK查询选项
      const queryOptions = await this.buildQueryOptions(request.config);

      // 执行查询
      for await (const message of claudeQuery({
        prompt: request.prompt,
        options: queryOptions,
      })) {
        messages.push(message);

        // 跟踪工具使用
        if (message.type === 'tool_call' && message.tool) {
          toolsUsed.add(message.tool);
        }

        // 进度回调
        if (request.options?.onProgress) {
          request.options.onProgress({
            type: message.type,
            content: message,
            timestamp: new Date().toISOString(),
          });
        }

        // 检查超时
        if (request.options?.timeout) {
          const elapsed = Date.now() - startTime;
          if (elapsed > request.options.timeout) {
            throw new Error(`Query execution timeout after ${elapsed}ms`);
          }
        }
      }

      const result: QueryResult = {
        success: true,
        messages,
        sessionId: this.extractSessionId(messages),
        metadata: {
          tokensUsed: this.calculateTokens(messages),
          executionTime: Date.now() - startTime,
          toolsUsed: Array.from(toolsUsed),
          messagesCount: messages.length,
        },
      };

      // 缓存结果
      if (request.options?.enableCache) {
        this.saveToCache(request, result);
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        messages,
        metadata: {
          tokensUsed: this.calculateTokens(messages),
          executionTime: Date.now() - startTime,
          toolsUsed: Array.from(toolsUsed),
          messagesCount: messages.length,
        },
        error: {
          message: error.message,
          code: 'QUERY_EXECUTION_ERROR',
          details: error,
        },
      };
    }
  }

  /**
   * 流式执行查询
   */
  async *executeStream(request: QueryRequest): AsyncGenerator<any> {
    try {
      const queryOptions = await this.buildQueryOptions(request.config);

      for await (const message of claudeQuery({
        prompt: request.prompt,
        options: queryOptions,
      })) {
        yield {
          ...message,
          timestamp: new Date().toISOString(),
          agentId: request.config.id,
        };
      }
    } catch (error: any) {
      yield {
        type: 'error',
        error: {
          message: error.message,
          code: 'STREAM_EXECUTION_ERROR',
          details: error,
        },
        timestamp: new Date().toISOString(),
        agentId: request.config.id,
      };
    }
  }

  /**
   * 将MCPServerConfig转换为SDK格式 (McpStdioServerConfig)
   */
  private convertToSdkMcpConfig(server: MCPServerDefinition): any {
    return {
      type: 'stdio',
      command: server.command,
      args: server.args || [],
      env: server.env || {},
    };
  }

  /**
   * 构建 Claude Code SDK 所需的 MCP 服务器配置
   */
  public buildMcpServersConfig(): Record<string, any> {
    // 构建 MCP 服务器配置 - SDK 格式和标准一致
    const mergedMcp: Record<string, any> = {};

    // 优先使用 ClaudeAgentConfig 中的配置 (如果有的话)
    // 然后从注册表中获取全局配置
    this.getGlobalMcpServers().forEach((server) => {
      if (server.status !== 'disabled') {
        mergedMcp[server.name] = this.convertToSdkMcpConfig(server);
      }
    });

    console.log(
      'Built MCP servers config for SDK:',
      JSON.stringify(mergedMcp, null, 2)
    );
    return Object.keys(mergedMcp).length > 0 ? mergedMcp : undefined;
  }

  private async getGlobalMcpServers(): Promise<MCPServerDefinition[]> {
    try {
      const registry = await this.configManager.listMcpServers();
      return registry.filter((server) => server.status !== 'disabled');
    } catch (error) {
      console.warn('加载 MCP 注册表失败:', error);
      return [];
    }
  }

  /**
   * 构建Claude Code SDK查询选项
   */
  public async buildQueryOptions(config: ClaudeAgentConfig): Promise<any> {
    console.log('=== buildQueryOptions 开始构建查询选项 ===');
    console.log('1. 输入的 ClaudeAgentConfig:', {
      id: config.id,
      name: config.name,
      systemPrompt: config.systemPrompt, // 修复：从根级别获取系统提示词
      model: config.claudeConfig.model,
      allowedTools: config.claudeConfig.allowedTools,
      knowledgeBasePaths: config.context.knowledgeBasePaths,
      workingDirectory: config.context.workingDirectory,
    });

    // 构建 MCP 服务器配置
    const mergedMcp: Record<string, any> = {};

    try {
      console.log('2. 开始加载 MCP 服务器注册表...');
      const registry = await this.configManager.listMcpServers();
      console.log(
        '3. 获取到的 MCP 服务器注册表:',
        JSON.stringify(registry, null, 2)
      );

      const model = config.claudeConfig.model;
      console.log('4. 当前使用的模型:', model);

      const filteredServers = registry
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
        });

      console.log(
        '5. 过滤后的 MCP 服务器:',
        JSON.stringify(filteredServers, null, 2)
      );

      filteredServers.forEach((server) => {
        console.log(`6. 添加 MCP 服务器: ${server.name}`);
        // 使用服务器名称作为 key，按照用户要求的格式
        mergedMcp[server.name] = {
          type: 'stdio',
          command: server.command,
          args: server.args || [],
          env: server.env || {},
        };
      });
    } catch (error) {
      console.warn('加载 MCP 注册表失败:', error);
    }

    console.log(
      '7. 最终合并的 MCP 服务器配置:',
      JSON.stringify(mergedMcp, null, 2)
    );

    const queryOptions = {
      model: config.claudeConfig.model,
      allowedTools: config.claudeConfig.allowedTools,
      maxTurns: config.claudeConfig.maxTurns,
      temperature: config.claudeConfig.temperature,
      mcpServers: Object.keys(mergedMcp).length > 0 ? mergedMcp : undefined,
      customSystemPrompt: config.systemPrompt, // 修复：从根级别获取系统提示词，而不是从claudeConfig对象内
      workingDirectory: config.context.workingDirectory,
      environmentVariables: config.context.environmentVariables,
      permissionMode: 'bypassPermissions', // 允许所有工具（包括MCP工具）直接执行
    };

    console.log('8. 完整的查询选项:', JSON.stringify(queryOptions, null, 2));
    console.log('8.1. 系统提示词详情:', {
      configSystemPrompt: config.systemPrompt, // 修复：显示正确的系统提示词字段
      hasSystemPrompt: !!config.systemPrompt,
      systemPromptLength: config.systemPrompt?.length || 0
    });
    console.log('=== buildQueryOptions 完成构建查询选项 ===');

    return queryOptions;
  }

  /**
   * 从消息中提取会话ID
   */
  private extractSessionId(messages: any[]): string | undefined {
    for (const message of messages) {
      if (message.sessionId) {
        return message.sessionId;
      }
      if (message.type === 'system' && message.subtype === 'init') {
        return message.session_id;
      }
    }
    return undefined;
  }

  /**
   * 计算token使用量
   */
  private calculateTokens(messages: any[]): number {
    return messages.reduce((total, message) => {
      if (message.tokensUsed) {
        return total + message.tokensUsed;
      }
      if (typeof message.content === 'string') {
        return total + Math.ceil(message.content.length / 4);
      }
      return total + 10; // 默认值
    }, 0);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: QueryRequest): string {
    const promptStr =
      typeof request.prompt === 'string' ? request.prompt : 'generator';

    const keyData = {
      prompt: promptStr,
      agentId: request.config.id,
      model: request.config.claudeConfig.model,
      systemPrompt: request.config.claudeConfig.systemPrompt,
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * 从缓存获取结果
   */
  private getFromCache(request: QueryRequest): QueryResult | null {
    const key = this.generateCacheKey(request);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.metadata.executionTime < this.cacheTTL) {
      return cached;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * 保存结果到缓存
   */
  private saveToCache(request: QueryRequest, result: QueryResult): void {
    const key = this.generateCacheKey(request);
    this.cache.set(key, {
      ...result,
      metadata: {
        ...result.metadata,
        cached: true,
        cachedAt: Date.now(),
      },
    });
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, result] of this.cache) {
      if (now - result.metadata.executionTime > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalQueries: number;
    cacheHits: number;
  } {
    // 简化实现，实际应该跟踪更详细的统计
    return {
      size: this.cache.size,
      hitRate: 0, // 需要实际统计
      totalQueries: 0, // 需要实际统计
      cacheHits: 0, // 需要实际统计
    };
  }
}

/**
 * 提示词优化器
 * 用于优化传入Claude Code SDK的提示词
 */
export class PromptOptimizer {
  /**
   * 压缩提示词
   */
  compress(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ') // 合并空白字符
      .replace(/\n\s*\n/g, '\n') // 删除多余换行
      .trim();
  }

  /**
   * 构建上下文感知的提示词
   */
  buildContextualPrompt(
    basePrompt: string,
    context: {
      recentFiles?: string[];
      previousResults?: any[];
      sharedData?: Record<string, any>;
    },
    options: PromptOptimizationOptions = {
      enableCompression: true,
      maxContextLength: 8000,
      prioritizeRecent: true,
      removeRedundancy: true,
    }
  ): string {
    let optimizedPrompt = options.enableCompression
      ? this.compress(basePrompt)
      : basePrompt;

    // 添加相关上下文
    if (context.recentFiles?.length > 0) {
      const files = options.prioritizeRecent
        ? context.recentFiles.slice(0, 5)
        : context.recentFiles;
      optimizedPrompt += `\n\nRecent files: ${files.join(', ')}`;
    }

    // 添加前序结果摘要
    if (context.previousResults?.length > 0) {
      const summary = this.summarizeResults(context.previousResults);
      if (summary.length > 0) {
        optimizedPrompt += `\n\nPrevious results: ${summary}`;
      }
    }

    // 添加共享数据
    if (context.sharedData && Object.keys(context.sharedData).length > 0) {
      const sharedSummary = this.summarizeSharedData(context.sharedData);
      if (sharedSummary.length > 0) {
        optimizedPrompt += `\n\nShared context: ${sharedSummary}`;
      }
    }

    // 确保不超过最大长度
    if (optimizedPrompt.length > options.maxContextLength) {
      optimizedPrompt = this.truncatePrompt(
        optimizedPrompt,
        options.maxContextLength
      );
    }

    return optimizedPrompt;
  }

  /**
   * 总结结果
   */
  private summarizeResults(results: any[]): string {
    return results
      .filter((r) => r && (r.success || r.output))
      .map(
        (r) =>
          r.summary || r.output?.toString().slice(0, 100) || 'Unknown result'
      )
      .join('; ');
  }

  /**
   * 总结共享数据
   */
  private summarizeSharedData(sharedData: Record<string, any>): string {
    return Object.entries(sharedData)
      .slice(0, 3) // 只取前3个最重要的
      .map(([key, value]) => `${key}: ${String(value).slice(0, 50)}`)
      .join('; ');
  }

  /**
   * 截断提示词
   */
  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) {
      return prompt;
    }

    // 智能截断：保留重要部分
    const sections = prompt.split('\n\n');
    let result = sections[0]; // 保留第一部分（通常是主要指令）

    for (let i = sections.length - 1; i > 0; i--) {
      const candidate = result + '\n\n' + sections[i];
      if (candidate.length <= maxLength) {
        result = candidate;
        break;
      }
    }

    if (result.length > maxLength) {
      result = result.slice(0, maxLength - 3) + '...';
    }

    return result;
  }

  /**
   * 分析提示词复杂度
   */
  analyzePromptComplexity(prompt: string): {
    length: number;
    sentences: number;
    complexity: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const length = prompt.length;
    const sentences = prompt.split(/[.!?]+/).length - 1;

    let complexity: 'low' | 'medium' | 'high' = 'low';
    const recommendations: string[] = [];

    if (length > 5000) {
      complexity = 'high';
      recommendations.push(
        'Consider breaking down the prompt into smaller parts'
      );
    } else if (length > 2000) {
      complexity = 'medium';
      recommendations.push(
        'Prompt is moderately complex, consider optimization'
      );
    }

    if (sentences > 20) {
      recommendations.push('Too many sentences, consider simplification');
    }

    if (prompt.includes('...')) {
      recommendations.push('Contains ellipsis, might be truncated');
    }

    return {
      length,
      sentences,
      complexity,
      recommendations,
    };
  }
}

// 全局实例
let globalQueryEngine: ClaudeQueryEngine | null = null;
let globalPromptOptimizer: PromptOptimizer | null = null;

/**
 * 获取全局查询引擎实例
 */
export function getQueryEngine(): ClaudeQueryEngine {
  if (!globalQueryEngine) {
    globalQueryEngine = new ClaudeQueryEngine();

    // 定期清理缓存
    setInterval(
      () => {
        globalQueryEngine?.cleanupCache();
      },
      5 * 60 * 1000
    ); // 每5分钟清理一次
  }

  return globalQueryEngine;
}

/**
 * 获取全局提示词优化器实例
 */
export function getPromptOptimizer(): PromptOptimizer {
  if (!globalPromptOptimizer) {
    globalPromptOptimizer = new PromptOptimizer();
  }

  return globalPromptOptimizer;
}
