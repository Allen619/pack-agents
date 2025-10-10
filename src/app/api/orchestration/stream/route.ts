// UTF-8
import { NextRequest } from 'next/server';
import { subscribe } from '@/lib/coordination/run-bus';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId') || '';
  if (!runId) return new Response('runId required', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: any) => controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
      const unsubscribe = subscribe(runId, send);
      // 立即推送握手消息
      send({ type: 'CONNECTED', runId, at: Date.now() });
      (controller as any)._unsubscribe = unsubscribe;
    },
    cancel() {
      const unsubscribe = (this as any)._unsubscribe as undefined | (() => void);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  });
}

