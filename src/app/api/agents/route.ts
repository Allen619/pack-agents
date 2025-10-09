export const dynamic = 'force-dynamic';

// Agent 管理 API
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ConfigValidator } from '@/lib/storage/validation';
import { isAbsoluteKnowledgePath, syncMcpBindings } from '@/lib/storage/mcp-binding';
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

    const mcpServerIds = Array.isArray(agentData.mcpServerIds)
      ? agentData.mcpServerIds
          .map((id: unknown) => (typeof id === 'string' ? id.trim() : ''))
          .filter((id: string) => id.length > 0)
      : [];

    const knowledgeBasePathsInput = Array.isArray(agentData.knowledgeBasePaths)
      ? agentData.knowledgeBasePaths
      : typeof agentData.knowledgeBasePaths === 'string'
        ? [agentData.knowledgeBasePaths]
        : [];

    const knowledgeBasePaths = knowledgeBasePathsInput
      .map((input: unknown) => (typeof input === 'string' ? input.trim() : ''))
      .filter((input: string) => input.length > 0);

    const invalidPaths = knowledgeBasePaths.filter(
      (item) => !isAbsoluteKnowledgePath(item)
    );

    if (invalidPaths.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_KNOWLEDGE_PATH',
            message: '知识库路径必须为绝对路径',
            details: invalidPaths,
          },
        },
        { status: 400 }
      );
    }

    // 创建Agent配置
    const now = new Date().toISOString();
    const metadataInput = agentData.metadata ?? {};
    const llmConfigInput = agentData.llmConfig ?? {};

    const agent: AgentConfig = {
      id: nanoid(),
      name: agentData.name,
      description: agentData.description || '',
      role: agentData.role,
      systemPrompt: agentData.systemPrompt,
      llmConfig: {
        provider: llmConfigInput.provider || 'others',
        model: llmConfigInput.model,
        baseUrl: (llmConfigInput.baseUrl || '').trim(),
        apiKey: (llmConfigInput.apiKey || '').trim(),
        capabilities: llmConfigInput.capabilities || {
          language: true,
          vision: false,
          web: false,
        },
        parameters: llmConfigInput.parameters || {},
      },
      knowledgeBasePaths,
      enabledTools: Array.isArray(agentData.enabledTools)
        ? agentData.enabledTools
        : [],
      mcpServerIds,
      metadata: {
        version: metadataInput.version || '1.0.0',
        author: metadataInput.author || 'user',
        tags: metadataInput.tags || [],
        createdAt: metadataInput.createdAt || now,
        updatedAt: now,
        usage: metadataInput.usage || {
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
    await syncMcpBindings(configManager, agent.knowledgeBasePaths, agent.mcpServerIds);

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
          message:
            error instanceof Error ? error.message : '创建Agent失败',
        },
      },
      { status: 500 }
    );
  }
}
