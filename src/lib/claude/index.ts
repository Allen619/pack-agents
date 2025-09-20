// Claude Code SDK 集成统一入口
export * from './types';
export * from './config-manager';
export * from './session-manager';
export * from './tool-provider';

import { ClaudeCodeToolProvider } from './tool-provider';
import { ClaudeCodeConfigManager } from './config-manager';
import { claudeLogger, createClaudeSessionLogger } from '../logging/logger';
import {
  ClaudeCodeConfig,
  CodeAnalysisRequest,
  CodeGenerationRequest,
  ToolResult,
} from './types';

// Claude 集成管理器 - 单例模式
class ClaudeIntegrationManager {
  private static instance: ClaudeIntegrationManager;
  private toolProvider: ClaudeCodeToolProvider | null = null;
  private configManager: ClaudeCodeConfigManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.configManager = new ClaudeCodeConfigManager();
  }

  public static getInstance(): ClaudeIntegrationManager {
    if (!ClaudeIntegrationManager.instance) {
      ClaudeIntegrationManager.instance = new ClaudeIntegrationManager();
    }
    return ClaudeIntegrationManager.instance;
  }

  // 初始化 Claude 集成
  async initialize(agentId?: string): Promise<void> {
    try {
      const config = await this.configManager.getClaudeConfig(agentId);

      if (!config.apiKey) {
        throw new Error('Claude API key is required');
      }

      this.toolProvider = new ClaudeCodeToolProvider(config);
      this.isInitialized = true;

      claudeLogger.info('Claude integration initialized successfully', {
        model: config.model,
        agentId,
      });
    } catch (error) {
      claudeLogger.error('Failed to initialize Claude integration', {
        error: error.message,
        agentId,
      });
      throw error;
    }
  }

  // 确保已初始化
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.toolProvider) {
      throw new Error(
        'Claude integration not initialized. Call initialize() first.'
      );
    }
  }

  // 执行代码分析
  async analyzeCode(request: CodeAnalysisRequest): Promise<ToolResult> {
    this.ensureInitialized();

    const sessionLogger = createClaudeSessionLogger('', request.executionId);
    sessionLogger.info('Starting code analysis', {
      analysisType: request.analysisType,
      paths: request.paths,
      target: request.analysisTarget,
    });

    try {
      const result = await this.toolProvider!.executeCodeAnalysis(request);

      sessionLogger.info('Code analysis completed', {
        success: result.success,
        tokensUsed: result.metadata?.tokensUsed,
        executionTime: result.metadata?.executionTime,
      });

      return result;
    } catch (error) {
      sessionLogger.error('Code analysis failed', {
        error: error.message,
      });
      throw error;
    }
  }

  // 执行代码生成
  async generateCode(request: CodeGenerationRequest): Promise<ToolResult> {
    this.ensureInitialized();

    const sessionLogger = createClaudeSessionLogger('', request.executionId);
    sessionLogger.info('Starting code generation', {
      promptLength: request.prompt.length,
      contextFiles: request.contextFiles?.length || 0,
      projectContext: !!request.projectContext,
    });

    try {
      const result = await this.toolProvider!.generateCode(request);

      sessionLogger.info('Code generation completed', {
        success: result.success,
        filesGenerated: result.files?.length || 0,
        tokensUsed: result.metadata?.tokensUsed,
        executionTime: result.metadata?.executionTime,
      });

      return result;
    } catch (error) {
      sessionLogger.error('Code generation failed', {
        error: error.message,
      });
      throw error;
    }
  }

  // 获取工具提供者（用于高级操作）
  getToolProvider(): ClaudeCodeToolProvider {
    this.ensureInitialized();
    return this.toolProvider!;
  }

  // 获取配置管理器
  getConfigManager(): ClaudeCodeConfigManager {
    return this.configManager;
  }

  // 检查 API 连接
  async testConnection(agentId?: string): Promise<boolean> {
    try {
      const config = await this.configManager.getClaudeConfig(agentId);
      return await this.configManager.validateApiKey(config.apiKey);
    } catch (error) {
      claudeLogger.error('Connection test failed', {
        error: error.message,
        agentId,
      });
      return false;
    }
  }

  // 获取统计信息
  async getStats(): Promise<{
    isInitialized: boolean;
    sessionStats?: any;
  }> {
    const stats = {
      isInitialized: this.isInitialized,
    };

    if (this.isInitialized && this.toolProvider) {
      const sessionManager = this.toolProvider.getSessionManager();
      stats.sessionStats = await sessionManager.getSessionStats();
    }

    return stats;
  }

  // 重新初始化（用于配置更改后）
  async reinitialize(agentId?: string): Promise<void> {
    this.isInitialized = false;
    this.toolProvider = null;
    await this.initialize(agentId);
  }
}

// 导出单例实例
export const claudeIntegration = ClaudeIntegrationManager.getInstance();

// 便捷函数
export async function initializeClaude(agentId?: string): Promise<void> {
  return await claudeIntegration.initialize(agentId);
}

export async function analyzeCode(
  request: CodeAnalysisRequest
): Promise<ToolResult> {
  return await claudeIntegration.analyzeCode(request);
}

export async function generateCode(
  request: CodeGenerationRequest
): Promise<ToolResult> {
  return await claudeIntegration.generateCode(request);
}

export async function testClaudeConnection(agentId?: string): Promise<boolean> {
  return await claudeIntegration.testConnection(agentId);
}

// Agent 特定的 Claude 实例
export class AgentClaudeInstance {
  private agentId: string;
  private toolProvider: ClaudeCodeToolProvider | null = null;
  private isInitialized: boolean = false;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async initialize(): Promise<void> {
    const configManager = new ClaudeCodeConfigManager();
    const config = await configManager.getClaudeConfig(this.agentId);

    this.toolProvider = new ClaudeCodeToolProvider(config);
    this.isInitialized = true;

    claudeLogger.info('Agent Claude instance initialized', {
      agentId: this.agentId,
      model: config.model,
    });
  }

  async analyzeCode(
    request: Omit<CodeAnalysisRequest, 'executionId'>
  ): Promise<ToolResult> {
    if (!this.isInitialized || !this.toolProvider) {
      await this.initialize();
    }

    return await this.toolProvider!.executeCodeAnalysis({
      ...request,
      executionId: this.agentId,
    });
  }

  async generateCode(
    request: Omit<CodeGenerationRequest, 'executionId'>
  ): Promise<ToolResult> {
    if (!this.isInitialized || !this.toolProvider) {
      await this.initialize();
    }

    return await this.toolProvider!.generateCode({
      ...request,
      executionId: this.agentId,
    });
  }

  getAgentId(): string {
    return this.agentId;
  }
}

// 创建 Agent 特定的 Claude 实例
export function createAgentClaudeInstance(
  agentId: string
): AgentClaudeInstance {
  return new AgentClaudeInstance(agentId);
}
