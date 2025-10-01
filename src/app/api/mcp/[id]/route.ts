export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { MCPServerDefinition, MCPServerInput, ApiResponse } from '@/lib/types';

const configManager = new ConfigManager();

function normalizeUpdates(body: any): Partial<MCPServerInput> {
  const updates: Partial<MCPServerInput> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (typeof body.command === 'string') updates.command = body.command.trim();
  if (Array.isArray(body.args)) {
    updates.args = body.args
      .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item: string) => item.length > 0);
  }
  if (body.env && typeof body.env === 'object') {
    updates.env = Object.entries(body.env as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof key === 'string' && key.trim()) {
          acc[key.trim()] = typeof value === 'string' ? value : String(value ?? '');
        }
        return acc;
      },
      {},
    );
  }
  if (Array.isArray(body.tags)) {
    updates.tags = body.tags
      .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item: string) => item.length > 0);
  }
  if (Array.isArray(body.providers)) {
    updates.providers = body.providers
      .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item: string) => item.length > 0);
  }
  if (Array.isArray(body.supportedModels)) {
    updates.supportedModels = body.supportedModels
      .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item: string) => item.length > 0);
  }
  if (Array.isArray(body.tools)) {
    updates.tools = body.tools
      .map((item: any) => {
        if (!item || typeof item !== 'object') return null;
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        if (!name) return null;
        return {
          name,
          description:
            typeof item.description === 'string' ? item.description.trim() : undefined,
        };
      })
      .filter((tool): tool is { name: string; description?: string } => Boolean(tool));
  }
  if (body.status === 'active' || body.status === 'disabled') {
    updates.status = body.status;
  }
  if (typeof body.timeout === 'number') {
    updates.timeout = body.timeout;
  }
  return updates;
}

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<MCPServerDefinition>>> {
  const { id } = params;
  const server = await configManager.getMcpServer(id);
  if (!server) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MCP_NOT_FOUND',
          message: '未找到指定的 MCP 服务',
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: server });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<MCPServerDefinition>>> {
  const { id } = params;
  const body = await request.json();
  const updates = normalizeUpdates(body);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EMPTY_UPDATES',
          message: '缺少需要更新的字段',
        },
      },
      { status: 400 }
    );
  }

  const server = await configManager.updateMcpServer(id, updates);
  if (!server) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MCP_NOT_FOUND',
          message: '未找到指定的 MCP 服务',
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: server });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  const { id } = params;
  const removed = await configManager.deleteMcpServer(id);
  if (!removed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MCP_NOT_FOUND',
          message: '未找到指定的 MCP 服务',
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
