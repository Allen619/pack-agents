// Claude Code SDK 集成相关类型定义

export interface ClaudeCodeConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeSessionInfo {
  id: string;
  executionId: string;
  createdAt: Date;
  lastUsedAt: Date;
  status: 'active' | 'error' | 'completed';
  metadata: Record<string, any>;
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };
}

export interface CodeAnalysisRequest {
  executionId: string;
  analysisTarget: string;
  paths: string[];
  analysisType: 'structure' | 'quality' | 'security' | 'performance' | 'full';
  specificQuestions?: string[];
  maxTurns?: number;
  mcpServers?: Record<string, any>;
  startTime: number;
}

export interface CodeGenerationRequest {
  executionId: string;
  prompt: string;
  contextFiles?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  projectContext?: {
    framework?: string;
    language?: string;
    dependencies?: string[];
    structure?: Record<string, any>;
  };
  maxTurns?: number;
  startTime: number;
  progressCallback?: (progress: {
    stage: string;
    progress: number;
    message: string;
  }) => void;
}

export interface ToolResult {
  type: 'code_analysis' | 'code_generation' | 'error';
  success: boolean;
  content?: any;
  files?: Array<{
    path: string;
    content: string;
    language: string;
    operation: 'create' | 'update' | 'delete';
  }>;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  metadata?: {
    sessionId?: string;
    tokensUsed?: number;
    executionTime?: number;
    toolsUsed?: string[];
    filesGenerated?: number;
  };
}

export interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
}

export interface KnowledgeBaseConfig {
  enabled: boolean;
  paths: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  maxDepth?: number;
  maxFileSize?: number; // in bytes
}

export interface ToolPermissions {
  allowedCommands: string[];
  restrictedPaths: string[];
  maxFileSize: number;
  timeout: number;
  sandboxMode: boolean;
}

export interface ClaudeCodeExecutionOptions {
  allowedTools?: string[];
  maxTurns?: number;
  resume?: string;
  mcpServers?: Record<string, any>;
  knowledgeBase?: KnowledgeBaseConfig;
  permissions?: ToolPermissions;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    timestamp: Date;
    tokens?: number;
    toolCalls?: any[];
  };
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  toolsInvoked?: string[];
  sessionId?: string;
  finished: boolean;
}
