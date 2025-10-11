// UTF-8
import { NextResponse } from 'next/server';
import { readRun, deleteRun } from '@/lib/orchestration/store';

export async function GET(_: Request, ctx: { params: { runId: string } }) {
  try {
    const run = await readRun(ctx.params.runId);
    if (!run) return NextResponse.json({ success: false, error: { message: '未找到运行记录' } }, { status: 404 });
    return NextResponse.json({ success: true, data: run });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '获取详情失败' } }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: { runId: string } }) {
  try {
    await deleteRun(ctx.params.runId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '删除失败' } }, { status: 500 });
  }
}

