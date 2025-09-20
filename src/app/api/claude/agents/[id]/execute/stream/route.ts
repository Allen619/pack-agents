import { NextRequest } from 'next/server';
import { ClaudeAgent } from '@/lib/claude/core/agent';
import { ConfigManager } from '@/lib/storage/config-manager';
import { getSSEManager } from '@/lib/claude/streaming/sse-manager';
import { generateId } from '@/lib/utils';

/**
 * 流式执行Claude Agent
 * 基于 Claude Code SDK 流式特性的实时执行API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { prompt, options = {} } = await request.json();
    const configManager = new ConfigManager();

    // 加载Agent配置
    const agentConfig = await configManager.loadAgent(params.id);
    if (!agentConfig) {
      return new Response(
        JSON.stringify({
          error: 'Agent not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 验证Agent配置
    if (!agentConfig.claudeConfig) {
      return new Response(
        JSON.stringify({
          error: 'Agent is not configured for Claude Code SDK',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 创建执行ID
    const executionId = generateId();

    // 创建Claude Agent实例
    const agent = new ClaudeAgent(agentConfig);

    // 获取SSE管理器
    const sseManager = getSSEManager();

    // 订阅Agent执行流
    return await sseManager.subscribeToAgentExecution(
      executionId,
      agent,
      request
    );
  } catch (error: any) {
    console.error('Stream execution error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'STREAM_EXECUTION_ERROR',
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 获取流式执行的连接状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return new Response(
        JSON.stringify({
          error: 'Execution ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const sseManager = getSSEManager();
    const isActive = sseManager.isConnectionActive(executionId);
    const stats = sseManager.getConnectionStats();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          executionId,
          isActive,
          agentId: params.id,
          connectionStats: stats,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Get stream status error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_STREAM_STATUS_ERROR',
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 关闭流式执行连接
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return new Response(
        JSON.stringify({
          error: 'Execution ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const sseManager = getSSEManager();
    sseManager.closeConnection(executionId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          executionId,
          agentId: params.id,
          closed: true,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Close stream error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'CLOSE_STREAM_ERROR',
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
