// UTF-8
import { NextResponse } from 'next/server';
import { startRun } from '@/lib/coordination/orchestrator';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { flags, prompt, planAgentId, executeAgentIds = [], summarizeAgentId } = body || {};
  if (!prompt || !planAgentId || !summarizeAgentId || !Array.isArray(executeAgentIds) || executeAgentIds.length === 0) {
    return NextResponse.json({ success: false, error: { message: '参数不完整：需要 prompt、planAgentId、executeAgentIds[]、summarizeAgentId' } }, { status: 400 });
  }
  const { runId } = await startRun({ flags, prompt, planAgentId, executeAgentIds, summarizeAgentId });
  return NextResponse.json({ success: true, data: { runId } });
}

