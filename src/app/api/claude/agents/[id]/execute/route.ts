import { NextRequest, NextResponse } from 'next/server';
import { ClaudeAgent } from '@/lib/claude/core/agent';
import { ConfigManager } from '@/lib/storage/config-manager';
import { getExecutionStore } from '@/lib/storage/session-store';
import { generateId } from '@/lib/utils';

/**
 * 执行指定的Claude Agent
 * 基于 Claude Code SDK 的全新API实现
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { prompt, options = {} } = await request.json();
    const configManager = new ConfigManager();
    const executionStore = getExecutionStore();

    // 加载Agent配置
    const agentConfig = await configManager.loadAgent(params.id);
    if (!agentConfig) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
          },
        },
        { status: 404 }
      );
    }

    // 验证Agent配置是否为Claude Agent格式
    if (!agentConfig.claudeConfig) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_AGENT_CONFIG',
            message: 'Agent is not configured for Claude Code SDK',
          },
        },
        { status: 400 }
      );
    }

    // 创建Claude Agent实例
    const agent = new ClaudeAgent(agentConfig);

    // 生成执行ID
    const executionId = generateId();

    // 执行任务
    const result = await agent.execute(prompt, {
      ...options,
      onProgress: (progress) => {
        // 这里可以通过SSE发送进度更新
        console.log(`Agent ${params.id} progress:`, progress);
      },
    });

    // 保存执行记录
    const executionRecord = {
      id: executionId,
      agentId: params.id,
      prompt,
      result,
      timestamp: new Date().toISOString(),
      status: result.success ? 'completed' : 'failed',
      metadata: {
        sessionId: result.sessionId,
        tokensUsed: result.metadata?.tokensUsed,
        executionTime: result.metadata?.executionTime,
        toolsUsed: result.metadata?.toolsUsed,
      },
    };

    await executionStore.saveExecutionRecord(executionRecord);

    return NextResponse.json({
      success: true,
      data: {
        executionId,
        result,
        sessionId: result.sessionId,
        metadata: result.metadata,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: executionId,
      },
    });
  } catch (error: any) {
    console.error('Agent execution error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AGENT_EXECUTION_ERROR',
          message: error.message,
          details:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 获取Agent执行状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_EXECUTION_ID',
            message: 'Execution ID is required',
          },
        },
        { status: 400 }
      );
    }

    const executionStore = getExecutionStore();
    const execution = await executionStore.loadExecutionRecord(executionId);

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXECUTION_NOT_FOUND',
            message: 'Execution record not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        execution,
        status: execution.status,
        agentId: execution.agentId,
        timestamp: execution.timestamp,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get execution status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_EXECUTION_STATUS_ERROR',
          message: error.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
