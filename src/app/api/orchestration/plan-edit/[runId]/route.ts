// UTF-8
import { NextResponse } from 'next/server';
import { updateRun, readRun } from '@/lib/orchestration/store';

export async function POST(req: Request, { params }: { params: { runId: string } }) {
  try {
    const runId = params.runId;
    if (!runId) return NextResponse.json({ success: false, error: { message: '缺少 runId' } }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { editing } = body || {};
    if (typeof editing !== 'boolean') {
      return NextResponse.json({ success: false, error: { message: 'editing 必须为 boolean' } }, { status: 400 });
    }
    const rec = await readRun(runId);
    if (!rec) return NextResponse.json({ success: false, error: { message: '未找到运行记录' } }, { status: 404 });
    if (rec.status === 'terminated') return NextResponse.json({ success: false, error: { message: '运行已终止' } }, { status: 400 });
    await updateRun(runId, { planEditing: editing });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '更新失败' } }, { status: 500 });
  }
}

