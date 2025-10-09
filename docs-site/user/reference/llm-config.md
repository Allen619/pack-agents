---
title: LLM 配置
description: 模型提供商、Agent 模型参数与密钥引用的配置方法
---

# LLM 配置

本文介绍如何在 Pack Agents 中配置 Claude 模型与密钥，并说明各配置文件与运行时行为。

## 配置入口一览
- 全局提供商清单：`config/settings/llm-providers.json`
- Agent 实例配置：`config/agents/instances/{agentId}.json`
- 工具权限策略：`config/settings/tools-config.json`

## 全局提供商（可选）
文件：`config/settings/llm-providers.json`

```json
{
  "providers": {
    "claude": {
      "name": "Anthropic Claude",
      "models": ["claude-sonnet-4-20250514", "claude-haiku-20250514"],
      "defaultModel": "claude-sonnet-4-20250514"
    }
  }
}
```

此文件用于 UI 建议与下拉选项展示；实际聊天请求以 Agent 自身的 `llmConfig` 为准。

## Agent 实例（必需）
文件：`config/agents/instances/{agentId}.json`

关键字段：
- `systemPrompt`：系统提示词。
- `llmConfig.provider`：模型提供商，Claude 场景为 `claude`。
- `llmConfig.baseUrl`：Claude API 入口，例如 `https://api.anthropic.com`。
- `llmConfig.model`：模型名称，例如 `claude-sonnet-4-20250514`。
- `llmConfig.apiKey` 或 `llmConfig.apiKeyRef`：密钥或其环境变量名（推荐后者）。
- `knowledgeBasePaths`：知识库绝对路径数组。

示例：
```json
{
  "id": "agent-demo",
  "name": "代码助手",
  "systemPrompt": "你是一名资深代码助手……",
  "llmConfig": {
    "provider": "claude",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-sonnet-4-20250514",
    "apiKeyRef": "CLAUDE_API_KEY"
  },
  "knowledgeBasePaths": ["D:/repo/docs", "/var/data/handbook"]
}
```

## 密钥与环境变量
支持两种方式：
- 直接填写 `llmConfig.apiKey`（直连）。
- 推荐：环境变量引用 `llmConfig.apiKeyRef`，例如设置 `CLAUDE_API_KEY` 后仅在配置中写入其名字。

导出密钥示例：
```bash
export CLAUDE_API_KEY=sk-ant-***
```
Windows PowerShell：
```powershell
$env:CLAUDE_API_KEY = 'sk-ant-***'
```

安全建议与轮换流程请参见《安全/LLM 密钥管理》。

## 聊天运行时映射
在聊天接口中，Agent 配置会映射为 SDK 所需环境：
- `llmConfig.baseUrl` → `ANTHROPIC_BASE_URL`
- `llmConfig.apiKey` 或 `llmConfig.apiKeyRef` → `ANTHROPIC_AUTH_TOKEN`
- `llmConfig.model` → `ANTHROPIC_MODEL`

当配置 `knowledgeBasePaths`：
- 第一个路径作为工作目录（`cwd`）。
- 其余路径作为 `additionalDirectories` 注入 SDK。

## 常见问题
- 缺少密钥：请填写 `apiKey` 或设置 `apiKeyRef` 并在环境中导出对应变量。
- 不确定模型名：参考 `llm-providers.json` 或 Claude 官方文档；模型需与当前 Claude Code 版本兼容。
- Windows 路径：建议使用绝对路径，注意反斜杠转义与权限。

