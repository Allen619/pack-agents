// Claude 代码分析 API 接口
import { NextRequest, NextResponse } from 'next/server';
import { analyzeCode, initializeClaude } from '@/lib/claude';
import { ApiResponse } from '@/types';
import { apiLogger, logApiRequest } from '@/lib/logging/logger';
import { generateId } from '@/utils';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateId();

  try {
    const body = await request.json();

    // 验证请求参数
    const {
      agentId,
      analysisTarget,
      paths,
      analysisType = 'full',
      specificQuestions,
      maxTurns = 3,
    } = body;

    if (!agentId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_AGENT_ID',
          message: 'Agent ID is required',
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/analyze',
        400,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 400 });
    }

    if (
      !analysisTarget ||
      !paths ||
      !Array.isArray(paths) ||
      paths.length === 0
    ) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'analysisTarget and paths array are required',
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/analyze',
        400,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 400 });
    }

    // 验证分析类型
    const validAnalysisTypes = [
      'structure',
      'quality',
      'security',
      'performance',
      'full',
    ];
    if (!validAnalysisTypes.includes(analysisType)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_ANALYSIS_TYPE',
          message: `Invalid analysis type. Must be one of: ${validAnalysisTypes.join(', ')}`,
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/analyze',
        400,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 400 });
    }

    apiLogger.info('Starting code analysis request', {
      requestId,
      agentId,
      analysisType,
      pathsCount: paths.length,
    });

    // 初始化 Claude（如果需要）
    try {
      await initializeClaude(agentId);
    } catch (initError) {
      apiLogger.error('Failed to initialize Claude', {
        requestId,
        agentId,
        error: initError.message,
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CLAUDE_INIT_ERROR',
          message: 'Failed to initialize Claude integration',
          details: initError.message,
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/analyze',
        500,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 500 });
    }

    // 执行代码分析
    const analysisRequest = {
      executionId: `analysis-${requestId}`,
      analysisTarget,
      paths,
      analysisType,
      specificQuestions,
      maxTurns,
      startTime: Date.now(),
    };

    const result = await analyzeCode(analysisRequest);

    if (result.success) {
      apiLogger.info('Code analysis completed successfully', {
        requestId,
        agentId,
        tokensUsed: result.metadata?.tokensUsed,
        executionTime: result.metadata?.executionTime,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          analysis: result.content,
          metadata: result.metadata,
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/analyze',
        200,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response);
    } else {
      apiLogger.error('Code analysis failed', {
        requestId,
        agentId,
        error: result.error?.message,
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: result.error?.code || 'ANALYSIS_ERROR',
          message: result.error?.message || 'Code analysis failed',
          details: result.error?.details,
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/analyze',
        500,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    apiLogger.error('Unexpected error in code analysis API', {
      requestId,
      error: error.message,
      stack: error.stack,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    };

    logApiRequest('POST', '/api/claude/analyze', 500, Date.now() - startTime, {
      requestId,
    });
    return NextResponse.json(response, { status: 500 });
  }
}

// 获取支持的分析类型
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const response: ApiResponse = {
      success: true,
      data: {
        analysisTypes: [
          {
            type: 'structure',
            name: '结构分析',
            description: '分析代码架构、模块划分、设计模式的使用',
          },
          {
            type: 'quality',
            name: '质量分析',
            description: '分析代码质量、规范性、可读性、可维护性',
          },
          {
            type: 'security',
            name: '安全分析',
            description: '分析安全漏洞、数据验证、权限控制',
          },
          {
            type: 'performance',
            name: '性能分析',
            description: '分析性能瓶颈、算法复杂度、资源使用',
          },
          {
            type: 'full',
            name: '全面分析',
            description: '进行全面分析，包括结构、质量、安全、性能等各个方面',
          },
        ],
        supportedFileTypes: [
          '.js',
          '.ts',
          '.jsx',
          '.tsx',
          '.py',
          '.java',
          '.cpp',
          '.c',
          '.h',
          '.go',
          '.rs',
          '.php',
          '.rb',
          '.swift',
          '.kt',
          '.scala',
          '.css',
          '.scss',
          '.less',
          '.html',
          '.vue',
          '.md',
          '.json',
          '.yaml',
          '.yml',
          '.xml',
          '.sql',
        ],
      },
    };

    logApiRequest('GET', '/api/claude/analyze', 200, Date.now() - startTime);
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get analysis types',
      },
    };

    logApiRequest('GET', '/api/claude/analyze', 500, Date.now() - startTime);
    return NextResponse.json(response, { status: 500 });
  }
}
