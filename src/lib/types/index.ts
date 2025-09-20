// Pack Agents 核心类型定义 - 基于 Claude Code SDK

export type AgentRole = 'main' | 'specialist' | 'coordinator';
export type AgentStatus = 'active' | 'inactive' | 'archived';

// Claude Code SDK 相关类型
export interface ClaudeAgentConfig {
  id: string;
  name: string;
  description: string;
  role: AgentRole;

  // Claude Code SDK 核心配置
  claudeConfig: {
    model: 'claude-sonnet-4-20250514' | 'claude-haiku-20250514';
    systemPrompt: string;
    allowedTools: Array<'Read' | 'Edit' | 'Write' | 'Glob' | 'Grep' | 'Bash'>;
    mcpServers?: Record<string, MCPServerConfig>;
    maxTurns: number;
    temperature?: number;
  };

  // 执行上下文
  context: {
    knowledgeBasePaths: string[];
    workingDirectory: string;
    environmentVariables?: Record<string, string>;
  };

  // 会话管理
  sessionConfig: {
    persistent: boolean;
    timeout: number;
    resumable: boolean;
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    tags: string[];
  };
}

// 兼容性类型定义（保持向后兼容）
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

// MCP 相关类型
export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  serverName?: string;
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
  status:
    | 'pending'
    | 'planning'
    | 'confirmed'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';
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
  providers: Record<
    string,
    {
      name: string;
      models: string[];
      defaultModel: string;
      rateLimit?: {
        requestsPerMinute: number;
        tokensPerMinute: number;
      };
    }
  >;
}

export interface ToolsConfig {
  tools: Record<
    string,
    {
      enabled: boolean;
      allowedCommands?: string[];
      restrictedPaths?: string[];
      maxFileSize?: string;
      timeout?: number;
      allowedExtensions?: string[];
      maxDepth?: number;
    }
  >;
}

// Claude Code SDK 执行相关类型
export interface AgentResult {
  success: boolean;
  results?: any[];
  sessionId?: string;
  metadata?: {
    tokensUsed?: number;
    executionTime?: number;
    toolsUsed?: string[];
  };
  error?: {
    message: string;
    code: string;
    sessionId?: string;
    details?: any;
  };
}

export interface AgentMessage {
  type: string;
  content: any;
  agentId: string;
  sessionId: string;
  timestamp: string;
}

export interface ExecutionOptions {
  onProgress?: (progress: AgentProgress) => void;
  timeout?: number;
  enableCache?: boolean;
}

export interface AgentProgress {
  type: string;
  content: any;
  timestamp: string;
}

// Claude 工作流相关类型
export interface ClaudeWorkflowConfig {
  id: string;
  name: string;
  description: string;

  // 主要Agent（负责整体规划和协调）
  mainAgent: {
    agentId: string;
    role: 'coordinator';
  };

  // 专业Agent团队
  specialists: Array<{
    agentId: string;
    role: 'specialist';
    specialty: string; // 'code-analysis' | 'code-generation' | 'testing' | 'documentation'
  }>;

  // 工作流模式
  mode: 'sequential' | 'parallel' | 'adaptive';

  // Claude Code 执行配置
  execution: {
    sharedContext: boolean; // 是否共享上下文
    crossSessionSharing: boolean; // 是否跨会话共享
    resultSynthesis: boolean; // 是否需要结果综合
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

export interface WorkflowRequest {
  description: string;
  input?: any;
  requirements?: string[];
  priority?: 'low' | 'normal' | 'high';
  requireConfirmation?: boolean;
  timeout?: number;
}

export interface ExecutionPlan {
  id: string;
  tasks: ExecutionTask[];
  dependencies: TaskDependency[];
  estimatedDuration: number;
  successCriteria: string[];
  metadata: {
    createdAt: string;
    createdBy: string;
  };
}

export interface ExecutionTask {
  id: string;
  name: string;
  description: string;
  agentId: string;
  taskType: 'main_planning' | 'sub_execution' | 'synthesis';
  inputs: any;
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  deliverables: string[];
  timeout: number;
}

export interface TaskDependency {
  fromTask: string;
  toTask: string;
  condition?: string;
  required: boolean;
}

export interface WorkflowResult {
  success: boolean;
  executionId: string;
  plan?: ExecutionPlan;
  results?: WorkflowResults;
  metadata?: {
    executionTime: number;
    tokensUsed: number;
    agentsUsed: string[];
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface WorkflowResults {
  [taskId: string]: TaskResult;
}

export interface TaskResult {
  success: boolean;
  output?: any;
  artifacts?: any[];
  metadata?: {
    executionTime: number;
    tokensUsed: number;
    toolsUsed: string[];
  };
  error?: {
    message: string;
    code: string;
  };
  skipped?: boolean;
  reason?: string;
}

// 会话管理相关类型
export interface SessionInfo {
  id: string;
  agentId: string;
  config: any;
  createdAt: string;
  lastUsedAt: string;
  status?: string;
  metadata?: any;
}

export interface ClaudeSession {
  id: string;
  agentId: string;
  createdAt: Date;
  lastUsedAt: Date;
  inUse: boolean;
  status: 'active' | 'expired' | 'error';
  metadata: Record<string, any>;
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };
}

// SSE 相关类型
export interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
  executionId?: string;
  taskId?: string;
}

export interface AgentStreamMessage {
  type:
    | 'agent_message'
    | 'progress'
    | 'task_complete'
    | 'execution_complete'
    | 'execution_error';
  executionId: string;
  agentId?: string;
  taskId?: string;
  message?: any;
  progress?: any;
  result?: any;
  error?: any;
  timestamp: string;
}

// 性能优化相关类型
export interface CachedResult {
  result: AgentResult;
  timestamp: number;
}

export interface ExecutionContext {
  recentFiles?: string[];
  previousResults?: TaskResult[];
  sharedData?: Record<string, any>;
}

// 辅助工具类型（降级后的 LangChain）
export interface LangChainConfig {
  enabled: boolean;
  role: 'auxiliary' | 'disabled';
  features: {
    dataProcessing: boolean;
    formatHelpers: boolean;
    validation: boolean;
  };
}
