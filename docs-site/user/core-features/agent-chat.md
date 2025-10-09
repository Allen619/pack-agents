---
title: Agent 聊天
description: 基于 Claude Code TypeScript SDK 的低延迟流式对话
---

# Agent 聊天

基于 `@anthropic-ai/claude-code` 的 `query({ prompt, options })` 流式接口，实现低延迟的增量输出对话。

## 功能概览
- 访问 `/agents/{agentId}/chat` 打开任一 Agent 的专属对话页。
- 前端通过 NDJSON 流接收响应，边到边渲染（delta → done）。
- 每次请求自动继承 Agent 的系统提示词、工具权限和知识库路径。
- 支持中断本次生成、清空上下文、复制代码片段等。

## 前置条件
1. 模型与提供商：在 Agent 设置中选择 `claude`，填写模型（如 `claude-sonnet-4`）。
2. API Key：
   - 方式 A：在 Agent 中填写 `llmConfig.apiKey`（直连）。
   - 方式 B（推荐）：在环境中导出 `CLAUDE_API_KEY`，并在 Agent 中填写 `llmConfig.apiKeyRef=CLAUDE_API_KEY`。
3. 知识库（可选）：在 Agent 配置中添加 `knowledgeBasePaths`，允许 Claude Code 会话内读取本地文档。
4. 工具策略：如需放宽工具，修改 `config/settings/tools-config.json`（Read / Edit / Write / Glob / Grep / Bash 等）。

提示：完整 SDK 参考请查看仓库内 `docs/claude-code-docs`。

## 对话流程
1. 在 Agent 列表选择目标，点击“聊天”。
2. 输入问题点击发送，UI 立即追加一条“助手(流式)”占位消息。
3. 服务端流返回 NDJSON：每条 `delta` 增量拼接到助手消息；收到 `done` 结束流并固化内容。
4. 点击“停止”通过 `AbortController` 中断；点击“清空”重置到欢迎消息。

## 接口契约
前端向 `/api/agents/{id}/chat` 提交完整历史（最后一条必须是用户消息）。

请求示例：
```http
POST /api/agents/agent-demo/chat
Content-Type: application/json

{
  "messages": [
    { "role": "assistant", "content": "你好，我是 agent-demo。" },
    { "role": "user", "content": "请帮我总结今天部署失败的原因。" }
  ],
  "sessionId": "optional-session-id",
  "options": {
    "maxTurns": 6,
    "continue": true,
    "permissionMode": "bypassPermissions"
  }
}
```

响应为 NDJSON（每行一个 JSON）：
```text
{"type":"delta","text":"正在检索最新部署日志..."}
{"type":"delta","text":"在 staging 环境发现 3 个失败任务。"}
{"type":"done","text":"...最终完整回答..."}
```

- `delta`：助手增量文本片段。
- `done`：最终合并文本，流关闭。
- `error`：错误信息（流关闭）。
- `sessionId`：当后端生成会话 ID 时，会附着在后续分片中，前端应保存以便续传。

## 选项与会话
- `maxTurns`：单次对话最多思考与工具回合数（默认 6）。
- `continue`：是否在已有 `sessionId` 的基础上续聊，`false` 则强制新会话。
- `permissionMode`：
  - `bypassPermissions`：自动执行所有工具（文件编辑、Bash、MCP 等），无人工确认。
  - `acceptEdits`：自动接受常规编辑；风险操作需确认。
  - `default`：每次工具调用需逐项确认。
  - `plan`：仅生成操作计划，不真正执行。

## 模型与环境变量映射
服务端对接 Claude Code SDK 时，会从 Agent 配置读取：
- `llmConfig.baseUrl` → 映射为环境变量 `ANTHROPIC_BASE_URL`
- `llmConfig.apiKey` 或 `llmConfig.apiKeyRef` → 映射为 `ANTHROPIC_AUTH_TOKEN`
- `llmConfig.model` → 映射为 `ANTHROPIC_MODEL`

如使用 `apiKeyRef`，请在系统环境中导出同名变量，例如（Linux/Mac）：
```bash
export CLAUDE_API_KEY=sk-ant-***
```
Windows PowerShell：
```powershell
$env:CLAUDE_API_KEY = 'sk-ant-***'
```

## 知识库路径解析
- `knowledgeBasePaths[0]` 作为会话工作目录（`cwd`）。
- 其余路径注入为 `additionalDirectories`；Claude Code 将在这些目录内进行检索/读写。
- 建议使用绝对路径，确保进程可读写。

## MCP 服务器
后端会从注册表中加载可用 MCP 服务器（过滤掉 `disabled`），以“名称”为 key 注入 SDK：
- 注册表文件：`config/settings/mcp-servers.json`
- 列表接口：`GET /api/mcp`
- 每个服务器包含 `command`、`args`、`env`，以 `stdio` 方式连接。

## 常见问题
- 找不到 API Key：
  - 方式 A：在 Agent 中填写 `llmConfig.apiKey`。
  - 方式 B：在系统中导出密钥为环境变量，并在 Agent 中设置 `llmConfig.apiKeyRef` 指向它（推荐）。
- 无输出/不流式：确认主机已安装 Claude Code CLI，必要时运行 `claude doctor` 诊断；检查浏览器网络面板是否为 `text/x-ndjson`。
- 知识库无效：确认路径存在且服务进程可读写；Windows 下注意转义路径分隔符。

