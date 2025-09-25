---
title: 常见问题
description: Pack Agents 使用过程中的常见问题和解决方案
---

# 常见问题解答

快速找到您遇到的问题的解决方案。

## 🆕 新手入门问题

### Q1: 我需要编程经验吗？

**A**: 不需要！Pack Agents 专门为非技术用户设计：

- 可视化的拖拽界面
- 预设的模板和配置
- 简单的表单填写
- 详细的操作指南

**适合人群**: 产品经理、业务分析师、内容创作者、项目管理者

---

### Q2: 系统对电脑配置有什么要求？

**A**: 最低配置要求：

| 组件   | 最低要求                            | 推荐配置     |
| ------ | ----------------------------------- | ------------ |
| CPU    | 双核 2.0GHz                         | 四核 2.5GHz+ |
| 内存   | 4GB                                 | 8GB+         |
| 硬盘   | 2GB 可用空间                        | 10GB+ SSD    |
| 网络   | 稳定的互联网连接                    | 宽带连接     |
| 浏览器 | Chrome 90+, Firefox 88+, Safari 14+ | 最新版本     |

**性能优化建议**:

- 关闭不必要的浏览器标签页
- 确保有足够的内存可用
- 使用有线网络连接获得更稳定的体验

---

### Q3: 我的数据会被发送到外部服务器吗？

**A**: 数据安全是我们的首要考虑：

**本地存储**:

- 所有配置和工作流数据存储在本地
- 不会上传到外部服务器
- 您完全控制数据的访问权限

**AI 服务调用**:

- 只有在执行 AI 任务时才会发送必要的文本内容
- 不会发送敏感信息如密码、密钥等
- 支持配置数据脱敏规则

**隐私保护措施**:

- API 密钥本地加密存储
- 支持私有化部署
- 完整的审计日志记录

---

### Q4: 可以创建多少个 Agent？

**A**: 没有硬性限制，但建议合理规划：

**技术限制**:

- 取决于您的硬件配置
- 每个 Agent 占用少量存储空间
- 并发执行受资源限制

**最佳实践**:

- 建议单个团队维护 10-20 个核心 Agent
- 使用模板复用常见配置
- 定期清理不再使用的 Agent
- 按项目或团队组织管理

---

### Q5: 如何获取 API 密钥？

**A**: 详细的获取步骤：

**Anthropic Claude (推荐)**:

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 使用邮箱注册账户
3. 完成邮箱验证
4. 进入 API Keys 页面
5. 点击 "Create Key" 创建新密钥
6. 复制密钥（格式：`sk-ant-...`）
7. 妥善保存，密钥只显示一次

**OpenAI GPT**:

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册并登录账户
3. 进入 API Keys 管理页面
4. 点击 "Create new secret key"
5. 设置密钥名称和权限
6. 复制生成的密钥

**费用说明**:

- 新用户通常有免费额度
- 按使用量付费，成本可控
- 建议设置使用限额避免超支

---

## ⚙️ 配置和使用问题

### Q6: 如何提高 AI 回答的质量？

**A**: 多个维度的优化策略：

**系统提示优化**:

```
❌ 不好的提示：
"你是一个助手，帮我分析代码"

✅ 好的提示：
"你是一个有10年经验的高级软件工程师，专门负责代码质量审查。
请分析提供的代码并从以下角度评估：
1. 代码规范性（命名、格式、结构）
2. 性能优化机会
3. 安全风险点
4. 可维护性改进建议

输出格式：
## 代码质量评估
**总体评分**: {score}/100
**主要问题**: {issues_count}个

### 详细分析
..."
```

**知识库建设**:

- 添加相关的技术文档和规范
- 包含具体的代码示例
- 保持内容的时效性和准确性
- 结构化组织，便于检索

**模型选择**:

- 复杂推理任务：Claude-3-Sonnet
- 创意写作任务：GPT-4
- 快速响应任务：Claude-3-Haiku
- 代码相关任务：Claude-3-Sonnet

---

### Q7: 系统响应速度很慢怎么办？

**A**: 全方位的性能优化指南：

**网络优化**:

```bash
# 检查网络连接
ping api.anthropic.com
ping api.openai.com

# 检查DNS解析速度
nslookup api.anthropic.com
```

**系统资源检查**:

- 关闭不必要的应用程序
- 确保有足够的可用内存
- 检查硬盘空间是否充足
- 监控CPU使用率

**配置优化**:

- 减少并行执行的 Agent 数量
- 优化知识库文件大小（建议单文件 < 1MB）
- 使用更快的 AI 模型（如 Claude-3-Haiku）
- 启用缓存机制

**性能监控**:

```javascript
// 在浏览器控制台查看性能数据
window.__performance__.getReport();
```

---

### Q8: 如何备份我的配置？

**A**: 完整的备份策略：

**自动备份**:

- 系统每天自动创建备份
- 保留最近7天的备份文件
- 备份文件存储在 `./backups/` 目录

**手动备份**:

```bash
# 导出所有配置
cp -r ./config ./backup-$(date +%Y%m%d)

# 压缩备份
tar -czf pack-agents-backup-$(date +%Y%m%d).tar.gz ./config
```

**云端备份**:

- 支持同步到 Google Drive
- 支持同步到 Dropbox
- 支持自定义的 WebDAV 服务

**恢复配置**:

1. 停止 Pack Agents 服务
2. 替换 `./config` 目录
3. 重启服务
4. 验证配置是否正确

---

### Q9: Agent 执行失败怎么办？

**A**: 系统化的故障诊断流程：

**第一步：检查基础配置**

```checklist
□ API 密钥是否正确且未过期
□ 网络连接是否正常
□ Agent 配置是否完整
□ 知识库路径是否存在
□ 工具权限是否合适
```

**第二步：查看错误日志**

```bash
# 查看最新的错误日志
tail -f ./logs/error.log

# 查看特定 Agent 的日志
grep "agent_id_here" ./logs/execution.log
```

**第三步：逐步调试**

1. 先测试单个 Agent 的聊天功能
2. 检查系统提示是否清晰
3. 验证知识库内容是否正确
4. 测试简化版的工作流

**常见错误类型**:
| 错误类型 | 可能原因 | 解决方法 |
|----------|----------|----------|
| API_KEY_INVALID | 密钥错误或过期 | 重新配置有效密钥 |
| NETWORK_TIMEOUT | 网络连接问题 | 检查网络和防火墙设置 |
| INSUFFICIENT_PERMISSIONS | 权限不足 | 调整 Agent 工具权限 |
| KNOWLEDGE_BASE_ERROR | 知识库访问失败 | 检查文件路径和权限 |

---

### Q10: 工作流卡在某个步骤怎么办？

**A**: 工作流调试的系统方法：

**实时监控**:

```json
{
  "workflow_id": "wf_20250920_143015",
  "current_step": "security_analysis",
  "status": "running",
  "stuck_time": "5m 32s",
  "last_activity": "2025-09-20T14:35:22Z"
}
```

**诊断步骤**:

1. **检查依赖关系**
   - 前置步骤是否完成
   - 输出数据是否符合格式要求
   - 条件判断是否正确

2. **验证资源可用性**
   - API 额度是否充足
   - 网络连接是否稳定
   - 系统资源是否足够

3. **手动干预选项**
   - 跳过当前步骤
   - 重启失败的节点
   - 修改配置后重试
   - 切换到手动执行模式

**预防措施**:

- 设置合理的超时时间
- 配置自动重试机制
- 添加健康检查节点
- 建立监控和告警

---

## 🔧 技术问题

### Q11: 如何自定义 Agent 的功能？

**A**: 多种自定义方式：

**系统提示定制**:

- 详细描述期望的行为
- 提供具体的输出格式
- 设定处理边界和约束
- 包含示例和模板

**知识库扩展**:

- 添加专业领域文档
- 包含最佳实践案例
- 提供参考标准和规范
- 定期更新和维护

**工具权限调整**:

- 根据任务需求开启功能
- 遵循最小权限原则
- 设置安全限制
- 记录权限变更

**模型参数调优**:

```json
{
  "temperature": 0.7, // 创造性 vs 确定性
  "max_tokens": 4000, // 最大输出长度
  "top_p": 0.9, // 采样策略
  "frequency_penalty": 0 // 重复惩罚
}
```

---

### Q12: 工作流可以自动执行吗？

**A**: 支持多种自动化触发方式：

**当前版本**:

- 手动触发执行
- API 接口调用
- 定时任务（通过外部工具）

**计划功能**:

- 文件变化触发
- 定时调度执行
- 事件驱动触发
- Webhook 集成

**实现定时执行**:

```bash
# 使用 cron 定时执行
# 每天早上8点运行数据分析工作流
0 8 * * * curl -X POST "http://localhost:3000/api/workflows/daily-analysis/execute"

# 使用 GitHub Actions 触发
# 代码提交时自动执行质量检查
on:
  push:
    branches: [ main ]
jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Pack Agents Workflow
        run: |
          curl -X POST "${{ secrets.PACK_AGENTS_URL }}/api/workflows/code-quality/execute" \
               -H "Authorization: Bearer ${{ secrets.API_TOKEN }}"
```

---

### Q13: 如何监控系统性能？

**A**: 全面的性能监控体系：

**内置监控工具**:

```javascript
// 浏览器控制台查看性能指标
window.__performance__.getReport()

// 输出示例
{
  "fcp": 1.2,              // 首次内容绘制时间
  "lcp": 2.1,              // 最大内容绘制时间
  "fid": 45,               // 首次输入延迟
  "cls": 0.05,             // 累积布局偏移
  "ttfb": 380,             // 首字节时间
  "memory_usage": "45.2MB", // 内存使用
  "api_response_time": 850  // API响应时间
}
```

**性能指标说明**:
| 指标 | 目标值 | 说明 |
|------|--------|------|
| FCP | < 1.5s | 首次内容显示时间 |
| LCP | < 2.5s | 主要内容加载时间 |
| FID | < 100ms | 交互响应延迟 |
| CLS | < 0.1 | 页面布局稳定性 |

**优化建议**:

- 启用浏览器缓存
- 减少并发 Agent 数量
- 优化知识库文件大小
- 使用 CDN 加速静态资源

**外部监控**:

```bash
# 使用 curl 监控 API 响应时间
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/config"

# curl-format.txt 内容:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#           time_total:  %{time_total}\n
```

---

## 💡 使用技巧

### 如何快速找到解决方案？

1. **使用文档搜索功能**：Ctrl+F 搜索关键词
2. **查看相关日志文件**：`./logs/` 目录下的日志
3. **检查网络状态**：确保可以访问 AI 服务
4. **重启服务**：`npm run dev` 重新启动
5. **清除缓存**：刷新浏览器缓存

### 获取更多帮助

- **GitHub Issues**: 提交详细的问题描述
- **社区讨论**: 参与技术交流
- **文档反馈**: 帮助改进文档质量

---

**如果这里没有找到您的问题答案，请查看 [错误诊断指南](./error-diagnosis.md) 或 [调试技巧](./debugging-tips.md)。**
