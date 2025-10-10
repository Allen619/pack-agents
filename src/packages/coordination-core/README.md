# coordination-core（内置旁路调度内核）

目标：新增独立的协调/调度模块，默认关闭，对现有功能零侵入；支持影子运行与灰度切换，可一键回退。

## 特性开关（环境变量）

- `COORDINATION_ENABLED`：是否启用新调度（默认关闭）
- `COORDINATION_SHADOW_MODE`：是否开启影子模式（默认关闭）
- `COORDINATION_AGENT_ALLOWLIST`：启用新调度的 agentId 白名单，逗号分隔
- `COORDINATION_TASKTYPE_ALLOWLIST`：启用新调度的 task.type 白名单，逗号分隔

建议流程：先 `ENABLED=true` 且 `SHADOW_MODE=true` 进行影子验证，通过后逐步在白名单上关闭影子、开启新调度。

## 对外 API

`CoordinationManager`：
- `initialize()` / `shutdown()`
- `assignTask(task, agentId): boolean`（返回是否走了新调度）
- `cancelTask(taskId, reason?)`
- `mirrorEvent(event)`：影子/灰度期对账入口
- `getAgentTasks(agentId)` / `getAgentTaskCount(agentId)`
- `getHealthStatus()` / `getMetricsSnapshot()`

仅导出 `CoordinationManager` 与 `core/types` 中的类型。

## 最小用法（伪代码）

```ts
import { CoordinationManager, featureFlags } from '@/packages/coordination-core';

// 可选：在测试中用 set() 暂存开关
// featureFlags.set({ enabled: true, shadowMode: true, agentAllowlist: ['a1'], taskTypeAllowlist: ['t.download'] });

const cm = new CoordinationManager();
cm.initialize();

// 影子期：鏡像既有事件
cm.mirrorEvent({ name: 'TASK_COMPLETED', taskId: 't1', at: Date.now() });

// 灰度期：白名单匹配时才会真正派发
cm.assignTask({ id: 't2', type: 't.download', timeoutMs: 30_000 }, 'a1');

// 查询/健康快照
cm.getHealthStatus();
cm.getMetricsSnapshot();

cm.shutdown();
```

## 约束

- 不修改现有执行链路；所有行为可通过开关关闭或回退。
- 不引入外部强依赖；事件总线/日志均内置轻量适配。
- TypeScript 与仓库保持一致设置（严格模式），通过 `Map#forEach` 兼容 ES5 目标。

