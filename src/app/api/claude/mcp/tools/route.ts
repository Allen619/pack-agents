import { NextRequest, NextResponse } from 'next/server';
import {
  createDefaultMCPProvider,
  MCPToolExecutor,
} from '@/lib/claude/tools/mcp-provider';

/**
 * 获取可用的MCP工具列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get('server');
    const category = searchParams.get('category');

    const mcpProvider = createDefaultMCPProvider();

    // 初始化MCP服务器
    await mcpProvider.initializeServers();

    // 获取可用工具
    const tools = await mcpProvider.getAvailableTools();

    // 根据参数过滤
    let filteredTools = tools;

    if (serverName) {
      filteredTools = filteredTools.filter(
        (tool) => tool.serverName === serverName
      );
    }

    if (category) {
      // 简单的分类逻辑，实际应该根据工具的metadata进行分类
      filteredTools = filteredTools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(category.toLowerCase()) ||
          tool.description.toLowerCase().includes(category.toLowerCase())
      );
    }

    // 获取服务器状态
    const serverStatus = mcpProvider.getServerStatus();

    return NextResponse.json({
      success: true,
      data: {
        tools: filteredTools,
        serverStatus,
        totalTools: tools.length,
        filteredCount: filteredTools.length,
        categories: this.extractCategories(tools),
      },
      meta: {
        timestamp: new Date().toISOString(),
        filters: { serverName, category },
      },
    });
  } catch (error: any) {
    console.error('Get MCP tools error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_MCP_TOOLS_ERROR',
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
 * 执行MCP工具
 */
export async function POST(request: NextRequest) {
  try {
    const {
      serverName,
      toolName,
      args = {},
      timeout = 30000,
    } = await request.json();

    if (!serverName || !toolName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Server name and tool name are required',
          },
        },
        { status: 400 }
      );
    }

    const mcpProvider = createDefaultMCPProvider();
    await mcpProvider.initializeServers();

    // 执行工具
    const startTime = Date.now();
    const result = await Promise.race([
      mcpProvider.callTool(serverName, toolName, args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
      ),
    ]);
    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        result,
        metadata: {
          serverName,
          toolName,
          executionTime,
          timestamp: new Date().toISOString(),
          args: args,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTime,
      },
    });
  } catch (error: any) {
    console.error('Execute MCP tool error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXECUTE_MCP_TOOL_ERROR',
          message: error.message,
          details: {
            serverName: (await request.json()).serverName,
            toolName: (await request.json()).toolName,
          },
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
 * 测试MCP服务器连接
 */
export async function PUT(request: NextRequest) {
  try {
    const { serverName, action } = await request.json();

    if (!serverName || !action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Server name and action are required',
          },
        },
        { status: 400 }
      );
    }

    if (!['test', 'reconnect', 'disconnect'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be one of: test, reconnect, disconnect',
          },
        },
        { status: 400 }
      );
    }

    const mcpProvider = createDefaultMCPProvider();

    let result;
    switch (action) {
      case 'test':
        await mcpProvider.initializeServers();
        const status = mcpProvider.getServerStatus();
        result = {
          connected: status[serverName]?.connected || false,
          status: status[serverName] || null,
        };
        break;

      case 'reconnect':
        await mcpProvider.reconnectServer(serverName);
        result = {
          reconnected: true,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'disconnect':
        await mcpProvider.disconnect();
        result = {
          disconnected: true,
          timestamp: new Date().toISOString(),
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        serverName,
        action,
        result,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('MCP server action error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MCP_SERVER_ACTION_ERROR',
          message: error.message,
          details: { serverName: (await request.json()).serverName },
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
 * 辅助函数：从工具列表中提取分类
 */
function extractCategories(tools: any[]): string[] {
  const categories = new Set<string>();

  tools.forEach((tool) => {
    // 根据工具名称推断分类
    const name = tool.name.toLowerCase();

    if (name.includes('code') || name.includes('analyze')) {
      categories.add('code-analysis');
    } else if (name.includes('git')) {
      categories.add('version-control');
    } else if (name.includes('project') || name.includes('manage')) {
      categories.add('project-management');
    } else if (name.includes('database') || name.includes('sql')) {
      categories.add('database');
    } else if (
      name.includes('file') ||
      name.includes('read') ||
      name.includes('write')
    ) {
      categories.add('file-operations');
    } else {
      categories.add('general');
    }
  });

  return Array.from(categories);
}
