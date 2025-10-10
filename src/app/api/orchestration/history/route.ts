// UTF-8
import { NextResponse } from 'next/server';
import { readHistoryList } from '@/lib/coordination/orchestrator';

export async function GET() {
  const list = await readHistoryList();
  return NextResponse.json({ success: true, data: list });
}

