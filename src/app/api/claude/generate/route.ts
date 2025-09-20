// Claude 代码生成 API 接口
import { NextRequest, NextResponse } from 'next/server';
import { generateCode, initializeClaude } from '@/lib/claude';
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
      prompt,
      contextFiles,
      projectContext,
      maxTurns = 5,
      language,
      framework,
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
        '/api/claude/generate',
        400,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 400 });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_PROMPT',
          message: 'A valid prompt is required',
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/generate',
        400,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 400 });
    }

    // 验证上下文文件格式
    if (contextFiles && !Array.isArray(contextFiles)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_CONTEXT_FILES',
          message: 'contextFiles must be an array',
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/generate',
        400,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 400 });
    }

    // 验证上下文文件内容
    if (contextFiles) {
      for (let i = 0; i < contextFiles.length; i++) {
        const file = contextFiles[i];
        if (!file.path || !file.content || !file.language) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'INVALID_CONTEXT_FILE',
              message: `Context file at index ${i} must have path, content, and language fields`,
            },
          };

          logApiRequest(
            'POST',
            '/api/claude/generate',
            400,
            Date.now() - startTime,
            { requestId }
          );
          return NextResponse.json(response, { status: 400 });
        }
      }
    }

    apiLogger.info('Starting code generation request', {
      requestId,
      agentId,
      promptLength: prompt.length,
      contextFilesCount: contextFiles?.length || 0,
      hasProjectContext: !!projectContext,
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
        '/api/claude/generate',
        500,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 500 });
    }

    // 构建项目上下文
    const enhancedProjectContext = {
      ...projectContext,
      language: language || projectContext?.language,
      framework: framework || projectContext?.framework,
    };

    // 执行代码生成
    const generationRequest = {
      executionId: `generation-${requestId}`,
      prompt: prompt.trim(),
      contextFiles,
      projectContext: enhancedProjectContext,
      maxTurns,
      startTime: Date.now(),
      progressCallback: (progress) => {
        // 这里可以实现 SSE 推送进度更新
        apiLogger.debug('Generation progress', {
          requestId,
          agentId,
          ...progress,
        });
      },
    };

    const result = await generateCode(generationRequest);

    if (result.success) {
      apiLogger.info('Code generation completed successfully', {
        requestId,
        agentId,
        filesGenerated: result.files?.length || 0,
        tokensUsed: result.metadata?.tokensUsed,
        executionTime: result.metadata?.executionTime,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          content: result.content,
          files: result.files,
          metadata: result.metadata,
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/generate',
        200,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response);
    } else {
      apiLogger.error('Code generation failed', {
        requestId,
        agentId,
        error: result.error?.message,
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: result.error?.code || 'GENERATION_ERROR',
          message: result.error?.message || 'Code generation failed',
          details: result.error?.details,
        },
      };

      logApiRequest(
        'POST',
        '/api/claude/generate',
        500,
        Date.now() - startTime,
        { requestId }
      );
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    apiLogger.error('Unexpected error in code generation API', {
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

    logApiRequest('POST', '/api/claude/generate', 500, Date.now() - startTime, {
      requestId,
    });
    return NextResponse.json(response, { status: 500 });
  }
}

// 获取支持的语言和框架
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const response: ApiResponse = {
      success: true,
      data: {
        supportedLanguages: [
          {
            code: 'javascript',
            name: 'JavaScript',
            extensions: ['.js', '.mjs'],
          },
          { code: 'typescript', name: 'TypeScript', extensions: ['.ts'] },
          { code: 'jsx', name: 'React JSX', extensions: ['.jsx'] },
          { code: 'tsx', name: 'React TSX', extensions: ['.tsx'] },
          { code: 'python', name: 'Python', extensions: ['.py'] },
          { code: 'java', name: 'Java', extensions: ['.java'] },
          { code: 'cpp', name: 'C++', extensions: ['.cpp', '.cc', '.cxx'] },
          { code: 'c', name: 'C', extensions: ['.c', '.h'] },
          { code: 'go', name: 'Go', extensions: ['.go'] },
          { code: 'rust', name: 'Rust', extensions: ['.rs'] },
          { code: 'php', name: 'PHP', extensions: ['.php'] },
          { code: 'ruby', name: 'Ruby', extensions: ['.rb'] },
          { code: 'swift', name: 'Swift', extensions: ['.swift'] },
          { code: 'kotlin', name: 'Kotlin', extensions: ['.kt'] },
          { code: 'scala', name: 'Scala', extensions: ['.scala'] },
          { code: 'css', name: 'CSS', extensions: ['.css'] },
          { code: 'scss', name: 'SCSS', extensions: ['.scss'] },
          { code: 'html', name: 'HTML', extensions: ['.html'] },
          { code: 'vue', name: 'Vue', extensions: ['.vue'] },
          { code: 'json', name: 'JSON', extensions: ['.json'] },
          { code: 'yaml', name: 'YAML', extensions: ['.yaml', '.yml'] },
          { code: 'sql', name: 'SQL', extensions: ['.sql'] },
        ],
        supportedFrameworks: [
          { code: 'react', name: 'React', language: 'javascript' },
          { code: 'nextjs', name: 'Next.js', language: 'javascript' },
          { code: 'vue', name: 'Vue.js', language: 'javascript' },
          { code: 'angular', name: 'Angular', language: 'typescript' },
          { code: 'express', name: 'Express.js', language: 'javascript' },
          { code: 'fastapi', name: 'FastAPI', language: 'python' },
          { code: 'django', name: 'Django', language: 'python' },
          { code: 'flask', name: 'Flask', language: 'python' },
          { code: 'spring', name: 'Spring Boot', language: 'java' },
          { code: 'laravel', name: 'Laravel', language: 'php' },
          { code: 'rails', name: 'Ruby on Rails', language: 'ruby' },
        ],
        generationTypes: [
          {
            type: 'component',
            name: '组件生成',
            description: '生成 UI 组件或功能模块',
          },
          {
            type: 'api',
            name: 'API 接口',
            description: '生成 API 路由和控制器',
          },
          {
            type: 'utility',
            name: '工具函数',
            description: '生成通用工具函数和辅助方法',
          },
          {
            type: 'test',
            name: '测试代码',
            description: '生成单元测试和集成测试',
          },
          {
            type: 'config',
            name: '配置文件',
            description: '生成配置文件和环境设置',
          },
          {
            type: 'full',
            name: '完整功能',
            description: '生成完整的功能模块，包含多个文件',
          },
        ],
      },
    };

    logApiRequest('GET', '/api/claude/generate', 200, Date.now() - startTime);
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get generation options',
      },
    };

    logApiRequest('GET', '/api/claude/generate', 500, Date.now() - startTime);
    return NextResponse.json(response, { status: 500 });
  }
}
