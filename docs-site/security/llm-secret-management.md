# LLM 密钥管理指引

本文档介绍在 Pack Agents 中如何安全地配置、使用以及轮换大模型密钥。

## 1. 环境变量配置

- 本地开发：在 `.env.local` 或当前 shell 中导出密钥，例如：
  ```bash
  export CLAUDE_API_KEY=sk-xxxx
  ```
- 生产部署：推荐使用 KMS、Vault、CI/CD Secret Store 等平台级密钥管理方案。
- 仓库已忽略 `.env*` 文件；请勿将密钥写入 Git 版本历史。

## 2. 前端表单行为

- `AgentConfigForm`、`EnhancedAgentConfigForm`、`ClaudeAgentConfigForm` 仅展示占位符 `********`。
- 编辑时可选择：
  - **API Key**：直接输入明文，仅在当前会话内使用；保存后会被清空。
  - **环境变量引用**：填写变量名（如 `CLAUDE_API_KEY`），推荐优先使用。
- 如果只修改其他字段，请保留占位符，系统会沿用原有引用。

## 3. 服务端持久化策略

- `ConfigManager` 保存 Agent 时会移除 `llmConfig.apiKey`，仅写入 `apiKeyRef`。
- 加载配置后会将 `llmConfig.apiKey` 置空，避免明文扩散。
- 禁止手动在 `config/agents/instances/*.json` 中填写密钥。

## 4. 测试与 E2E 前置

- 在运行 `npm run test`、Playwright 或其它自动化前，确保环境变量已设置。
- CI 流水线同样通过环境变量注入密钥，不需要修改代码。

## 5. 密钥轮换流程

1. 在目标环境更新新的密钥值。
2. 打开相关 Agent 编辑页，填写新的密钥或环境变量引用并保存。
3. 重新部署或重启服务，确认新密钥已生效。

## 6. 审计与安全建议

- 定期检查 commit history，确认没有敏感信息泄露。
- 若发现旧配置仍含 `apiKey` 字段，可运行 `npm run init-config` 或手动删除后再保存。
- 根据团队安全策略控制环境变量访问权限，并设置轮换周期。
