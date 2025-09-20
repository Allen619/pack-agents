// Agent 模板管理 API
import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ApiResponse } from '@/types';

const configManager = new ConfigManager();

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const templates = await configManager.listAgentTemplates();

    return NextResponse.json({
      success: true,
      data: templates,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Agent templates GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEMPLATES_FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取模板列表失败',
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
    const { templateId, overrides } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TEMPLATE_ID',
            message: '缺少模板ID',
          },
        },
        { status: 400 }
      );
    }

    const agent = await configManager.createAgentFromTemplate(
      templateId,
      overrides
    );

    return NextResponse.json({
      success: true,
      data: agent,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Agent template POST error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEMPLATE_CREATE_ERROR',
          message:
            error instanceof Error ? error.message : '从模板创建Agent失败',
        },
      },
      { status: 500 }
    );
  }
}
