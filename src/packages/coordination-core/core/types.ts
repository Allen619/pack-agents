// UTF-8
// 对外稳定类型子集：Task、TaskStatus、SystemEvents

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface Task<TPayload = unknown> {
  id: string;
  type: string;
  payload?: TPayload;
  dependencies?: string[]; // 依赖的任务ID列表
  priority?: number; // 可选，越大越优先
  timeoutMs?: number; // 可选，任务超时（毫秒）
  maxRetries?: number; // 可选，最大重试次数（默认0）
  metadata?: Record<string, unknown>; // 透传元数据
  status?: TaskStatus; // 只读快照（内部维护）
}

// 内部系统事件（最小子集）
export type SystemEventName =
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCELED';

export interface SystemEvent<T = any> {
  name: SystemEventName;
  taskId: string;
  agentId?: string;
  payload?: T;
  at: number; // 时间戳 ms
}

export interface HealthStatus {
  activeTasks: number;
  statusCounts: Record<TaskStatus, number>;
  lastUpdatedAt: number;
}

export interface MetricsSnapshot {
  totalAssigned: number;
  totalCompleted: number;
  totalFailed: number;
  totalCanceled: number;
  totalRetried: number;
  running: number;
  queued: number;
  pending: number;
}

