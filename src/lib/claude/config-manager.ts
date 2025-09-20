// Claude Code SDK 配置管理器
import { promises as fs } from 'fs';
import path from 'path';
import {
  ClaudeCodeConfig,
  KnowledgeBaseConfig,
  ToolPermissions,
} from './types';

export class ClaudeCodeConfigManager {
  private configRoot: string;
  private defaultConfig: ClaudeCodeConfig;

  constructor(configRoot: string = './config') {
    this.configRoot = configRoot;
    this.defaultConfig = {
      apiKey: process.env.CLAUDE_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
      baseURL: 'https://api.anthropic.com',
      maxTokens: 4000,
      temperature: 0.1,
    };
  }

  async getClaudeConfig(agentId?: string): Promise<ClaudeCodeConfig> {
    try {
      // 如果指定了 agentId，尝试加载 Agent 特定的配置
      if (agentId) {
        const agentConfigPath = path.join(
          this.configRoot,
          'agents/instances',
          `${agentId}.json`
        );

        try {
          const agentContent = await fs.readFile(agentConfigPath, 'utf-8');
          const agentConfig = JSON.parse(agentContent);

          if (agentConfig.llmConfig?.provider === 'claude') {
            return {
              ...this.defaultConfig,
              apiKey: agentConfig.llmConfig.apiKey || this.defaultConfig.apiKey,
              model: agentConfig.llmConfig.model || this.defaultConfig.model,
              maxTokens:
                agentConfig.llmConfig.parameters?.maxTokens ||
                this.defaultConfig.maxTokens,
              temperature:
                agentConfig.llmConfig.parameters?.temperature ||
                this.defaultConfig.temperature,
            };
          }
        } catch (error) {
          console.warn(
            `Failed to load agent config for ${agentId}, using default`
          );
        }
      }

      // 加载全局 Claude 配置
      const globalConfigPath = path.join(
        this.configRoot,
        'settings/llm-providers.json'
      );

      try {
        const content = await fs.readFile(globalConfigPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.providers?.claude) {
          return {
            ...this.defaultConfig,
            ...config.providers.claude,
          };
        }
      } catch (error) {
        console.warn('Failed to load global Claude config, using default');
      }

      return this.defaultConfig;
    } catch (error) {
      console.error('Error loading Claude config:', error);
      return this.defaultConfig;
    }
  }

  async getKnowledgeBaseConfig(agentId: string): Promise<KnowledgeBaseConfig> {
    try {
      const agentConfigPath = path.join(
        this.configRoot,
        'agents/instances',
        `${agentId}.json`
      );

      const content = await fs.readFile(agentConfigPath, 'utf-8');
      const agentConfig = JSON.parse(content);

      const paths = agentConfig.knowledgeBasePaths || [];

      return {
        enabled: paths.length > 0,
        paths,
        includePatterns: [
          '**/*.js',
          '**/*.ts',
          '**/*.jsx',
          '**/*.tsx',
          '**/*.py',
          '**/*.java',
          '**/*.cpp',
          '**/*.c',
          '**/*.h',
          '**/*.go',
          '**/*.rs',
          '**/*.php',
          '**/*.rb',
          '**/*.swift',
          '**/*.kt',
          '**/*.scala',
          '**/*.css',
          '**/*.scss',
          '**/*.less',
          '**/*.html',
          '**/*.vue',
          '**/*.md',
          '**/*.json',
          '**/*.yaml',
          '**/*.yml',
          '**/*.xml',
          '**/*.sql',
        ],
        excludePatterns: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/.svn/**',
          '**/coverage/**',
          '**/.nyc_output/**',
          '**/logs/**',
          '**/.DS_Store',
          '**/*.log',
          '**/*.tmp',
        ],
        maxDepth: 10,
        maxFileSize: 1024 * 1024, // 1MB
      };
    } catch (error) {
      console.error('Error loading knowledge base config:', error);
      return {
        enabled: false,
        paths: [],
        maxDepth: 10,
        maxFileSize: 1024 * 1024,
      };
    }
  }

  async getToolPermissions(): Promise<ToolPermissions> {
    try {
      const toolsConfigPath = path.join(
        this.configRoot,
        'settings/tools-config.json'
      );

      const content = await fs.readFile(toolsConfigPath, 'utf-8');
      const config = JSON.parse(content);

      const claudeCodeConfig = config.tools?.claudeCode || {};

      return {
        allowedCommands: claudeCodeConfig.allowedCommands || [
          'read',
          'write',
          'list',
          'grep',
          'search',
          'edit',
        ],
        restrictedPaths: claudeCodeConfig.restrictedPaths || [
          '/system',
          '/etc',
          '/root',
          '/usr/bin',
          '/bin',
          'C:\\Windows',
          'C:\\Program Files',
        ],
        maxFileSize: this.parseSize(claudeCodeConfig.maxFileSize || '10MB'),
        timeout: claudeCodeConfig.timeout || 30000,
        sandboxMode: claudeCodeConfig.sandboxMode !== false, // 默认启用沙箱
      };
    } catch (error) {
      console.error('Error loading tool permissions:', error);
      return {
        allowedCommands: ['read', 'list', 'search'],
        restrictedPaths: ['/system', '/etc', '/root'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        timeout: 30000,
        sandboxMode: true,
      };
    }
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i);
    if (!match) return 10 * 1024 * 1024; // 默认 10MB

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    switch (unit) {
      case 'KB':
        return value * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'GB':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // 这里可以添加实际的 API 验证逻辑
      // 现在先简单检查格式
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    } catch (error) {
      return false;
    }
  }

  async updateAgentClaudeConfig(
    agentId: string,
    config: Partial<ClaudeCodeConfig>
  ): Promise<void> {
    try {
      const agentConfigPath = path.join(
        this.configRoot,
        'agents/instances',
        `${agentId}.json`
      );

      const content = await fs.readFile(agentConfigPath, 'utf-8');
      const agentConfig = JSON.parse(content);

      // 更新 LLM 配置
      if (!agentConfig.llmConfig) {
        agentConfig.llmConfig = {};
      }

      agentConfig.llmConfig.provider = 'claude';
      if (config.apiKey) agentConfig.llmConfig.apiKey = config.apiKey;
      if (config.model) agentConfig.llmConfig.model = config.model;

      if (!agentConfig.llmConfig.parameters) {
        agentConfig.llmConfig.parameters = {};
      }

      if (config.maxTokens !== undefined) {
        agentConfig.llmConfig.parameters.maxTokens = config.maxTokens;
      }
      if (config.temperature !== undefined) {
        agentConfig.llmConfig.parameters.temperature = config.temperature;
      }

      // 更新时间戳
      agentConfig.metadata = agentConfig.metadata || {};
      agentConfig.metadata.updatedAt = new Date().toISOString();

      await fs.writeFile(
        agentConfigPath,
        JSON.stringify(agentConfig, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(
        `Error updating Claude config for agent ${agentId}:`,
        error
      );
      throw error;
    }
  }
}
