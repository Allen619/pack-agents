// UTF-8
import { featureFlags } from './core/feature-flags';
import type { EventBusAdapter } from './core/event-bus-adapter';
import { createInMemoryEventBus } from './core/event-bus-adapter';
import type { LoggerAdapter } from './core/logger-adapter';
import { createConsoleLogger } from './core/logger-adapter';
import type {
  HealthStatus,
  MetricsSnapshot,
  SystemEvent,
  SystemEventName,
  Task,
} from './core/types';
import { TaskScheduler } from './scheduler';

export interface CoordinationManagerOptions {
  bus?: EventBusAdapter; // 外部事件总线适配，可注入
  logger?: LoggerAdapter; // 外部日志适配，可注入
}

export class CoordinationManager {
  private readonly bus: EventBusAdapter;
  private readonly logger: LoggerAdapter;
  private readonly scheduler: TaskScheduler;
  private initialized = false;

  constructor(opts: CoordinationManagerOptions = {}) {
    this.bus = opts.bus ?? createInMemoryEventBus();
    this.logger = opts.logger ?? createConsoleLogger('coordination');
    this.scheduler = new TaskScheduler({ bus: this.bus, logger: this.logger });
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.logger.info('CoordinationManager initialize', {
      enabled: featureFlags.isEnabled(),
      shadow: featureFlags.isShadowMode(),
      agentAllow: featureFlags.agentAllowlist(),
      typeAllow: featureFlags.taskTypeAllowlist(),
    });
    this.scheduler.initialize();
  }

  shutdown() {
    if (!this.initialized) return;
    this.scheduler.shutdown();
    this.bus.removeAll();
    this.initialized = false;
  }

  // 提供影子期事件镜像的统一入口（只读/对账，不发指令）
  mirrorEvent<T = any>(event: SystemEvent<T>) {
    this.scheduler.ingestExternalEvent(event);
  }

  // 灰度开关控制下的任务指派；默认返回 false 表示未走新调度
  assignTask(task: Task, agentId: string): boolean {
    return this.scheduler.assignTask(task, agentId);
  }

  cancelTask(taskId: string, reason?: string) {
    this.scheduler.cancelTask(taskId, reason);
  }

  // 查询能力（无副作用）
  getAgentTasks(agentId: string) {
    return this.scheduler.getAgentTasks(agentId);
  }

  getAgentTaskCount(agentId: string) {
    return this.scheduler.getAgentTaskCount(agentId);
  }

  getHealthStatus(): HealthStatus {
    return this.scheduler.getHealthStatus();
  }

  getMetricsSnapshot(): MetricsSnapshot {
    return this.scheduler.getMetricsSnapshot();
  }

  // 开放事件订阅（供宿主系统接驳到现有总线）
  on(name: SystemEventName, handler: (ev: SystemEvent<any>) => void) {
    this.bus.on(name, handler);
  }
  off(name: SystemEventName, handler: (ev: SystemEvent<any>) => void) {
    this.bus.off(name, handler);
  }
}

