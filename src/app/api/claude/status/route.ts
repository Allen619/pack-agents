// Claude 状态检查和测试 API 接口
import { NextRequest, NextResponse } from 'next/server';
import { testClaudeConnection, claudeIntegration } from '@/lib/claude';
import { ApiResponse } from '@/types';
import { apiLogger, logApiRequest } from '@/lib/logging/logger';
import { generateId } from '@/utils';

// 获取 Claude 集成状态
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateId();

  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');

    apiLogger.info('Getting Claude status', {
      requestId,
      agentId,
    });

    // 获取基本统计信息
    const stats = await claudeIntegration.getStats();

    // 获取配置信息（不包含敏感信息）
    const configManager = claudeIntegration.getConfigManager();
    const config = await configManager.getClaudeConfig(agentId || undefined);

    // 获取工具权限配置
    const toolPermissions = await configManager.getToolPermissions();

    // 获取知识库配置（如果有 agentId）
    let knowledgeBaseConfig = null;
    if (agentId) {
      knowledgeBaseConfig = await configManager.getKnowledgeBaseConfig(agentId);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        status: {
          isInitialized: stats.isInitialized,
          model: config.model,
          hasApiKey: !!config.apiKey,
          baseURL: config.baseURL,
        },
        sessions: stats.sessionStats,
        configuration: {
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          toolPermissions: {
            allowedCommands: toolPermissions.allowedCommands,
            maxFileSize: toolPermissions.maxFileSize,
            timeout: toolPermissions.timeout,
            sandboxMode: toolPermissions.sandboxMode,
          },
          knowledgeBase: knowledgeBaseConfig
            ? {
                enabled: knowledgeBaseConfig.enabled,
                pathsCount: knowledgeBaseConfig.paths.length,
                maxDepth: knowledgeBaseConfig.maxDepth,
                maxFileSize: knowledgeBaseConfig.maxFileSize,
              }
            : null,
        },
        timestamp: new Date().toISOString(),
      },
    };

    logApiRequest('GET', '/api/claude/status', 200, Date.now() - startTime, {
      requestId,
    });
    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error('Error getting Claude status', {
      requestId,
      error: error.message,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get Claude status',
        details: error.message,
      },
    };

    logApiRequest('GET', '/api/claude/status', 500, Date.now() - startTime, {
      requestId,
    });
    return NextResponse.json(response, { status: 500 });
  }
}

// 测试 Claude 连接
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateId();

  try {
    const body = await request.json();
    const { agentId, testPrompt } = body;

    if (!agentId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_AGENT_ID',
          message: 'Agent ID is required for connection test',
        },
      };

      logApiRequest('POST', '/api/claude/status', 400, Date.now() - startTime, {
        requestId,
      });
      return NextResponse.json(response, { status: 400 });
    }

    apiLogger.info('Testing Claude connection', {
      requestId,
      agentId,
      hasTestPrompt: !!testPrompt,
    });

    // 基础连接测试
    const connectionTest = await testClaudeConnection(agentId);

    if (!connectionTest) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Claude API connection test failed',
        },
      };

      logApiRequest('POST', '/api/claude/status', 400, Date.now() - startTime, {
        requestId,
      });
      return NextResponse.json(response, { status: 400 });
    }

    let testResult = null;

    // 如果提供了测试提示词，执行实际的 API 调用测试
    if (testPrompt && typeof testPrompt === 'string' && testPrompt.trim()) {
      try {
        const { analyzeCode } = await import('@/lib/claude');

        // 使用一个简单的分析请求作为测试
        const analysisRequest = {
          executionId: `test-${requestId}`,
          analysisTarget: 'API 连接测试',
          paths: [], // 空路径数组，只测试 API 连通性
          analysisType: 'structure' as const,
          specificQuestions: [testPrompt.trim()],
          maxTurns: 1,
          startTime: Date.now(),
        };

        const result = await analyzeCode(analysisRequest);

        testResult = {
          success: result.success,
          response: result.success ? result.content : result.error?.message,
          tokensUsed: result.metadata?.tokensUsed,
          executionTime: result.metadata?.executionTime,
        };

        apiLogger.info('Claude API test completed', {
          requestId,
          agentId,
          success: result.success,
          tokensUsed: result.metadata?.tokensUsed,
        });
      } catch (testError) {
        apiLogger.error('Claude API test failed', {
          requestId,
          agentId,
          error: testError.message,
        });

        testResult = {
          success: false,
          error: testError.message,
        };
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        connectionTest: {
          success: connectionTest,
          timestamp: new Date().toISOString(),
        },
        apiTest: testResult,
        agentId,
      },
    };

    logApiRequest('POST', '/api/claude/status', 200, Date.now() - startTime, {
      requestId,
    });
    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error('Error testing Claude connection', {
      requestId,
      error: error.message,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'Failed to test Claude connection',
        details: error.message,
      },
    };

    logApiRequest('POST', '/api/claude/status', 500, Date.now() - startTime, {
      requestId,
    });
    return NextResponse.json(response, { status: 500 });
  }
}
