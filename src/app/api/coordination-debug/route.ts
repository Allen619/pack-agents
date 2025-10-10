// UTF-8
import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/coordination/manager';
import { featureFlags, type SystemEventName, type Task } from '@/packages/coordination-core';

export async function GET() {
  // 仅在访问该路由时才初始化，不影响现有运行路径
  const cm = ensureInitialized();
  const health = cm.getHealthStatus();
  const metrics = cm.getMetricsSnapshot();
  return NextResponse.json({
    flags: {
      enabled: featureFlags.isEnabled(),
      shadow: featureFlags.isShadowMode(),
      agentAllowlist: featureFlags.agentAllowlist(),
      taskTypeAllowlist: featureFlags.taskTypeAllowlist(),
    },
    health,
    metrics,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };
  const cm = ensureInitialized();

  switch (action) {
    case 'mirror': {
      const { name, taskId, agentId, payload } = body as {
        name: SystemEventName;
        taskId: string;
        agentId?: string;
        payload?: any;
      };
      if (!name || !taskId) {
        return NextResponse.json({ error: 'name and taskId required' }, { status: 400 });
      }
      cm.mirrorEvent({ name, taskId, agentId, payload, at: Date.now() });
      return NextResponse.json({ ok: true });
    }
    case 'assign': {
      const { task, agentId } = body as { task: Task; agentId: string };
      if (!task || !task.id || !task.type || !agentId) {
        return NextResponse.json({ error: 'task(id,type) and agentId required' }, { status: 400 });
      }
      const used = cm.assignTask(task, agentId);
      return NextResponse.json({ ok: true, usedNewScheduler: used });
    }
    case 'cancel': {
      const { taskId, reason } = body as { taskId: string; reason?: string };
      if (!taskId) {
        return NextResponse.json({ error: 'taskId required' }, { status: 400 });
      }
      cm.cancelTask(taskId, reason);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
