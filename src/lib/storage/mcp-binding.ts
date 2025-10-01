import { promises as fs } from 'fs';
import path from 'path';
import { ConfigManager } from './config-manager';

export const MCP_BINDING_FILE = '.mcp.json';

export const isAbsoluteKnowledgePath = (input: string): boolean => {
  if (typeof input !== 'string') {
    return false;
  }

  if (path.isAbsolute(input)) return true;

  return /^(?:[a-zA-Z]:\\)/.test(input);
};

export async function syncMcpBindings(
  configManager: ConfigManager,
  knowledgePaths: string[],
  mcpIds: string[] | undefined
): Promise<void> {
  const primary = knowledgePaths?.[0];

  if (!primary) {
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

  if (!mcpIds || mcpIds.length === 0) {
    try {
      await fs.unlink(targetFile);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn('Failed to remove MCP binding file:', error);
      }
    }
    return;
  }

  const registry = await configManager.listMcpServers();
  const selected = registry.filter((server) => mcpIds.includes(server.id));

  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetFile, JSON.stringify(selected, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to write MCP binding file:', error);
  }
}
