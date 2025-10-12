// UTF-8
import { NextResponse } from 'next/server';
import { updateRun, readRun } from '@/lib/orchestration/store';

export async function POST(req: Request, { params }: { params: { runId: string } }) {
  try {
    const runId = params.runId;
    if (!runId) return NextResponse.json({ success: false, error: { message: '缺少 runId' } }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { planText } = body || {};
    if (typeof planText !== 'string' || planText.trim().length === 0) {
      return NextResponse.json({ success: false, error: { message: 'planText 不能为空' } }, { status: 400 });
    }

    const rec = await readRun(runId);
    if (!rec) return NextResponse.json({ success: false, error: { message: '未找到运行记录' } }, { status: 404 });
    if (rec.status === 'terminated') return NextResponse.json({ success: false, error: { message: '运行已终止' } }, { status: 400 });

    await updateRun(runId, { planText: String(planText), planConfirmed: true, awaitingPlanConfirm: false });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '提交失败' } }, { status: 500 });
  }
}

