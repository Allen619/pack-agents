// UTF-8
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ensureInitialized } from '@/lib/coordination/manager';
import { featureFlags, type Task } from '@/packages/coordination-core';
import { setTaskOutput } from '@/lib/coordination/demo-store';
import { nanoid } from 'nanoid';
import { query } from '@anthropic-ai/claude-code';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    flags,
    prompt,
    stages,
  }: {
    flags?: { enabled?: boolean; shadowMode?: boolean; agentAllowlist?: string[]; taskTypeAllowlist?: string[] };
    prompt?: string;
    stages: { planAgentId: string; executeAgentId: string; summarizeAgentId: string };
  } = body;

  if (!stages || !stages.planAgentId || !stages.executeAgentId || !stages.summarizeAgentId) {
    return NextResponse.json({ success: false, error: { message: 'stages.planAgentId/executeAgentId/summarizeAgentId 必填' } }, { status: 400 });
  }

  if (flags) featureFlags.set(flags);

  const cm = ensureInitialized();

  const t1: Task = { id: `plan-${nanoid(6)}`, type: 'plan', payload: { prompt } };
  const t2: Task = { id: `exec-${nanoid(6)}`, type: 'execute', dependencies: [t1.id], payload: { prompt } };
  const t3: Task = { id: `sum-${nanoid(6)}`, type: 'summarize', dependencies: [t2.id], payload: { prompt } };

  const used1 = cm.assignTask(t1, stages.planAgentId);
  const used2 = cm.assignTask(t2, stages.executeAgentId);
  const used3 = cm.assignTask(t3, stages.summarizeAgentId);

  const runWithAgent = async (agentId: string, userPrompt: string, extraSystemPrompt?: string) => {
    // 加载 Agent JSON
    const agentPath = path.join(process.cwd(), 'config', 'agents', 'instances', `${agentId}.json`);
    const agentRaw = await fs.readFile(agentPath, 'utf-8');
    const agent = JSON.parse(agentRaw);

    // 读取 LLM 提供方默认模型
    const llmProvidersPath = path.join(process.cwd(), 'config', 'settings', 'llm-providers.json');
    let defaultModel = 'claude-sonnet-4-20250514';
    try {
      const providersRaw = await fs.readFile(llmProvidersPath, 'utf-8');
      const providers = JSON.parse(providersRaw);
      defaultModel = providers?.providers?.claude?.defaultModel || defaultModel;
    } catch {}

    // MCP Servers
    const { ConfigManager } = await import('@/lib/storage/config-manager');
    const configManager = new ConfigManager();
    const registry = await configManager.listMcpServers();
    const mcpServers: Record<string, any> = {};
    registry
      .filter((s: any) => s.status !== 'disabled')
      .forEach((s: any) => {
        mcpServers[s.name] = { type: 'stdio', command: s.command, args: s.args || [], env: s.env || {} };
      });

    const options: any = {
      model: defaultModel,
      maxTurns: 20,
      permissionMode: 'default',
      mcpServers,
    };

    const sysPrompt = [agent.systemPrompt || '', extraSystemPrompt || ''].filter(Boolean).join('\n\n');
    if (sysPrompt) options.customSystemPrompt = sysPrompt;

    const kbPaths: string[] = Array.isArray(agent.knowledgeBasePaths) ? agent.knowledgeBasePaths : [];
    if (kbPaths.length > 0) {
      options.cwd = kbPaths[0];
      if (kbPaths.length > 1) options.additionalDirectories = kbPaths.slice(1);
    }

    let text = '';
    for await (const event of query({ prompt: userPrompt, options })) {
      if (event.type === 'assistant') {
        const content: any = (event as any).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && typeof block.text === 'string') {
              text += block.text;
            }
          }
        }
      }
      if (event.type === 'result') break;
    }
    return text.trim();
  };

  // 顺序执行三步（真实等待模型输出）
  cm.mirrorEvent({ name: 'TASK_STARTED', taskId: t1.id, agentId: stages.planAgentId, at: Date.now() });
  const planText = await runWithAgent(stages.planAgentId, prompt || '');
  setTaskOutput(t1.id, planText);
  cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: t1.id, agentId: stages.planAgentId, at: Date.now(), payload: { text: planText } });

  cm.mirrorEvent({ name: 'TASK_STARTED', taskId: t2.id, agentId: stages.executeAgentId, at: Date.now() });
  const execText = await runWithAgent(
    stages.executeAgentId,
    `请基于以下规划执行任务，给出清晰、可验证的产出：\n\n【规划内容】\n${planText}\n\n【用户任务】\n${prompt || ''}`
  );
  setTaskOutput(t2.id, execText);
  cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: t2.id, agentId: stages.executeAgentId, at: Date.now(), payload: { text: execText } });

  cm.mirrorEvent({ name: 'TASK_STARTED', taskId: t3.id, agentId: stages.summarizeAgentId, at: Date.now() });
  const sumText = await runWithAgent(
    stages.summarizeAgentId,
    `请基于以下执行结果输出“结论要点、可执行建议、可能风险与后续建议”：\n\n【执行结果】\n${execText}\n\n【用户任务】\n${prompt || ''}`
  );
  setTaskOutput(t3.id, sumText);
  cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: t3.id, agentId: stages.summarizeAgentId, at: Date.now(), payload: { text: sumText } });

  const metrics = cm.getMetricsSnapshot();

  return NextResponse.json({
    success: true,
    data: {
      tasks: { t1: t1.id, t2: t2.id, t3: t3.id },
      usedNewScheduler: { t1: used1, t2: used2, t3: used3 },
      outputs: { planText, execText, sumText },
      metrics,
    },
  });
}
