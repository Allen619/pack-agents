// UTF-8
// 特性开关：默认关闭；支持影子模式与灰度白名单

interface RuntimeFlags {
  enabled?: boolean;
  shadowMode?: boolean;
  agentAllowlist?: string[];
  taskTypeAllowlist?: string[];
}

const runtime: RuntimeFlags = {};

const parseList = (v: string | undefined): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const featureFlags = {
  set(flags: RuntimeFlags) {
    Object.assign(runtime, flags);
  },

  isEnabled(): boolean {
    if (typeof runtime.enabled === 'boolean') return !!runtime.enabled;
    const v = process.env.COORDINATION_ENABLED;
    return v === '1' || v === 'true';
  },

  isShadowMode(): boolean {
    if (typeof runtime.shadowMode === 'boolean') return !!runtime.shadowMode;
    const v = process.env.COORDINATION_SHADOW_MODE;
    return v === '1' || v === 'true';
  },

  agentAllowlist(): string[] {
    return runtime.agentAllowlist ?? parseList(process.env.COORDINATION_AGENT_ALLOWLIST);
  },

  taskTypeAllowlist(): string[] {
    return runtime.taskTypeAllowlist ?? parseList(process.env.COORDINATION_TASKTYPE_ALLOWLIST);
  },

  isAgentEnabled(agentId: string): boolean {
    const list = this.agentAllowlist();
    if (!list.length) return false;
    return list.includes(agentId);
  },

  isTaskTypeEnabled(taskType: string): boolean {
    const list = this.taskTypeAllowlist();
    if (!list.length) return false;
    return list.includes(taskType);
  },
};

