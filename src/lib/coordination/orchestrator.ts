// UTF-8
import { promises as fs } from 'fs';
import * as path from 'path';
import { ensureInitialized } from '@/lib/coordination/manager';
import { featureFlags, type Task } from '@/packages/coordination-core';
import { nanoid } from 'nanoid';
import { query } from '@anthropic-ai/claude-code';
import { publish } from './run-bus';

const DATA_DIR = path.join(process.cwd(), 'data', 'coordination-runs');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeHistory(runId: string, patch: any) {
  await ensureDir();
  const file = path.join(DATA_DIR, `${runId}.json`);
  let current: any = {};
  try {
    const raw = await fs.readFile(file, 'utf-8');
    current = JSON.parse(raw);
  } catch {}
  const next = { ...current, ...patch };
  await fs.writeFile(file, JSON.stringify(next, null, 2), 'utf-8');
}

async function runWithAgent(agentId: string, userPrompt: string, extraSystemPrompt?: string) {
  const agentPath = path.join(process.cwd(), 'config', 'agents', 'instances', `${agentId}.json`);
  const agentRaw = await fs.readFile(agentPath, 'utf-8');
  const agent = JSON.parse(agentRaw);

  const llmProvidersPath = path.join(process.cwd(), 'config', 'settings', 'llm-providers.json');
  let defaultModel = 'claude-sonnet-4-20250514';
  try {
    const providersRaw = await fs.readFile(llmProvidersPath, 'utf-8');
    const providers = JSON.parse(providersRaw);
    defaultModel = providers?.providers?.claude?.defaultModel || defaultModel;
  } catch {}

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
}

export type OrchestrateParams = {
  flags?: { enabled?: boolean; shadowMode?: boolean; agentAllowlist?: string[]; taskTypeAllowlist?: string[] };
  prompt: string;
  planAgentId: string;
  executeAgentIds: string[]; // 支持并行
  summarizeAgentId: string;
};

export async function startRun(params: OrchestrateParams): Promise<{ runId: string }> {
  const runId = nanoid(10);
  const startedAt = Date.now();
  await writeHistory(runId, { runId, startedAt, status: 'running', params });

  // 异步执行主流程
  ;(async () => {
    const { flags, prompt, planAgentId, executeAgentIds, summarizeAgentId } = params;
    if (flags) featureFlags.set(flags);
    const cm = ensureInitialized();

    // 定义任务：规划、多个并行执行、总结
    const tPlan: Task = { id: `plan-${nanoid(6)}`, type: 'plan', payload: { prompt } };
    const tExecs: Task[] = executeAgentIds.map((_, idx) => ({ id: `exec${idx + 1}-${nanoid(5)}`, type: 'execute', dependencies: [tPlan.id], payload: { prompt } }));
    const tSum: Task = { id: `sum-${nanoid(6)}`, type: 'summarize', dependencies: tExecs.map(t => t.id), payload: { prompt } };

    cm.assignTask(tPlan, planAgentId);
    for (let i = 0; i < tExecs.length; i++) cm.assignTask(tExecs[i], executeAgentIds[i] || executeAgentIds[0]);
    cm.assignTask(tSum, summarizeAgentId);

    publish(runId, { type: 'START', runId, at: Date.now(), prompt, agents: { planAgentId, executeAgentIds, summarizeAgentId } });

    // 规划阶段
    publish(runId, { type: 'TASK_STARTED', taskId: tPlan.id, agentId: planAgentId, stage: 'plan' });
    cm.mirrorEvent({ name: 'TASK_STARTED', taskId: tPlan.id, agentId: planAgentId, at: Date.now() });
    const planText = await runWithAgent(planAgentId, prompt);
    publish(runId, { type: 'TASK_OUTPUT', taskId: tPlan.id, text: planText });
    cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: tPlan.id, agentId: planAgentId, at: Date.now(), payload: { text: planText } });
    publish(runId, { type: 'TASK_COMPLETED', taskId: tPlan.id });
    await writeHistory(runId, { planText });

    // 执行阶段（并行）
    publish(runId, { type: 'PARALLEL_START', count: tExecs.length });
    const execPromises = tExecs.map(async (t, i) => {
      const aid = executeAgentIds[i] || executeAgentIds[0];
      publish(runId, { type: 'TASK_STARTED', taskId: t.id, agentId: aid, stage: 'execute' });
      cm.mirrorEvent({ name: 'TASK_STARTED', taskId: t.id, agentId: aid, at: Date.now() });
      const execText = await runWithAgent(
        aid,
        `请基于以下规划执行任务，给出清晰、可验证的产出：\n\n【规划内容】\n${planText}\n\n【用户任务】\n${prompt}`
      );
      publish(runId, { type: 'TASK_OUTPUT', taskId: t.id, text: execText });
      cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: t.id, agentId: aid, at: Date.now(), payload: { text: execText } });
      publish(runId, { type: 'TASK_COMPLETED', taskId: t.id });
      return { id: t.id, text: execText };
    });
    const execResults = await Promise.all(execPromises);
    await writeHistory(runId, { execResults });

    // 总结阶段（聚合并行结果）
    publish(runId, { type: 'TASK_STARTED', taskId: tSum.id, agentId: summarizeAgentId, stage: 'summarize' });
    cm.mirrorEvent({ name: 'TASK_STARTED', taskId: tSum.id, agentId: summarizeAgentId, at: Date.now() });
    const mergedExec = execResults.map((r, idx) => `【执行${idx + 1}】\n${r.text}`).join('\n\n');
    const sumText = await runWithAgent(
      summarizeAgentId,
      `请基于以下执行结果输出“结论要点、可执行建议、可能风险与后续建议”：\n\n${mergedExec}\n\n【用户任务】\n${prompt}`
    );
    publish(runId, { type: 'TASK_OUTPUT', taskId: tSum.id, text: sumText });
    cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: tSum.id, agentId: summarizeAgentId, at: Date.now(), payload: { text: sumText } });
    publish(runId, { type: 'TASK_COMPLETED', taskId: tSum.id });
    const finishedAt = Date.now();
    await writeHistory(runId, { sumText, finishedAt, status: 'completed' });
    publish(runId, { type: 'FINISH', runId, at: finishedAt });
  })().catch(async (err) => {
    await writeHistory(runId, { status: 'failed', error: String(err) });
    publish(runId, { type: 'ERROR', message: String(err) });
  });

  return { runId };
}

export async function readHistoryList() {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const list = [] as any[];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
      const data = JSON.parse(raw);
      list.push({ runId: data.runId, status: data.status, startedAt: data.startedAt, finishedAt: data.finishedAt, prompt: data.params?.prompt });
    } catch {}
  }
  list.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  return list;
}

export async function readHistory(runId: string) {
  await ensureDir();
  const file = path.join(DATA_DIR, `${runId}.json`);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

export async function deleteHistory(runId: string) {
  await ensureDir();
  const file = path.join(DATA_DIR, `${runId}.json`);
  await fs.rm(file, { force: true });
}

export async function updateHistory(runId: string, patch: any) {
  await writeHistory(runId, patch);
}

