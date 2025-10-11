// UTF-8
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { saveRun, updateRun, type RunRecord } from '@/lib/orchestration/store';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConfigManager } from '@/lib/storage/config-manager';
import { query, type Options } from '@anthropic-ai/claude-code';

async function loadAgent(agentId: string) {
  const agentPath = path.join(process.cwd(), 'config', 'agents', 'instances', `${agentId}.json`);
  const raw = await fs.readFile(agentPath, 'utf-8').catch(() => '');
  return raw ? JSON.parse(raw) : null;
}

async function getDefaultModel(): Promise<string> {
  const providersPath = path.join(process.cwd(), 'config', 'settings', 'llm-providers.json');
  try {
    const raw = await fs.readFile(providersPath, 'utf-8');
    const json = JSON.parse(raw);
    return json?.providers?.claude?.defaultModel || 'claude-sonnet-4-20250514';
  } catch {
    return 'claude-sonnet-4-20250514';
  }
}

async function buildMcpServers() {
  const configManager = new ConfigManager();
  try {
    const registry = await configManager.listMcpServers();
    const mcpServers: Record<string, any> = {};
    registry.filter(s => s.status !== 'disabled').forEach(s => {
      mcpServers[s.name] = {
        type: 'stdio',
        command: s.command,
        args: s.args || [],
        env: s.env || {},
      };
    });
    return mcpServers;
  } catch {
    return {};
  }
}

async function runWithAgent(agentId: string, userPrompt: string, extraSystemPrompt?: string) {
  const agent = await loadAgent(agentId);
  if (!agent) throw new Error(`未找到 Agent: ${agentId}`);

  const model = await getDefaultModel();
  const mcpServers = await buildMcpServers();

  const options: Options = {
    model,
    maxTurns: 20,
    permissionMode: 'default',
    mcpServers,
    env: { ANTHROPIC_MODEL: model },
  } as any;

  const sys = [agent.systemPrompt || '', extraSystemPrompt || ''].filter(Boolean).join('\n\n');
  if (sys) (options as any).customSystemPrompt = sys;

  const kbPaths: string[] = Array.isArray(agent.knowledgeBasePaths) ? agent.knowledgeBasePaths : [];
  if (kbPaths.length > 0) {
    (options as any).cwd = kbPaths[0];
    if (kbPaths.length > 1) (options as any).additionalDirectories = kbPaths.slice(1);
  }

  let text = '';
  for await (const event of query({ prompt: userPrompt, options })) {
    if (event.type === 'assistant') {
      const content: any = (event as any).message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') text += block.text;
        }
      }
    }
    if (event.type === 'result') break;
  }
  return text.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, planAgentId, executeAgentIds, summarizeAgentId } = body || {};

    if (!prompt || !planAgentId || !Array.isArray(executeAgentIds) || executeAgentIds.length === 0 || !summarizeAgentId) {
      return NextResponse.json({ success: false, error: { message: '缺少必要参数：prompt/planAgentId/executeAgentIds/summarizeAgentId' } }, { status: 400 });
    }

    const runId = `run_${nanoid(8)}`;
    const startedAt = Date.now();

    // 后台异步执行；通过文件更新供 SSE 轮询
    (async () => {
      try {
        await updateRun(runId, { status: 'running', startedAt, prompt: String(prompt) });

        // 1) 规划
        const planText = await runWithAgent(planAgentId, String(prompt));
        await updateRun(runId, { planText });

        // 2) 执行（串行）
        const execResults: Array<{ index: number; text: string }> = [];
        for (let i = 0; i < executeAgentIds.length; i++) {
          const idx = i + 1;
          const agentId = executeAgentIds[i];
          const execPrompt = `请基于以下规划内容执行任务，给出清晰、可验证的产出：\n\n【规划内容】\n${planText}\n\n【用户任务】\n${String(prompt)}`;
          const text = await runWithAgent(agentId, execPrompt);
          execResults.push({ index: idx, text });
          await updateRun(runId, { execResults: [...execResults] });
        }

        // 3) 总结
        const mergedExec = execResults.map((r, i) => `【执行通道${i + 1}】\n${r.text}`).join('\n\n');
        const sumPrompt = `请基于以下执行结果输出“结论要点、可执行建议、可能风险与后续建议”：\n\n${mergedExec}\n\n【用户任务】\n${String(prompt)}`;
        const sumText = await runWithAgent(summarizeAgentId, sumPrompt);
        await updateRun(runId, { sumText });

        const rec: RunRecord = {
          runId,
          status: 'completed',
          startedAt,
          finishedAt: Date.now(),
          prompt: String(prompt),
          planText,
          execResults,
          sumText,
        };
        await saveRun(rec);
      } catch {
        await updateRun(runId, { status: 'failed', finishedAt: Date.now() });
      }
    })();

    return NextResponse.json({ success: true, data: { runId } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || '启动失败' } }, { status: 500 });
  }
}

