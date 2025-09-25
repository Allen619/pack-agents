// 配置管理服务 - Pack Agents 核心文件存储系统
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import {
  AgentConfig,
  AgentTemplate,
  WorkflowConfig,
  ExecutionRecord,
  AppConfig,
  LLMProviderConfig,
  ToolsConfig,
} from '@/types';

export class ConfigManager {
  private configRoot: string;

  constructor(configRoot: string = './config') {
    this.configRoot = configRoot;
  }

  async initialize(): Promise<void> {
    await this.ensureDirectories();
    await this.createDefaultTemplates();
    await this.createDefaultSettings();
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      'agents/templates',
      'agents/instances',
      'workflows',
      'executions/current',
      'logs',
      'settings',
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.configRoot, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates: AgentTemplate[] = [
      {
        id: 'code-analyst-template',
        name: '代码分析师模板',
        description: '专门用于代码分析和审查的 Agent 模板',
        role: 'sub',
        systemPrompt:
          '你是一个专业的代码分析师，负责分析代码质量、发现潜在问题、提供改进建议。请仔细分析代码结构、性能、安全性和可维护性。',
        enabledTools: ['Read', 'Grep', 'Search', 'List'],
        tags: ['code-analysis', 'review', 'quality'],
        category: 'development',
      },
      {
        id: 'code-generator-template',
        name: '代码生成器模板',
        description: '根据需求自动生成代码的 Agent 模板',
        role: 'sub',
        systemPrompt:
          '你是一个代码生成专家，根据需求编写高质量的代码。请确保代码遵循最佳实践，具有良好的可读性和可维护性。',
        enabledTools: ['Write', 'Edit', 'Read', 'List'],
        tags: ['code-generation', 'development', 'automation'],
        category: 'development',
      },
      {
        id: 'project-manager-template',
        name: '项目管理员模板',
        description: '协调多个 Agent 协作的主管理 Agent 模板',
        role: 'main',
        systemPrompt:
          '你是一个项目管理员，负责协调和管理整个工作流。请制定合理的执行计划，协调各个子任务，确保项目顺利完成。',
        enabledTools: ['Read', 'Write', 'Search', 'List'],
        tags: ['project-management', 'coordination', 'planning'],
        category: 'management',
      },
    ];

    for (const template of defaultTemplates) {
      const templatePath = path.join(
        this.configRoot,
        'agents/templates',
        `${template.id}.json`
      );
      try {
        await fs.access(templatePath);
      } catch {
        await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
      }
    }
  }

  private async createDefaultSettings(): Promise<void> {
    // 创建应用配置
    const appConfig: AppConfig = {
      app: {
        name: 'Pack Agents',
        version: '1.0.0',
        environment: 'development',
      },
      storage: {
        type: 'file',
        configRoot: './config',
        autoBackup: true,
        maxExecutionHistory: 1000,
      },
      execution: {
        defaultTimeout: 300000,
        maxRetries: 3,
        parallelLimit: 5,
      },
    };

    // 创建LLM提供商配置
    const llmProviderConfig: LLMProviderConfig = {
      providers: {
        claude: {
          name: 'Anthropic Claude',
          models: ['claude-sonnet-4-20250514', 'claude-haiku-20250514'],
          defaultModel: 'claude-sonnet-4-20250514',
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 40000,
          },
        },
        openai: {
          name: 'OpenAI GPT',
          models: ['gpt-4', 'gpt-3.5-turbo'],
          defaultModel: 'gpt-4',
        },
      },
    };

    // 创建工具配置
    const toolsConfig: ToolsConfig = {
      tools: {
        claudeCode: {
          enabled: true,
          allowedCommands: ['read', 'write', 'list', 'grep', 'search'],
          restrictedPaths: ['/system', '/etc', '/root'],
          maxFileSize: '10MB',
          timeout: 30000,
        },
        fileSystem: {
          enabled: true,
          allowedExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.md'],
          maxDepth: 10,
        },
      },
    };

    const configs = [
      { file: 'app-config.json', data: appConfig },
      { file: 'llm-providers.json', data: llmProviderConfig },
      { file: 'tools-config.json', data: toolsConfig },
    ];

    for (const config of configs) {
      const configPath = path.join(this.configRoot, 'settings', config.file);
      try {
        await fs.access(configPath);
      } catch {
        await fs.writeFile(configPath, JSON.stringify(config.data, null, 2));
      }
    }
  }

  // Agent 操作
  async saveAgent(agent: AgentConfig): Promise<void> {
    agent.metadata.updatedAt = new Date().toISOString();

    const filePath = path.join(
      this.configRoot,
      'agents/instances',
      `${agent.id}.json`
    );

    await fs.writeFile(filePath, JSON.stringify(agent, null, 2), 'utf-8');
  }

  async loadAgent(id: string): Promise<AgentConfig | null> {
    try {
      const filePath = path.join(
        this.configRoot,
        'agents/instances',
        `${id}.json`
      );
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async listAgents(): Promise<AgentConfig[]> {
    const instancesDir = path.join(this.configRoot, 'agents/instances');
    try {
      const files = await fs.readdir(instancesDir);
      const agents: AgentConfig[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const agent = await this.loadAgent(path.basename(file, '.json'));
          if (agent) agents.push(agent);
        }
      }

      return agents.sort(
        (a, b) =>
          new Date(b.metadata.updatedAt).getTime() -
          new Date(a.metadata.updatedAt).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async deleteAgent(id: string): Promise<void> {
    const filePath = path.join(
      this.configRoot,
      'agents/instances',
      `${id}.json`
    );
    await fs.unlink(filePath);
  }

  // Agent 模板操作
  async listAgentTemplates(): Promise<AgentTemplate[]> {
    const templatesDir = path.join(this.configRoot, 'agents/templates');
    try {
      const files = await fs.readdir(templatesDir);
      const templates: AgentTemplate[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(templatesDir, file);
          const content = await fs.readFile(templatePath, 'utf-8');
          const template = JSON.parse(content);
          templates.push(template);
        }
      }

      return templates;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async createAgentFromTemplate(
    templateId: string,
    overrides?: Partial<AgentConfig>
  ): Promise<AgentConfig> {
    const templates = await this.listAgentTemplates();
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const agent: AgentConfig = {
      id: nanoid(),
      name: overrides?.name || template.name.replace('模板', ''),
      description: overrides?.description || template.description,
      role: template.role,
      systemPrompt: template.systemPrompt,
      llmConfig: overrides?.llmConfig || {
        provider: 'claude',
        model: '',
        baseUrl: 'https://api.anthropic.com',
        apiKey: '',
        capabilities: {
          language: true,
          vision: false,
          web: false,
        },
        parameters: {
          temperature: 0.1,
          maxTokens: 4000,
          topP: 0.9,
        },
      },
      knowledgeBasePaths: overrides?.knowledgeBasePaths || ['./src', './docs'],
      enabledTools: template.enabledTools,
      metadata: {
        version: '1.0.0',
        author: 'user',
        tags: template.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usage: {
          totalExecutions: 0,
          successRate: 0,
          avgExecutionTime: 0,
        },
      },
    };

    await this.saveAgent(agent);
    return agent;
  }

  // 工作流操作
  async saveWorkflow(workflow: WorkflowConfig): Promise<void> {
    workflow.metadata.updatedAt = new Date().toISOString();
    const filePath = path.join(
      this.configRoot,
      'workflows',
      `${workflow.id}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
  }

  async loadWorkflow(id: string): Promise<WorkflowConfig | null> {
    try {
      const filePath = path.join(this.configRoot, 'workflows', `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async listWorkflows(): Promise<WorkflowConfig[]> {
    const workflowsDir = path.join(this.configRoot, 'workflows');
    try {
      const files = await fs.readdir(workflowsDir);
      const workflows: WorkflowConfig[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const workflow = await this.loadWorkflow(
            path.basename(file, '.json')
          );
          if (workflow) workflows.push(workflow);
        }
      }

      return workflows.sort(
        (a, b) =>
          new Date(b.metadata.updatedAt).getTime() -
          new Date(a.metadata.updatedAt).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    const filePath = path.join(this.configRoot, 'workflows', `${id}.json`);
    await fs.unlink(filePath);
  }

  // 执行记录操作
  async saveExecution(execution: ExecutionRecord): Promise<void> {
    const date = new Date().toISOString().slice(0, 7); // YYYY-MM
    const dirPath = path.join(this.configRoot, 'executions', date);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${execution.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(execution, null, 2), 'utf-8');

    // 如果是活跃执行，也保存到 current 目录
    if (
      ['pending', 'planning', 'running', 'paused'].includes(execution.status)
    ) {
      const currentPath = path.join(
        this.configRoot,
        'executions/current',
        `${execution.id}.json`
      );
      await fs.writeFile(
        currentPath,
        JSON.stringify(execution, null, 2),
        'utf-8'
      );
    } else {
      // 完成后从 current 目录删除
      try {
        const currentPath = path.join(
          this.configRoot,
          'executions/current',
          `${execution.id}.json`
        );
        await fs.unlink(currentPath);
      } catch (error) {
        // 忽略文件不存在的错误
      }
    }
  }

  async loadExecution(id: string): Promise<ExecutionRecord | null> {
    // 先从 current 目录查找活跃执行
    try {
      const currentPath = path.join(
        this.configRoot,
        'executions/current',
        `${id}.json`
      );
      const content = await fs.readFile(currentPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 如果 current 目录没有，搜索历史记录
      const executionsDir = path.join(this.configRoot, 'executions');
      try {
        const monthDirs = await fs.readdir(executionsDir);

        for (const monthDir of monthDirs) {
          if (monthDir === 'current') continue;

          try {
            const filePath = path.join(executionsDir, monthDir, `${id}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        // 目录不存在
      }
    }

    return null;
  }

  async listActiveExecutions(): Promise<ExecutionRecord[]> {
    const currentDir = path.join(this.configRoot, 'executions/current');
    try {
      const files = await fs.readdir(currentDir);
      const executions: ExecutionRecord[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const execution = await this.loadExecution(
            path.basename(file, '.json')
          );
          if (execution) executions.push(execution);
        }
      }

      return executions;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  // 配置读取
  async getAppConfig(): Promise<AppConfig> {
    const configPath = path.join(this.configRoot, 'settings/app-config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  async getLLMProviders(): Promise<LLMProviderConfig> {
    const configPath = path.join(
      this.configRoot,
      'settings/llm-providers.json'
    );
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  async getToolsConfig(): Promise<ToolsConfig> {
    const configPath = path.join(this.configRoot, 'settings/tools-config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }
}
