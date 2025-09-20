// Agent 管理 API
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ConfigValidator } from '@/lib/storage/validation';
import { AgentConfig, ApiResponse } from '@/types';

const configManager = new ConfigManager();
const validator = new ConfigValidator();

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let agents = await configManager.listAgents();

    // 过滤
    if (role && role !== 'all') {
      agents = agents.filter((agent) => agent.role === role);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      agents = agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.description.toLowerCase().includes(searchLower) ||
          agent.metadata.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
      );
    }

    // 分页
    const total = agents.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAgents = agents.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedAgents,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Agents GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AGENTS_FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取Agent列表失败',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const agentData = await request.json();

    // 创建Agent配置
    const agent: AgentConfig = {
      id: nanoid(),
      name: agentData.name,
      description: agentData.description || '',
      role: agentData.role,
      systemPrompt: agentData.systemPrompt,
      llmConfig: agentData.llmConfig,
      knowledgeBasePaths: agentData.knowledgeBasePaths || [],
      enabledTools: agentData.enabledTools || [],
      metadata: {
        version: '1.0.0',
        author: agentData.author || 'user',
        tags: agentData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usage: {
          totalExecutions: 0,
          successRate: 0,
          avgExecutionTime: 0,
        },
      },
    };

    // 验证Agent配置
    const validation = validator.validateAgent(agent);
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

    // 保存Agent
    await configManager.saveAgent(agent);

    return NextResponse.json({
      success: true,
      data: agent,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Agents POST error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AGENT_CREATE_ERROR',
          message: error instanceof Error ? error.message : '创建Agent失败',
        },
      },
      { status: 500 }
    );
  }
}
