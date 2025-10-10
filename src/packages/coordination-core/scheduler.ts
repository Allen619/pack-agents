// UTF-8
import { featureFlags } from './core/feature-flags';
import { CancellationError, TimeoutError } from './core/errors';
import type {
  HealthStatus,
  MetricsSnapshot,
  SystemEvent,
  SystemEventName,
  Task,
  TaskStatus,
} from './core/types';
import type { EventBusAdapter } from './core/event-bus-adapter';
import type { LoggerAdapter } from './core/logger-adapter';

type InternalTask = Required<Pick<Task, 'id' | 'type'>> &
  Task & {
    status: TaskStatus;
    retries: number;
    assignedAgent?: string;
    startedAt?: number;
    timers?: { timeout?: any };
  };

export interface TaskSchedulerOptions {
  bus: EventBusAdapter;
  logger: LoggerAdapter;
}

export class TaskScheduler {
  private tasks = new Map<string, InternalTask>();
  private byAgent = new Map<string, Set<string>>();

  // 指标
  private totalAssigned = 0;
  private totalCompleted = 0;
  private totalFailed = 0;
  private totalCanceled = 0;
  private totalRetried = 0;

  constructor(private readonly opts: TaskSchedulerOptions) {}

  initialize() {
    // 影子模式不需要主动发指令，只监听外部镜像事件（由 Manager 接入）
    this.opts.logger.info('TaskScheduler initialized', {
      enabled: featureFlags.isEnabled(),
      shadow: featureFlags.isShadowMode(),
    });
  }

  shutdown() {
    this.tasks.forEach((t) => {
      if (t.timers?.timeout) clearTimeout(t.timers.timeout);
    });
    this.tasks.clear();
    this.byAgent.clear();
  }

  private canRun(task: InternalTask) {
    const deps = task.dependencies ?? [];
    for (const id of deps) {
      const dep = this.tasks.get(id);
      if (!dep || dep.status !== 'completed') return false;
    }
    return true;
  }

  private trackAgentTask(agentId: string, taskId: string) {
    let set = this.byAgent.get(agentId);
    if (!set) {
      set = new Set();
      this.byAgent.set(agentId, set);
    }
    set.add(taskId);
  }

  private untrackAgentTask(agentId: string, taskId: string) {
    const set = this.byAgent.get(agentId);
    if (!set) return;
    set.delete(taskId);
    if (set.size === 0) this.byAgent.delete(agentId);
  }

  getAgentTasks(agentId: string): Task[] {
    const set = this.byAgent.get(agentId);
    if (!set) return [];
    return Array.from(set)
      .map((id) => this.tasks.get(id))
      .filter(Boolean) as Task[];
  }

  getAgentTaskCount(agentId: string): number {
    return this.byAgent.get(agentId)?.size ?? 0;
  }

  getHealthStatus(): HealthStatus {
    const statusCounts: Record<TaskStatus, number> = {
      pending: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    };
    this.tasks.forEach((t) => {
      statusCounts[t.status]++;
    });
    const activeTasks =
      statusCounts.pending + statusCounts.queued + statusCounts.running;
    return {
      activeTasks,
      statusCounts,
      lastUpdatedAt: Date.now(),
    };
  }

  getMetricsSnapshot(): MetricsSnapshot {
    let running = 0;
    let queued = 0;
    let pending = 0;
    this.tasks.forEach((t) => {
      if (t.status === 'running') running++;
      else if (t.status === 'queued') queued++;
      else if (t.status === 'pending') pending++;
    });
    return {
      totalAssigned: this.totalAssigned,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      totalCanceled: this.totalCanceled,
      totalRetried: this.totalRetried,
      running,
      queued,
      pending,
    };
  }

  // 外部镜像事件进入点：影子期用于对账；灰度期用于接收旧链路事件做双写对比
  ingestExternalEvent(event: SystemEvent) {
    this.opts.logger.debug('ingestExternalEvent', event as any);
    const t = this.tasks.get(event.taskId);
    if (!t) return; // 未记录的任务：忽略
    switch (event.name) {
      case 'TASK_COMPLETED':
        this.markCompleted(t.id);
        break;
      case 'TASK_FAILED':
        this.markFailed(t.id, new Error('external-failed'));
        break;
      case 'TASK_CANCELED':
        this.cancelTask(t.id, 'external-canceled');
        break;
      case 'TASK_STARTED':
        this.markStarted(t.id, event.agentId);
        break;
      default:
        break;
    }
  }

  // 指派任务（仅当开关 + 白名单匹配时真正派发），否则记录为影子观察
  assignTask(task: Task, agentId: string): boolean {
    const enabled = featureFlags.isEnabled();
    const shadow = featureFlags.isShadowMode();
    const agentOk = featureFlags.isAgentEnabled(agentId);
    const typeOk = featureFlags.isTaskTypeEnabled(task.type);

    const effective = enabled && !shadow && agentOk && typeOk;
    const existing = this.tasks.get(task.id);
    if (existing) {
      // 幂等：重复指派直接忽略
      return effective;
    }

    const t: InternalTask = {
      ...task,
      id: task.id,
      type: task.type,
      status: 'pending',
      retries: 0,
      maxRetries: task.maxRetries ?? 0,
      dependencies: task.dependencies ?? [],
      timers: {},
    };
    this.tasks.set(t.id, t);

    if (!effective) {
      // 影子或关闭：只记录状态，不触发调度
      this.opts.logger.info('shadow/disabled assign recorded', {
        agentId,
        taskId: t.id,
        type: t.type,
      });
      return false;
    }

    // 进入排队
    t.status = 'queued';
    t.assignedAgent = agentId;
    this.trackAgentTask(agentId, t.id);
    this.totalAssigned++;
    this.emit({ name: 'TASK_ASSIGNED', taskId: t.id, agentId, at: Date.now() });

    this.tryStart(t.id);
    return true;
  }

  private tryStart(taskId: string) {
    const t = this.tasks.get(taskId);
    if (!t) return;
    if (!t.assignedAgent) return;
    if (!this.canRun(t)) return; // 依赖未就绪
    if (t.status === 'running' || t.status === 'completed') return;

    t.status = 'running';
    t.startedAt = Date.now();
    this.emit({ name: 'TASK_STARTED', taskId: t.id, agentId: t.assignedAgent, at: Date.now() });

    if (t.timeoutMs && t.timeoutMs > 0) {
      t.timers!.timeout = setTimeout(() => {
        this.opts.logger.warn('task timeout', { taskId: t.id });
        this.handleFailure(t.id, new TimeoutError());
      }, t.timeoutMs);
    }
  }

  markStarted(taskId: string, agentId?: string) {
    const t = this.tasks.get(taskId);
    if (!t) return;
    if (t.status === 'running') return; // 幂等
    t.status = 'running';
    if (agentId) t.assignedAgent = agentId;
    t.startedAt = Date.now();
  }

  markCompleted(taskId: string) {
    const t = this.tasks.get(taskId);
    if (!t) return;
    if (t.timers?.timeout) clearTimeout(t.timers.timeout);
    t.status = 'completed';
    this.totalCompleted++;
    if (t.assignedAgent) this.untrackAgentTask(t.assignedAgent, t.id);
    this.emit({ name: 'TASK_COMPLETED', taskId: t.id, agentId: t.assignedAgent, at: Date.now() });
  }

  markFailed(taskId: string, error?: unknown) {
    this.handleFailure(taskId, error);
  }

  private handleFailure(taskId: string, error?: unknown) {
    const t = this.tasks.get(taskId);
    if (!t) return;
    if (t.timers?.timeout) clearTimeout(t.timers.timeout);

    if (t.retries < (t.maxRetries ?? 0)) {
      t.retries++;
      this.totalRetried++;
      this.opts.logger.warn('task retrying', { taskId: t.id, attempt: t.retries });
      t.status = 'queued';
      // 简单重试：立即再次尝试启动（可扩展指数退避）
      this.tryStart(t.id);
      return;
    }

    t.status = 'failed';
    this.totalFailed++;
    if (t.assignedAgent) this.untrackAgentTask(t.assignedAgent, t.id);
    this.emit({ name: 'TASK_FAILED', taskId: t.id, agentId: t.assignedAgent, at: Date.now(), payload: { error: String(error) } });
  }

  cancelTask(taskId: string, reason?: string) {
    const t = this.tasks.get(taskId);
    if (!t) return;
    if (t.timers?.timeout) clearTimeout(t.timers.timeout);
    t.status = 'canceled';
    this.totalCanceled++;
    if (t.assignedAgent) this.untrackAgentTask(t.assignedAgent, t.id);
    this.emit({ name: 'TASK_CANCELED', taskId: t.id, agentId: t.assignedAgent, at: Date.now(), payload: { reason } });
  }

  private emit<T = any>(event: SystemEvent<T>) {
    try {
      this.opts.bus.emit(event);
    } catch (e) {
      this.opts.logger.error('event emit error', { error: String(e) });
    }
  }
}

