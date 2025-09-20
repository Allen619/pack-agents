// 配置管理统一入口 API
import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ApiResponse } from '@/types';

const configManager = new ConfigManager();

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    await configManager.initialize();

    const [agents, workflows, activeExecutions, appConfig] = await Promise.all([
      configManager.listAgents(),
      configManager.listWorkflows(),
      configManager.listActiveExecutions(),
      configManager.getAppConfig(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        agents,
        workflows,
        activeExecutions,
        appConfig,
        stats: {
          totalAgents: agents.length,
          totalWorkflows: workflows.length,
          activeExecutions: activeExecutions.length,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Config API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFIG_LOAD_ERROR',
          message: error instanceof Error ? error.message : '配置加载失败',
          details: error,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
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
    const { action } = await request.json();

    switch (action) {
      case 'initialize':
        await configManager.initialize();
        return NextResponse.json({
          success: true,
          data: { message: '配置系统初始化成功' },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `不支持的操作: ${action}`,
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Config POST error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFIG_ACTION_ERROR',
          message: error instanceof Error ? error.message : '配置操作失败',
        },
      },
      { status: 500 }
    );
  }
}
