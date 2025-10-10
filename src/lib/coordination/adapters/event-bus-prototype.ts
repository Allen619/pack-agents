// UTF-8
// 事件镜像适配器原型（非运行路径）：展示如何从现有事件源镜像到协调内核
import { ensureInitialized } from '@/lib/coordination/manager';
import type { SystemEventName } from '@/packages/coordination-core';

export interface ExistingEventBusLike {
  on: (event: string, handler: (payload: any) => void) => void;
  off?: (event: string, handler: (payload: any) => void) => void;
}

// 将现有系统的任务生命周期事件映射为最小 SystemEvent 集合
export function setupShadowMirroring(bus: ExistingEventBusLike) {
  const cm = ensureInitialized();

  const map = (
    name: SystemEventName,
    pick: (payload: any) => { taskId: string; agentId?: string; payload?: any }
  ) => (payload: any) => {
    const { taskId, agentId, payload: extra } = pick(payload);
    if (!taskId) return;
    cm.mirrorEvent({ name, taskId, agentId, payload: extra, at: Date.now() });
  };

  // 示例：根据你现有事件名进行映射
  bus.on('task.completed', map('TASK_COMPLETED', (p) => ({ taskId: p.id, agentId: p.agentId })));
  bus.on('task.failed', map('TASK_FAILED', (p) => ({ taskId: p.id, agentId: p.agentId, payload: { error: p.error } })));
  bus.on('task.started', map('TASK_STARTED', (p) => ({ taskId: p.id, agentId: p.agentId })));
  bus.on('task.canceled', map('TASK_CANCELED', (p) => ({ taskId: p.id, agentId: p.agentId, payload: { reason: p.reason } })));

  return () => {
    // 如现有总线支持 off，可在此解除绑定
  };
}
