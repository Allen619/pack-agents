// Pack Agents 核心类型定义

export type AgentRole = 'main' | 'sub' | 'synthesis';
export type AgentStatus = 'active' | 'inactive' | 'archived';

export interface LLMConfig {
  provider: 'claude' | 'openai' | 'others';
  model: string;
  apiKey: string; // 加密存储
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: any;
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  systemPrompt: string;
  llmConfig: LLMConfig;
  knowledgeBasePaths: string[];
  enabledTools: string[];
  metadata: {
    version: string;
    author: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    usage: {
      totalExecutions: number;
      successRate: number;
      avgExecutionTime: number;
    };
  };
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  systemPrompt: string;
  enabledTools: string[];
  tags: string[];
  category: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  mainAgentId: string;
  executionFlow: ExecutionFlow;
  configuration: {
    maxExecutionTime: number;
    autoRetry: boolean;
    notifications: boolean;
  };
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    lastExecuted?: string;
    executionCount: number;
  };
}

export interface ExecutionFlow {
  stages: ExecutionStage[];
  dependencies: Array<{
    fromStage: string;
    toStage: string;
    condition?: string;
  }>;
}

export interface ExecutionStage {
  id: string;
  name: string;
  type: 'parallel' | 'sequential';
  tasks: Array<{
    id: string;
    agentId: string;
    taskType: 'main_planning' | 'sub_execution' | 'synthesis';
    inputs: any;
    dependencies: string[];
    timeout: number;
  }>;
  timeoutMs: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  status: 'pending' | 'planning' | 'confirmed' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  scratchpad: {
    data: Record<string, any>;
    agentOutputs: Record<string, any>;
    sharedContext: Record<string, any>;
    intermediateResults: Array<{
      taskId: string;
      agentId: string;
      timestamp: string;
      result: any;
    }>;
    executionTrace: Array<{
      timestamp: string;
      event: string;
      details: any;
    }>;
  };
  tasks: Array<{
    id: string;
    agentId: string;
    agentName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
    progress: number;
    startTime?: string;
    endTime?: string;
    result?: any;
    error?: {
      message: string;
      code: string;
      details: any;
    };
    retryCount: number;
  }>;
  metadata: {
    startedAt: string;
    completedAt?: string;
    totalDuration?: number;
    tokensUsed?: number;
    cost?: number;
  };
  errorDetails?: {
    message: string;
    code: string;
    stack?: string;
    timestamp: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    traceId?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: PaginationMeta;
    executionTime?: number;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Claude Code SDK 相关类型
export interface CodeAnalysisRequest {
  analysisTarget: string;
  paths: string[];
  analysisType: string;
  specificQuestions?: string[];
  executionId: string;
  maxTurns?: number;
  mcpServers?: Record<string, any>;
  startTime: number;
}

export interface CodeGenerationRequest {
  prompt: string;
  contextFiles?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  projectContext?: any;
  executionId: string;
  maxTurns?: number;
  startTime: number;
  progressCallback?: (progress: {
    stage: string;
    progress: number;
    message: string;
  }) => void;
}

export interface ToolResult {
  type: string;
  success: boolean;
  content?: any;
  files?: Array<{
    path: string;
    content: string;
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

// 应用配置类型
export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: string;
  };
  storage: {
    type: string;
    configRoot: string;
    autoBackup: boolean;
    maxExecutionHistory: number;
  };
  execution: {
    defaultTimeout: number;
    maxRetries: number;
    parallelLimit: number;
  };
}

export interface LLMProviderConfig {
  providers: Record<string, {
    name: string;
    models: string[];
    defaultModel: string;
    rateLimit?: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  }>;
}

export interface ToolsConfig {
  tools: Record<string, {
    enabled: boolean;
    allowedCommands?: string[];
    restrictedPaths?: string[];
    maxFileSize?: string;
    timeout?: number;
    allowedExtensions?: string[];
    maxDepth?: number;
  }>;
}
