// UTF-8
import { NextResponse } from 'next/server';
import { readRun } from '@/lib/orchestration/store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId') || '';
  if (!runId) {
    return NextResponse.json({ success: false, error: { message: '缺少 runId' } }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: 'info', at: Date.now(), text: `运行 ${runId} 实时输出已连接` });

      let sentPlan = false;
      let sentExecCount = 0;
      let sentSummary = false;
      let sentAwaitPlan = false;
      let closed = false;
      let sentPlanConfirmed = false;

      const timer = setInterval(async () => {
        try {
          const rec = await readRun(runId);
          if (!rec) return;

          if (!sentPlan && rec.planText) {
            send({ type: 'stage', stage: 'plan', at: Date.now(), text: '规划进行中' });
            send({ type: 'delta', stage: 'plan', at: Date.now(), text: rec.planText.slice(0, 2000) });
            sentPlan = true;
          }

          if (!sentAwaitPlan && rec.awaitingPlanConfirm) {
            send({ type: 'await', stage: 'plan', at: Date.now(), deadline: rec.planConfirmDeadline || (Date.now() + 60_000), text: '等待确认规划' });
            sentAwaitPlan = true;
          }

          if (!sentPlanConfirmed && rec.planConfirmed) {
            send({ type: 'info', stage: 'plan', at: Date.now(), text: '已确认计划' });
            sentPlanConfirmed = true;
          }

          const execLen = Array.isArray(rec.execResults) ? rec.execResults.length : 0;
          if (execLen > sentExecCount) {
            for (let i = sentExecCount; i < execLen; i++) {
              const idx = i + 1;
              const r = rec.execResults![i];
              send({ type: 'stage', stage: `execute-${idx}`, at: Date.now(), text: `执行通道 ${idx} 进行中` });
              if (r?.text) send({ type: 'delta', stage: `execute-${idx}`, at: Date.now(), text: r.text.slice(0, 2000) });
            }
            sentExecCount = execLen;
          }

          if (!sentSummary && rec.sumText) {
            send({ type: 'stage', stage: 'summarize', at: Date.now(), text: '总结进行中' });
            send({ type: 'delta', stage: 'summarize', at: Date.now(), text: rec.sumText.slice(0, 2000) });
            sentSummary = true;
          }

          if (rec.status === 'completed' || rec.status === 'failed' || rec.status === 'terminated') {
            let text = '已完成';
            if (rec.status === 'failed') text = '失败';
            if (rec.status === 'terminated') text = '已终止';
            send({ type: 'result', at: Date.now(), text });
            clearInterval(timer);
            closed = true;
            controller.close();
          }
        } catch {
          // ignore polling errors
        }
      }, 500);

      (controller as any).onCancel = () => { if (!closed) clearInterval(timer); };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
