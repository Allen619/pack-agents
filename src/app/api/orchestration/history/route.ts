// UTF-8
import { NextResponse } from 'next/server';
import { listRuns } from '@/lib/orchestration/store';

export async function GET() {
  try {
    const items = await listRuns();
    return NextResponse.json({ success: true, data: items });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '获取历史失败' } }, { status: 500 });
  }
}

