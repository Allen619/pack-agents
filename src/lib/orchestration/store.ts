// UTF-8
import { promises as fs } from 'fs';
import * as path from 'path';

export type RunRecord = {
  runId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  finishedAt?: number;
  prompt?: string;
  planText?: string;
  execResults?: Array<{ index: number; text: string }>;
  sumText?: string;
};

const BASE_DIR = path.join(process.cwd(), 'data', 'coordination-runs');

async function ensureDir() {
  await fs.mkdir(BASE_DIR, { recursive: true }).catch(() => {});
}

export async function saveRun(rec: RunRecord) {
  await ensureDir();
  const file = path.join(BASE_DIR, `${rec.runId}.json`);
  await fs.writeFile(file, JSON.stringify(rec, null, 2), 'utf-8');
}

export async function readRun(runId: string): Promise<RunRecord | null> {
  try {
    const file = path.join(BASE_DIR, `${runId}.json`);
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function deleteRun(runId: string) {
  try {
    const file = path.join(BASE_DIR, `${runId}.json`);
    await fs.unlink(file);
  } catch {}
}

export async function listRuns(): Promise<RunRecord[]> {
  await ensureDir();
  const files = await fs.readdir(BASE_DIR).catch(() => [] as string[]);
  const out: RunRecord[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const rec = await readRun(path.basename(f, '.json'));
    if (rec) out.push(rec);
  }
  // 最新在前
  out.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  return out;
}

export async function updateRun(runId: string, patch: Partial<RunRecord>) {
  const current = (await readRun(runId)) || ({ runId, status: 'running', startedAt: Date.now() } as RunRecord);
  const next: RunRecord = {
    ...current,
    ...patch,
    runId: current.runId, // 保持 runId 不变
  };
  await saveRun(next);
  return next;
}
