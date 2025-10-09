# LLM 密钥管理指引

本文档介绍在 Pack Agents 中如何安全地配置、使用以及轮换大模型密钥。

## 1. 环境变量配置

- 本地开发：在 `.env.local` 或当前 shell 中导出密钥，例如：
  ```bash
  export CLAUDE_API_KEY=sk-ant-***
  ```
- 生产部署：推荐使用 KMS、Vault、CI/CD Secret Store 等平台级密钥管理方案。
- 仓库已忽略 `.env*` 文件；请勿将密钥写入 Git 版本历史。

## 2. 前端表单行为

- `AgentConfigForm`、`ClaudeAgentConfigForm` 支持两种方式：
  - 直接输入明文 `API Key`（直连）。
  - 输入环境变量名 `apiKeyRef`（如 `CLAUDE_API_KEY`），推荐优先使用。
- 为避免密钥进入磁盘与 Git 历史，建议仅填写 `apiKeyRef`，并在环境中导出同名变量。

## 3. 服务端持久化策略

- 当前版本支持持久化 `llmConfig.apiKey` 与 `llmConfig.apiKeyRef`。
- 强烈建议使用 `apiKeyRef`，以避免明文密钥落盘。
- 后续版本将逐步默认剔除 `apiKey` 的落盘行为，仅保留 `apiKeyRef`。

## 4. 测试与 E2E 前置

- 在运行 `npm run test`、Playwright 或其它自动化前，确保环境变量已设置。
- CI 流水线通过环境变量注入密钥，无需修改代码与配置。

## 5. 密钥轮换流程

1. 在目标环境更新新的密钥值（如刷新 `CLAUDE_API_KEY`）。
2. 打开相关 Agent 编辑页，更新 `apiKey` 或 `apiKeyRef` 并保存（推荐更新 `apiKeyRef`）。
3. 重新部署或重启服务，确认新密钥已生效。

## 6. 审计与安全建议

- 定期检查 commit 历史，确认没有敏感信息泄露。
- 如发现旧配置含有明文 `apiKey`，请及时清理并切换到 `apiKeyRef`。
- 根据团队安全策略控制环境变量访问权限，并设置定期轮换周期。

