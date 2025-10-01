export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { MCPServerInput, ApiResponse, MCPServerDefinition } from '@/lib/types';

const configManager = new ConfigManager();

type ValidationResult =
  | { valid: true; data: MCPServerInput }
  | { valid: false; message: string };

function sanitizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
}

function sanitizeEnv(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const env = input as Record<string, unknown>;
  return Object.entries(env).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof key === 'string' && key.trim().length > 0) {
      acc[key.trim()] = typeof value === 'string' ? value : String(value ?? '');
    }
    return acc;
  }, {});
}

function sanitizeTools(input: unknown): MCPServerInput['tools'] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const tool = item as { name?: string; description?: string };
      const name = tool.name?.trim();
      if (!name) return null;
      return {
        name,
        description: tool.description?.trim(),
      };
    })
    .filter((tool): tool is { name: string; description?: string } => Boolean(tool));
}

function validatePayload(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: '请求体不能为空' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const command = typeof body.command === 'string' ? body.command.trim() : '';

  if (!name) {
    return { valid: false, message: 'MCP 名称不能为空' };
  }

  if (!command) {
    return { valid: false, message: '启动命令不能为空' };
  }

  const status = body.status === 'disabled' ? 'disabled' : 'active';
  const timeout = typeof body.timeout === 'number' ? body.timeout : undefined;

  const data: MCPServerInput = {
    name,
    description: typeof body.description === 'string' ? body.description.trim() : undefined,
    command,
    args: sanitizeArray(body.args),
    env: sanitizeEnv(body.env),
    tags: sanitizeArray(body.tags),
    providers: sanitizeArray(body.providers),
    supportedModels: sanitizeArray(body.supportedModels),
    status,
    timeout,
    tools: sanitizeTools(body.tools),
  };

  return { valid: true, data };
}

export async function GET(): Promise<NextResponse<ApiResponse<MCPServerDefinition[]>>> {
  const servers = await configManager.listMcpServers();
  return NextResponse.json({
    success: true,
    data: servers,
    meta: {
      total: servers.length,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<MCPServerDefinition>>> {
  try {
    const payload = await request.json();
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_MCP_PAYLOAD',
            message: validation.message,
          },
        },
        { status: 400 }
      );
    }

    const server = await configManager.createMcpServer(validation.data);
    return NextResponse.json({
      success: true,
      data: server,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Create MCP server error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_MCP_ERROR',
          message: error.message || '创建 MCP 失败',
        },
      },
      { status: 500 }
    );
  }
}
