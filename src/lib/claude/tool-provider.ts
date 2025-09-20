// Claude Code SDK 工具提供者 - 核心实现
import Anthropic from '@anthropic-ai/sdk';
import {
  ClaudeCodeConfig,
  ClaudeSessionInfo,
  CodeAnalysisRequest,
  CodeGenerationRequest,
  ToolResult,
  ClaudeCodeExecutionOptions,
  ClaudeMessage,
  ClaudeResponse,
  KnowledgeBaseConfig,
  ToolPermissions,
} from './types';
import { ClaudeSessionManager } from './session-manager';
import { ClaudeCodeConfigManager } from './config-manager';
import { promises as fs } from 'fs';
import path from 'path';

export class ClaudeCodeToolProvider {
  private anthropic: Anthropic;
  private sessionManager: ClaudeSessionManager;
  private configManager: ClaudeCodeConfigManager;
  private config: ClaudeCodeConfig;

  constructor(config: ClaudeCodeConfig, configRoot?: string) {
    this.config = config;
    this.configManager = new ClaudeCodeConfigManager(configRoot);
    this.sessionManager = new ClaudeSessionManager();

    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  // 代码分析功能
  async executeCodeAnalysis(request: CodeAnalysisRequest): Promise<ToolResult> {
    const sessionId = await this.sessionManager.createSession(
      request.executionId
    );

    try {
      // 构建分析提示词
      const analysisPrompt = await this.buildAnalysisPrompt(request);

      // 获取知识库配置
      const knowledgeBase = await this.configManager.getKnowledgeBaseConfig(
        request.executionId
      );

      // 执行分析
      const response = await this.executeClaudeQuery({
        prompt: analysisPrompt,
        sessionId,
        options: {
          maxTurns: request.maxTurns || 3,
          knowledgeBase,
        },
      });

      const analysisResult = this.parseAnalysisResult(response);

      return {
        type: 'code_analysis',
        success: true,
        content: analysisResult,
        metadata: {
          sessionId,
          tokensUsed: response.usage?.total_tokens,
          executionTime: Date.now() - request.startTime,
          toolsUsed: response.toolsInvoked || [],
        },
      };
    } catch (error) {
      await this.sessionManager.handleError(sessionId, error as Error);
      return {
        type: 'code_analysis',
        success: false,
        error: {
          message: (error as Error).message,
          code: 'CLAUDE_CODE_ANALYSIS_ERROR',
          details: error,
        },
      };
    }
  }

  // 代码生成功能
  async generateCode(request: CodeGenerationRequest): Promise<ToolResult> {
    const sessionId = await this.sessionManager.createSession(
      request.executionId
    );

    try {
      // 构建生成提示词
      const generationPrompt = await this.buildGenerationPrompt(request);

      // 获取知识库配置
      const knowledgeBase = await this.configManager.getKnowledgeBaseConfig(
        request.executionId
      );

      // 执行代码生成
      const response = await this.executeClaudeQuery({
        prompt: generationPrompt,
        sessionId,
        options: {
          maxTurns: request.maxTurns || 5,
          knowledgeBase,
        },
      });

      // 解析生成的文件
      const generatedFiles = this.extractGeneratedFiles(response.content);

      return {
        type: 'code_generation',
        success: true,
        content: response.content,
        files: generatedFiles,
        metadata: {
          sessionId,
          tokensUsed: response.usage?.total_tokens,
          executionTime: Date.now() - request.startTime,
          filesGenerated: generatedFiles.length,
        },
      };
    } catch (error) {
      await this.sessionManager.handleError(sessionId, error as Error);
      return {
        type: 'code_generation',
        success: false,
        error: {
          message: (error as Error).message,
          code: 'CODE_GENERATION_ERROR',
          details: error,
        },
      };
    }
  }

  // 执行 Claude 查询
  private async executeClaudeQuery(params: {
    prompt: string;
    sessionId: string;
    options?: ClaudeCodeExecutionOptions;
  }): Promise<ClaudeResponse> {
    const { prompt, sessionId, options } = params;

    // 获取会话历史
    const messages = await this.sessionManager.getMessages(sessionId);

    // 构建消息历史
    const messageHistory: Anthropic.MessageParam[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 添加当前查询
    messageHistory.push({
      role: 'user',
      content: prompt,
    });

    try {
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.1,
        messages: messageHistory,
      });

      const content = this.extractContentFromResponse(response);

      // 保存消息到会话历史
      await this.sessionManager.addMessage(sessionId, {
        role: 'user',
        content: prompt,
      });

      await this.sessionManager.addMessage(sessionId, {
        role: 'assistant',
        content,
        metadata: {
          tokens: response.usage.output_tokens,
        },
      });

      return {
        content,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
        sessionId,
        finished: response.stop_reason === 'end_turn',
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API call failed: ${(error as Error).message}`);
    }
  }

  // 构建代码分析提示词
  private async buildAnalysisPrompt(
    request: CodeAnalysisRequest
  ): Promise<string> {
    const knowledgeBase = await this.configManager.getKnowledgeBaseConfig(
      request.executionId
    );

    let contextFiles = '';
    if (knowledgeBase.enabled && request.paths.length > 0) {
      contextFiles = await this.loadContextFiles(request.paths, knowledgeBase);
    }

    const analysisTypeInstructions = this.getAnalysisTypeInstructions(
      request.analysisType
    );

    return `
你是一个专业的代码分析师。请对以下代码进行深入分析：

## 分析目标
${request.analysisTarget}

## 分析类型
${request.analysisType} - ${analysisTypeInstructions}

## 目标路径
${request.paths.join(', ')}

${
  request.specificQuestions?.length > 0
    ? `
## 具体问题
${request.specificQuestions.join('\n')}
`
    : ''
}

${
  contextFiles
    ? `
## 代码内容
${contextFiles}
`
    : ''
}

请提供详细的分析报告，包括：
1. **代码结构分析** - 整体架构和组织方式
2. **代码质量评估** - 代码规范、可读性、可维护性
3. **潜在问题识别** - 性能问题、安全漏洞、逻辑错误
4. **改进建议** - 具体的优化方案和最佳实践
5. **依赖关系分析** - 模块间的耦合度和依赖关系

请使用清晰的结构化格式输出结果，对于发现的问题请提供具体的代码位置和修改建议。
`;
  }

  // 构建代码生成提示词
  private async buildGenerationPrompt(
    request: CodeGenerationRequest
  ): Promise<string> {
    let contextSection = '';

    // 添加上下文文件
    if (request.contextFiles && request.contextFiles.length > 0) {
      contextSection += '## 参考文件\n';
      for (const file of request.contextFiles) {
        contextSection += `
### ${file.path}
\`\`\`${file.language}
${file.content}
\`\`\`
`;
      }
    }

    // 添加项目上下文
    if (request.projectContext) {
      contextSection += '## 项目上下文\n';
      if (request.projectContext.framework) {
        contextSection += `- 框架: ${request.projectContext.framework}\n`;
      }
      if (request.projectContext.language) {
        contextSection += `- 语言: ${request.projectContext.language}\n`;
      }
      if (request.projectContext.dependencies) {
        contextSection += `- 依赖: ${request.projectContext.dependencies.join(', ')}\n`;
      }
    }

    return `
你是一个专业的代码生成专家。请根据以下需求生成高质量的代码：

## 生成需求
${request.prompt}

${contextSection}

## 生成要求
1. **代码质量** - 遵循最佳实践和编码规范
2. **可读性** - 添加适当的注释和文档
3. **健壮性** - 包含错误处理和边界情况处理
4. **可测试性** - 代码结构便于单元测试
5. **性能** - 考虑性能优化

## 输出格式
请为每个生成的文件使用以下格式：

\`\`\`filename:path/to/file.ext
// 文件内容
\`\`\`

如果需要创建多个文件，请按照逻辑顺序排列，并在每个文件前添加简要说明。

开始生成代码：
`;
  }

  // 加载上下文文件
  private async loadContextFiles(
    paths: string[],
    knowledgeBase: KnowledgeBaseConfig
  ): Promise<string> {
    let contextContent = '';

    for (const targetPath of paths) {
      try {
        const stats = await fs.stat(targetPath);

        if (stats.isFile()) {
          const content = await this.loadSingleFile(targetPath, knowledgeBase);
          if (content) {
            contextContent += `\n### ${targetPath}\n\`\`\`\n${content}\n\`\`\`\n`;
          }
        } else if (stats.isDirectory()) {
          const dirContent = await this.loadDirectoryFiles(
            targetPath,
            knowledgeBase
          );
          contextContent += dirContent;
        }
      } catch (error) {
        console.warn(`Failed to load path ${targetPath}:`, error);
      }
    }

    return contextContent;
  }

  // 加载单个文件
  private async loadSingleFile(
    filePath: string,
    knowledgeBase: KnowledgeBaseConfig
  ): Promise<string | null> {
    try {
      const stats = await fs.stat(filePath);

      // 检查文件大小限制
      if (stats.size > knowledgeBase.maxFileSize!) {
        return `[文件过大: ${stats.size} bytes > ${knowledgeBase.maxFileSize} bytes]`;
      }

      // 检查文件扩展名
      const ext = path.extname(filePath);
      const isIncluded = knowledgeBase.includePatterns?.some((pattern) =>
        this.matchPattern(filePath, pattern)
      );

      if (!isIncluded) {
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      return `[读取错误: ${(error as Error).message}]`;
    }
  }

  // 加载目录文件
  private async loadDirectoryFiles(
    dirPath: string,
    knowledgeBase: KnowledgeBaseConfig,
    currentDepth: number = 0
  ): Promise<string> {
    let content = '';

    if (currentDepth >= (knowledgeBase.maxDepth || 10)) {
      return content;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // 检查排除模式
        const isExcluded = knowledgeBase.excludePatterns?.some((pattern) =>
          this.matchPattern(fullPath, pattern)
        );

        if (isExcluded) {
          continue;
        }

        if (entry.isFile()) {
          const fileContent = await this.loadSingleFile(
            fullPath,
            knowledgeBase
          );
          if (fileContent) {
            content += `\n### ${fullPath}\n\`\`\`\n${fileContent}\n\`\`\`\n`;
          }
        } else if (entry.isDirectory()) {
          const dirContent = await this.loadDirectoryFiles(
            fullPath,
            knowledgeBase,
            currentDepth + 1
          );
          content += dirContent;
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }

    return content;
  }

  // 简单的模式匹配
  private matchPattern(filePath: string, pattern: string): boolean {
    // 将 glob 模式转换为正则表达式
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }

  // 提取响应内容
  private extractContentFromResponse(response: Anthropic.Message): string {
    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return '';
  }

  // 解析分析结果
  private parseAnalysisResult(response: ClaudeResponse): any {
    return {
      analysis: response.content,
      summary: this.extractSummary(response.content),
      issues: this.extractIssues(response.content),
      recommendations: this.extractRecommendations(response.content),
    };
  }

  // 提取生成的文件
  private extractGeneratedFiles(content: string): Array<{
    path: string;
    content: string;
    language: string;
    operation: 'create' | 'update' | 'delete';
  }> {
    const files: Array<{
      path: string;
      content: string;
      language: string;
      operation: 'create' | 'update' | 'delete';
    }> = [];

    // 匹配 ```filename:path/to/file.ext 格式
    const filePattern = /```filename:([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = filePattern.exec(content)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2].trim();
      const ext = path.extname(filePath).slice(1);

      files.push({
        path: filePath,
        content: fileContent,
        language: ext || 'text',
        operation: 'create',
      });
    }

    return files;
  }

  // 辅助方法：提取摘要
  private extractSummary(content: string): string {
    const summaryMatch = content.match(
      /## 摘要\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/
    );
    return summaryMatch ? summaryMatch[1].trim() : '';
  }

  // 辅助方法：提取问题
  private extractIssues(content: string): string[] {
    const issuesMatch = content.match(
      /## 潜在问题[\s\S]*?\n([\s\S]*?)(?=\n##|\n\*\*|$)/
    );
    if (!issuesMatch) return [];

    return issuesMatch[1]
      .split('\n')
      .filter(
        (line) => line.trim().startsWith('-') || line.trim().startsWith('*')
      )
      .map((line) => line.replace(/^[-*]\s*/, '').trim());
  }

  // 辅助方法：提取建议
  private extractRecommendations(content: string): string[] {
    const recommendationsMatch = content.match(
      /## 改进建议[\s\S]*?\n([\s\S]*?)(?=\n##|\n\*\*|$)/
    );
    if (!recommendationsMatch) return [];

    return recommendationsMatch[1]
      .split('\n')
      .filter(
        (line) => line.trim().startsWith('-') || line.trim().startsWith('*')
      )
      .map((line) => line.replace(/^[-*]\s*/, '').trim());
  }

  // 获取分析类型说明
  private getAnalysisTypeInstructions(type: string): string {
    switch (type) {
      case 'structure':
        return '重点分析代码架构、模块划分、设计模式的使用';
      case 'quality':
        return '重点分析代码质量、规范性、可读性、可维护性';
      case 'security':
        return '重点分析安全漏洞、数据验证、权限控制';
      case 'performance':
        return '重点分析性能瓶颈、算法复杂度、资源使用';
      case 'full':
        return '进行全面分析，包括结构、质量、安全、性能等各个方面';
      default:
        return '进行综合性代码分析';
    }
  }

  // 获取会话管理器（用于外部访问）
  getSessionManager(): ClaudeSessionManager {
    return this.sessionManager;
  }

  // 获取配置管理器（用于外部访问）
  getConfigManager(): ClaudeCodeConfigManager {
    return this.configManager;
  }
}
