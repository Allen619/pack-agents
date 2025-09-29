// 单个 Agent 操作 API
import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ConfigValidator } from '@/lib/storage/validation';
import { ApiResponse } from '@/types';

const configManager = new ConfigManager();
const validator = new ConfigValidator();

// 缓存控制头部
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', // 5分钟缓存
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const agent = await configManager.loadAgent(params.id);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Agent ${params.id} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    }, {
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Agent GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AGENT_FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取Agent失败',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const agent = await configManager.loadAgent(params.id);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Agent ${params.id} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    const updates = await request.json();

    // 更新Agent配置
    const updatedAgent = {
      ...agent,
      ...updates,
      id: agent.id, // 确保ID不被修改
      metadata: {
        ...agent.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    // 验证更新后的Agent配置
    const validation = validator.validateAgent(updatedAgent);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Agent配置验证失败',
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    // 保存更新
    await configManager.saveAgent(updatedAgent);

    return NextResponse.json({
      success: true,
      data: updatedAgent,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Agent PUT error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AGENT_UPDATE_ERROR',
          message: error instanceof Error ? error.message : '更新Agent失败',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const agent = await configManager.loadAgent(params.id);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Agent ${params.id} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    // 检查是否有工作流正在使用此Agent
    const workflows = await configManager.listWorkflows();
    const usingWorkflows = workflows.filter(
      (workflow) =>
        workflow.agentIds.includes(params.id) ||
        workflow.mainAgentId === params.id
    );

    if (usingWorkflows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AGENT_IN_USE',
            message: `无法删除Agent，它正在被 ${usingWorkflows.length} 个工作流使用`,
            details: usingWorkflows.map((w) => ({ id: w.id, name: w.name })),
          },
        },
        { status: 400 }
      );
    }

    // 删除Agent
    await configManager.deleteAgent(params.id);

    return NextResponse.json({
      success: true,
      data: {
        message: `Agent ${agent.name} 已删除`,
        deletedAgent: { id: agent.id, name: agent.name },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Agent DELETE error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AGENT_DELETE_ERROR',
          message: error instanceof Error ? error.message : '删除Agent失败',
        },
      },
      { status: 500 }
    );
  }
}
