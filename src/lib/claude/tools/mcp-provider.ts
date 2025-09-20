// MCP (Model Context Protocol) 接口定义
// 注意：@modelcontextprotocol 包当前尚未发布到npm registry
// 以下是基于MCP协议规范的接口定义，当官方包可用时需要替换

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  serverName?: string;
}

export interface MCPClient {
  name: string;
  version: string;
  connect(config: {
    command: string;
    args: string[];
    env: Record<string, string>;
  }): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  callTool(request: { name: string; arguments: any }): Promise<any>;
}

// Mock MCP Client implementation - 需要替换为真实的MCP客户端
class MockMCPClient implements MCPClient {
  name: string;
  version: string;

  constructor(config: { name: string; version: string }) {
    this.name = config.name;
    this.version = config.version;
  }

  async connect(config: {
    command: string;
    args: string[];
    env: Record<string, string>;
  }): Promise<void> {
    // Mock implementation
    console.log(`Connecting to MCP server: ${config.command}`);
  }

  async listTools(): Promise<MCPTool[]> {
    // Mock implementation - 返回一些示例工具
    return [
      {
        name: 'code_analyzer',
        description: 'Analyze code quality and structure',
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            analysisType: { type: 'string' },
          },
        },
      },
      {
        name: 'git_operations',
        description: 'Perform Git operations',
        parameters: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            args: { type: 'array' },
          },
        },
      },
    ];
  }

  async callTool(request: { name: string; arguments: any }): Promise<any> {
    // Mock implementation
    console.log(`Calling tool ${request.name} with args:`, request.arguments);
    return { result: 'Mock tool execution result' };
  }
}

/**
 * MCP 工具提供者 - 管理 Model Context Protocol 服务器和工具
 */
export class MCPProvider {
  private clients: Map<string, MCPClient> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();

  constructor(serverConfigs?: Record<string, MCPServerConfig>) {
    if (serverConfigs) {
      Object.entries(serverConfigs).forEach(([name, config]) => {
        this.registerServer(name, config);
      });
    }
  }

  /**
   * 注册MCP服务器
   */
  registerServer(name: string, config: MCPServerConfig): void {
    this.configs.set(name, config);
  }

  /**
   * 初始化所有MCP服务器
   */
  async initializeServers(): Promise<void> {
    for (const [name, config] of this.configs) {
      try {
        // 使用Mock客户端，实际应该使用真实的MCP客户端
        const client = new MockMCPClient({
          name: `pack-agents-${name}`,
          version: '1.0.0',
        });

        await client.connect({
          command: config.command,
          args: config.args || [],
          env: { ...process.env, ...config.env },
        });

        this.clients.set(name, client);
        console.log(`MCP server ${name} initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize MCP server ${name}:`, error);
      }
    }
  }

  /**
   * 获取MCP配置（供Claude Code SDK使用）
   */
  getConfig(): Record<string, MCPServerConfig> {
    const config: Record<string, MCPServerConfig> = {};
    for (const [name, serverConfig] of this.configs) {
      config[name] = serverConfig;
    }
    return config;
  }

  /**
   * 获取所有可用工具
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    const tools: MCPTool[] = [];

    for (const [name, client] of this.clients) {
      try {
        const serverTools = await client.listTools();
        tools.push(
          ...serverTools.map((tool) => ({
            ...tool,
            serverName: name,
          }))
        );
      } catch (error) {
        console.error(`Failed to get tools from ${name}:`, error);
      }
    }

    return tools;
  }

  /**
   * 调用MCP工具
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server ${serverName} not found`);
    }

    return await client.callTool({ name: toolName, arguments: args });
  }

  /**
   * 获取服务器状态
   */
  getServerStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [name, config] of this.configs) {
      const isConnected = this.clients.has(name);
      status[name] = {
        name: config.name,
        command: config.command,
        connected: isConnected,
        lastCheck: new Date().toISOString(),
      };
    }

    return status;
  }

  /**
   * 断开所有MCP服务器连接
   */
  async disconnect(): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        // 如果客户端有disconnect方法，调用它
        if ('disconnect' in client && typeof client.disconnect === 'function') {
          await (client as any).disconnect();
        }
        console.log(`Disconnected from MCP server: ${name}`);
      } catch (error) {
        console.error(`Error disconnecting from MCP server ${name}:`, error);
      }
    }
    this.clients.clear();
  }

  /**
   * 重新连接指定服务器
   */
  async reconnectServer(serverName: string): Promise<void> {
    const config = this.configs.get(serverName);
    if (!config) {
      throw new Error(`Server config for ${serverName} not found`);
    }

    // 断开现有连接
    if (this.clients.has(serverName)) {
      const client = this.clients.get(serverName);
      if (
        client &&
        'disconnect' in client &&
        typeof client.disconnect === 'function'
      ) {
        await (client as any).disconnect();
      }
      this.clients.delete(serverName);
    }

    // 重新连接
    try {
      const client = new MockMCPClient({
        name: `pack-agents-${serverName}`,
        version: '1.0.0',
      });

      await client.connect({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...config.env },
      });

      this.clients.set(serverName, client);
      console.log(`MCP server ${serverName} reconnected successfully`);
    } catch (error) {
      console.error(`Failed to reconnect MCP server ${serverName}:`, error);
      throw error;
    }
  }
}

/**
 * Pack Agents 特定的 MCP 提供者
 * 包含预置的MCP服务器配置
 */
export class PackAgentsMCPProvider extends MCPProvider {
  constructor() {
    super(defaultMCPServers);
  }
}

// 预置 MCP 服务器配置
export const defaultMCPServers: Record<string, MCPServerConfig> = {
  // 代码质量分析工具
  codeQuality: {
    name: 'code-quality-mcp',
    command: 'node',
    args: ['./mcp-servers/code-quality/index.js'],
    env: {
      ESLINT_CONFIG: './eslint.config.js',
      PRETTIER_CONFIG: './.prettierrc',
    },
  },

  // Git 操作工具
  gitOps: {
    name: 'git-ops-mcp',
    command: 'node',
    args: ['./mcp-servers/git-ops/index.js'],
    env: {
      GIT_USER_NAME: process.env.GIT_USER_NAME || 'Pack Agents',
      GIT_USER_EMAIL: process.env.GIT_USER_EMAIL || 'agents@pack.dev',
    },
  },

  // 项目管理工具
  projectMgmt: {
    name: 'project-mgmt-mcp',
    command: 'python',
    args: ['./mcp-servers/project-mgmt/server.py'],
    env: {
      PROJECT_ROOT: process.cwd(),
    },
  },

  // 数据库操作工具
  database: {
    name: 'database-mcp',
    command: 'node',
    args: ['./mcp-servers/database/index.js'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || '',
    },
  },
};

/**
 * 创建默认的MCP提供者实例
 */
export function createDefaultMCPProvider(): PackAgentsMCPProvider {
  return new PackAgentsMCPProvider();
}

/**
 * MCP工具执行器 - 封装工具调用逻辑
 */
export class MCPToolExecutor {
  private provider: MCPProvider;

  constructor(provider: MCPProvider) {
    this.provider = provider;
  }

  /**
   * 执行代码分析工具
   */
  async analyzeCode(
    filePath: string,
    analysisType: string = 'full'
  ): Promise<any> {
    try {
      return await this.provider.callTool('codeQuality', 'code_analyzer', {
        filePath,
        analysisType,
      });
    } catch (error) {
      console.error('Code analysis failed:', error);
      throw error;
    }
  }

  /**
   * 执行Git操作
   */
  async executeGitOperation(
    operation: string,
    args: string[] = []
  ): Promise<any> {
    try {
      return await this.provider.callTool('gitOps', 'git_operations', {
        operation,
        args,
      });
    } catch (error) {
      console.error('Git operation failed:', error);
      throw error;
    }
  }

  /**
   * 执行项目管理操作
   */
  async executeProjectOperation(
    operation: string,
    params: any = {}
  ): Promise<any> {
    try {
      return await this.provider.callTool('projectMgmt', 'project_manager', {
        operation,
        ...params,
      });
    } catch (error) {
      console.error('Project operation failed:', error);
      throw error;
    }
  }
}
