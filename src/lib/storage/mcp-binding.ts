import { promises as fs } from 'fs';
import path from 'path';
import { ConfigManager } from './config-manager';
import { MCPServerDefinition } from '@/lib/types';

export const MCP_BINDING_FILE = '.mcp.json';

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

interface McpServerConfig {
  type: 'stdio' | 'sse' | 'websocket';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export const isAbsoluteKnowledgePath = (input: string): boolean => {
  if (typeof input !== 'string') {
    return false;
  }

  if (path.isAbsolute(input)) return true;

  return /^(?:[a-zA-Z]:\\)/.test(input);
};

/**
 * 将 MCPServerDefinition 转换为 McpServerConfig
 */
function convertToMcpServerConfig(server: MCPServerDefinition): McpServerConfig {
  return {
    type: 'stdio',
    command: server.command,
    args: server.args || [],
    env: server.env || {},
  };
}

/**
 * 从现有的 .mcp.json 文件中读取配置
 */
async function readExistingMcpConfig(targetFile: string): Promise<McpConfig | null> {
  try {
    const content = await fs.readFile(targetFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      // 文件不存在，返回 null
      return null;
    }
    console.warn('Failed to read existing MCP config:', error);
    return null;
  }
}

/**
 * 写入 .mcp.json 文件
 */
async function writeMcpConfig(targetFile: string, config: McpConfig): Promise<void> {
  try {
    // 创建备份文件
    const backupFile = targetFile + '.backup.' + Date.now();
    try {
      await fs.copyFile(targetFile, backupFile);
    } catch {
      // 备份失败，忽略
    }

    // 原子性写入新配置
    await fs.writeFile(
      targetFile,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    // 删除备份文件
    try {
      await fs.unlink(backupFile);
    } catch {
      // 删除备份失败，忽略
    }
  } catch (error) {
    console.warn('Failed to write MCP config:', error);
    throw error;
  }
}

/**
 * 同步 MCP 配置到知识库目录
 */
export async function syncMcpBindings(
  configManager: ConfigManager,
  knowledgePaths: string[],
  mcpIds: string[] | undefined
): Promise<void> {
  const primary = knowledgePaths?.[0];

  if (!primary) {
    console.log('No knowledge base path provided, skipping MCP binding sync');
    return;
  }

  const targetDir = primary.trim();

  if (!isAbsoluteKnowledgePath(targetDir)) {
    console.warn(
      'Skip writing MCP binding file: knowledge base path is not absolute',
      targetDir
    );
    return;
  }

  const targetFile = path.join(targetDir, MCP_BINDING_FILE);

  try {
    // 确保目标目录存在
    await fs.mkdir(targetDir, { recursive: true });

    // 获取所有可用的 MCP 服务器
    const registry = await configManager.listMcpServers();

    // 如果没有选择 MCP 服务器，删除配置文件
    if (!mcpIds || mcpIds.length === 0) {
      try {
        await fs.unlink(targetFile);
        console.log('Removed MCP binding file (no servers selected):', targetFile);
      } catch (error: any) {
        if ((error as any)?.code !== 'ENOENT') {
          console.warn('Failed to remove MCP binding file:', error);
        }
      }
      return;
    }

    // 获取选择的 MCP 服务器
    const selectedServers = registry.filter((server) => mcpIds.includes(server.id));

    // 读取现有配置
    const existingConfig = await readExistingMcpConfig(targetFile);

    // 构建新的配置
    const newConfig: McpConfig = {
      mcpServers: {}
    };

    // 添加选择的 MCP 服务器配置
    for (const server of selectedServers) {
      newConfig.mcpServers[server.name] = convertToMcpServerConfig(server);
    }

    // 如果现有配置有值，但新配置没有，说明是删除操作，记录日志
    if (existingConfig?.mcpServers) {
      const removedServers = Object.keys(existingConfig.mcpServers).filter(
        serverName => !newConfig.mcpServers[serverName]
      );
      if (removedServers.length > 0) {
        console.log('Removed MCP servers:', removedServers);
      }
    }

    // 检查是否有变化
    const hasChanges = !existingConfig ||
      JSON.stringify(existingConfig?.mcpServers) !== JSON.stringify(newConfig.mcpServers);

    if (hasChanges) {
      await writeMcpConfig(targetFile, newConfig);
      console.log('MCP binding file synced successfully:', targetFile);

      // 记录同步的详细信息
      const serverCount = Object.keys(newConfig.mcpServers).length;
      const serverNames = Object.keys(newConfig.mcpServers).join(', ');
      console.log(`Synced ${serverCount} MCP servers: ${serverNames}`);
    } else {
      console.log('MCP binding file already up to date:', targetFile);
    }

  } catch (error) {
    console.error('Failed to sync MCP binding file:', error);
    throw error;
  }
}

/**
 * 验证 MCP 配置文件
 */
export async function validateMcpBinding(configPath: string): Promise<{
  valid: boolean;
  error?: string;
  config?: McpConfig;
}> {
  try {
    if (!isAbsoluteKnowledgePath(configPath)) {
      return {
        valid: false,
        error: 'MCP config path must be absolute'
      };
    }

    const mcpFile = path.join(configPath, MCP_BINDING_FILE);
    const config = await readExistingMcpConfig(mcpFile);

    if (!config) {
      return {
        valid: true,
        error: 'No MCP config file found'
      };
    }

    // 验证配置结构
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      return {
        valid: false,
        error: 'Invalid MCP config: missing or invalid mcpServers'
      };
    }

    // 验证每个服务器配置
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.type || !serverConfig.command) {
        return {
          valid: false,
          error: `Invalid MCP server config for ${serverName}: missing type or command`
        };
      }
    }

    return {
      valid: true,
      config
    };

  } catch (error) {
    return {
      valid: false,
      error: `Validation failed: ${(error as Error).message}`
    };
  }
}