import { ClaudeAgent } from '../core/agent';
import { generateId } from '@/lib/utils';

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

/**
 * Claude SSE 管理器 - 基于 Claude Code SDK 流式特性的实时通信
 */
export class ClaudeSSEManager {
  private connections: Map<string, Response> = new Map();
  private agentExecutions: Map<string, ClaudeAgent> = new Map();
  private controllers: Map<string, ReadableStreamDefaultController> = new Map();

  /**
   * 订阅 Agent 执行流
   */
  async subscribeToAgentExecution(
    executionId: string,
    agent: ClaudeAgent,
    request: Request
  ): Promise<Response> {
    const stream = new ReadableStream({
      start: (controller) => {
        this.controllers.set(executionId, controller);
        this.startAgentStream(executionId, agent, controller);
      },
      cancel: () => {
        this.cleanup(executionId);
      },
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

    this.connections.set(executionId, response);
    return response;
  }

  /**
   * 订阅工作流执行流
   */
  async subscribeToWorkflowExecution(
    executionId: string,
    workflowId: string,
    request: Request
  ): Promise<Response> {
    const stream = new ReadableStream({
      start: (controller) => {
        this.controllers.set(executionId, controller);
        this.startWorkflowStream(executionId, workflowId, controller);
      },
      cancel: () => {
        this.cleanup(executionId);
      },
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

    this.connections.set(executionId, response);
    return response;
  }

  /**
   * 开始Agent流式执行
   */
  private async startAgentStream(
    executionId: string,
    agent: ClaudeAgent,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    try {
      // 发送连接确认
      this.sendSSEEvent(controller, {
        type: 'connection_established',
        data: { executionId, agentId: agent.getConfig().id },
        timestamp: new Date().toISOString(),
      });

      // 使用 Claude Code SDK 的流式模式
      for await (const message of agent.executeStream('开始任务执行')) {
        const sseEvent: AgentStreamMessage = {
          type: 'agent_message',
          executionId,
          agentId: agent.getConfig().id,
          message,
          timestamp: new Date().toISOString(),
        };

        this.sendSSEEvent(controller, sseEvent);

        // 检查是否应该停止流
        if (message.type === 'execution_complete' || message.type === 'error') {
          break;
        }
      }

      // 执行完成
      this.sendSSEEvent(controller, {
        type: 'execution_complete',
        executionId,
        timestamp: new Date().toISOString(),
        data: { executionId },
      });
    } catch (error: any) {
      this.sendSSEEvent(controller, {
        type: 'execution_error',
        executionId,
        timestamp: new Date().toISOString(),
        data: { executionId, error: error.message },
      });
    } finally {
      this.cleanup(executionId);
    }
  }

  /**
   * 开始工作流流式执行
   */
  private async startWorkflowStream(
    executionId: string,
    workflowId: string,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    try {
      // 发送连接确认
      this.sendSSEEvent(controller, {
        type: 'workflow_started',
        data: { executionId, workflowId },
        timestamp: new Date().toISOString(),
      });

      // 这里可以集成实际的工作流执行逻辑
      // 暂时发送模拟事件
      this.sendSSEEvent(controller, {
        type: 'workflow_progress',
        data: { executionId, workflowId, progress: 0 },
        timestamp: new Date().toISOString(),
      });

      // 模拟工作流执行进度
      for (let i = 1; i <= 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        this.sendSSEEvent(controller, {
          type: 'workflow_progress',
          data: {
            executionId,
            workflowId,
            progress: i * 20,
            currentTask: `Task ${i}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 工作流完成
      this.sendSSEEvent(controller, {
        type: 'workflow_complete',
        data: { executionId, workflowId },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.sendSSEEvent(controller, {
        type: 'workflow_error',
        data: { executionId, workflowId, error: error.message },
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.cleanup(executionId);
    }
  }

  /**
   * 发送SSE事件
   */
  private sendSSEEvent(
    controller: ReadableStreamDefaultController,
    event: SSEEvent | AgentStreamMessage
  ): void {
    try {
      const eventData = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(new TextEncoder().encode(eventData));
    } catch (error) {
      console.error('Failed to send SSE event:', error);
    }
  }

  /**
   * 广播事件到所有连接
   */
  broadcastEvent(event: SSEEvent): void {
    for (const [executionId, controller] of this.controllers) {
      try {
        this.sendSSEEvent(controller, event);
      } catch (error) {
        console.error(`Failed to broadcast to ${executionId}:`, error);
        this.cleanup(executionId);
      }
    }
  }

  /**
   * 发送进度更新
   */
  sendProgress(executionId: string, taskId: string, progress: any): void {
    const controller = this.controllers.get(executionId);
    if (controller) {
      this.sendSSEEvent(controller, {
        type: 'progress',
        executionId,
        taskId,
        progress,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 发送任务完成事件
   */
  sendTaskComplete(executionId: string, taskId: string, result: any): void {
    const controller = this.controllers.get(executionId);
    if (controller) {
      this.sendSSEEvent(controller, {
        type: 'task_complete',
        executionId,
        taskId,
        result,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 发送错误事件
   */
  sendError(executionId: string, error: any, taskId?: string): void {
    const controller = this.controllers.get(executionId);
    if (controller) {
      this.sendSSEEvent(controller, {
        type: 'execution_error',
        executionId,
        taskId,
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          details: error.details,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 清理连接
   */
  private cleanup(executionId: string): void {
    this.connections.delete(executionId);
    this.agentExecutions.delete(executionId);

    const controller = this.controllers.get(executionId);
    if (controller) {
      try {
        controller.close();
      } catch (error) {
        console.error('Error closing controller:', error);
      }
      this.controllers.delete(executionId);
    }
  }

  /**
   * 关闭指定执行的连接
   */
  closeConnection(executionId: string): void {
    const controller = this.controllers.get(executionId);
    if (controller) {
      this.sendSSEEvent(controller, {
        type: 'connection_closed',
        data: { executionId, reason: 'Manual close' },
        timestamp: new Date().toISOString(),
      });
      this.cleanup(executionId);
    }
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections(): void {
    for (const executionId of this.controllers.keys()) {
      this.closeConnection(executionId);
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalConnections: number;
    activeExecutions: string[];
    connectionsPerExecution: Record<string, number>;
  } {
    return {
      totalConnections: this.connections.size,
      activeExecutions: Array.from(this.controllers.keys()),
      connectionsPerExecution: Object.fromEntries(
        Array.from(this.controllers.keys()).map((id) => [id, 1])
      ),
    };
  }

  /**
   * 检查连接是否活跃
   */
  isConnectionActive(executionId: string): boolean {
    return this.controllers.has(executionId);
  }

  /**
   * 创建心跳检测
   */
  startHeartbeat(executionId: string, interval: number = 30000): void {
    const heartbeatInterval = setInterval(() => {
      const controller = this.controllers.get(executionId);
      if (controller) {
        this.sendSSEEvent(controller, {
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      } else {
        clearInterval(heartbeatInterval);
      }
    }, interval);
  }
}

// 全局SSE管理器实例
let globalSSEManager: ClaudeSSEManager | null = null;

/**
 * 获取全局SSE管理器实例
 */
export function getSSEManager(): ClaudeSSEManager {
  if (!globalSSEManager) {
    globalSSEManager = new ClaudeSSEManager();
  }
  return globalSSEManager;
}

/**
 * 创建新的SSE管理器实例
 */
export function createSSEManager(): ClaudeSSEManager {
  return new ClaudeSSEManager();
}

/**
 * SSE 事件类型定义
 */
export const SSEEventTypes = {
  CONNECTION_ESTABLISHED: 'connection_established',
  AGENT_MESSAGE: 'agent_message',
  PROGRESS: 'progress',
  TASK_COMPLETE: 'task_complete',
  EXECUTION_COMPLETE: 'execution_complete',
  EXECUTION_ERROR: 'execution_error',
  WORKFLOW_STARTED: 'workflow_started',
  WORKFLOW_PROGRESS: 'workflow_progress',
  WORKFLOW_COMPLETE: 'workflow_complete',
  WORKFLOW_ERROR: 'workflow_error',
  CONNECTION_CLOSED: 'connection_closed',
  HEARTBEAT: 'heartbeat',
} as const;

/**
 * SSE 客户端辅助函数
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, (event: any) => void> = new Map();

  /**
   * 连接到SSE端点
   */
  connect(url: string): void {
    this.disconnect();

    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const listener = this.listeners.get(data.type);
        if (listener) {
          listener(data);
        }

        // 调用通用监听器
        const generalListener = this.listeners.get('*');
        if (generalListener) {
          generalListener(data);
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      const errorListener = this.listeners.get('error');
      if (errorListener) {
        errorListener(error);
      }
    };

    this.eventSource.onopen = () => {
      console.log('SSE connection established');
      const openListener = this.listeners.get('open');
      if (openListener) {
        openListener({});
      }
    };
  }

  /**
   * 断开SSE连接
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * 添加事件监听器
   */
  on(eventType: string, listener: (event: any) => void): void {
    this.listeners.set(eventType, listener);
  }

  /**
   * 移除事件监听器
   */
  off(eventType: string): void {
    this.listeners.delete(eventType);
  }

  /**
   * 获取连接状态
   */
  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}
