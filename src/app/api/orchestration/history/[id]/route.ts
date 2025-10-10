// UTF-8
import { NextRequest, NextResponse } from 'next/server';
import { readHistory, deleteHistory, updateHistory } from '@/lib/coordination/orchestrator';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await readHistory(params.id);
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e.message } }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await deleteHistory(params.id);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  await updateHistory(params.id, body || {});
  return NextResponse.json({ success: true });
}

