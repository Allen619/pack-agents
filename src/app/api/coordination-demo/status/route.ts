// UTF-8
import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/coordination/manager';
import { getTaskOutput } from '@/lib/coordination/demo-store';
import { debugStore } from '@/lib/coordination/debug-store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const agentsParam = url.searchParams.get('agents') || '';
  const agents = agentsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const cm = ensureInitialized();
  const health = cm.getHealthStatus();
  const metrics = cm.getMetricsSnapshot();
  const tasksByAgent: Record<string, any[]> = {};

  for (const a of agents) {
    tasksByAgent[a] = cm.getAgentTasks(a).map((t: any) => ({
      ...t,
      output: getTaskOutput(t.id),
    }));
  }

  const debug = debugStore.snapshot();
  return NextResponse.json({ success: true, data: { health, metrics, tasksByAgent, debug } });
}
