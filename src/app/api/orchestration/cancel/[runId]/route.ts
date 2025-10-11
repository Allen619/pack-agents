// UTF-8
import { NextResponse } from 'next/server';
import { updateRun, readRun } from '@/lib/orchestration/store';

export async function POST(_: Request, { params }: { params: { runId: string } }) {
  try {
    const runId = params.runId;
    const rec = await readRun(runId);
    if (!rec) return NextResponse.json({ success: false, error: { message: '未找到运行记录' } }, { status: 404 });

    await updateRun(runId, { status: 'terminated', finishedAt: Date.now() });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '终止失败' } }, { status: 500 });
  }
}

