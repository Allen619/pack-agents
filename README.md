# Pack Agents - 多模型助手工作流管理平台

> 基于 Claude Code SDK 的 AI 工作流管理平台，支持多模型助手协作、智能体编排和实时监控

## 🌟 核心特性

- 🤖 **模型助手工厂**: 可视化创建和管理 AI 模型助手
- 🔄 **智能体编排**: 规划-执行-总结三阶段协作模式
- 📊 **实时监控**: 基于 SSE 的实时状态反馈
- 🗃️ **文件存储**: 零配置的 JSON 文件存储系统
- 🎨 **现代化 UI**: 基于 Ant Design X 的 AI 原生界面
- 🔧 **Claude 集成**: 深度集成 Claude Code SDK

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**:

```bash
git clone https://github.com/Allen619/pack-agents.git
cd pack-agents
```

2. **安装依赖**:

```bash
npm install
```

3. **初始化配置**:

```bash
npm run init-config
```

4. **配置环境变量**:

```bash
cp .env.example .env.local
# 编辑 .env.local 添加你的 Claude API 密钥
```

5. **启动开发服务器**:

```bash
npm run dev
```

6. **启动文档服务**:

```bash
npm run docs:dev
```

- 应用访问: [http://localhost:3000](http://localhost:3000)
- 文档访问: [http://localhost:5173](http://localhost:5173)

## 📁 项目架构

```
pack-agents/
├── config/                     # 配置文件目录（零数据库）
│   ├── agents/
│   │   ├── templates/          # 模型助手模板
│   │   └── instances/          # 模型助手实例
│   ├── workflows/              # 工作流配置（已弃用）
│   ├── executions/             # 执行记录
│   ├── logs/                   # 日志文件
│   └── settings/               # 系统设置
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── agents/            # 模型助手管理
│   │   ├── orchestration/      # 智能体编排
│   │   └── mcp/               # MCP 服务
│   ├── components/            # React 组件
│   ├── lib/                   # 工具库和服务
│   │   ├── storage/           # 文件存储服务
│   │   ├── claude/            # Claude SDK 集成
│   │   ├── runtime/           # 执行运行时
│   │   ├── utils/             # 工具函数
│   │   └── types/             # TypeScript 类型
│   ├── styles/                # 样式文件
│   └── hooks/                 # React Hooks
├── scripts/                    # 脚本文件
├── docs-site/                   # 用户文档
└── dist-docs/                  # 构建的文档
```

## 🔧 核心功能

### 🤖 模型助手工厂

- **快速创建**: 基于模板或从零开始创建模型助手
- **灵活配置**: 支持多种 LLM 提供商和模型参数
- **权限管理**: 细粒度的工具权限控制
- **知识库集成**: 支持本地文档和知识库访问
- **实时聊天**: 与模型助手进行流式对话

### 🔄 智能体编排

- **三阶段协作**: 规划→执行→总结的协作模式
- **动态规划**: AI 自动生成执行计划
- **并行执行**: 多个模型助手同时工作
- **实时确认**: 用户可审核和修改执行计划
- **影子模式**: 新功能安全测试机制

### 📊 实时监控

- **执行追踪**: 基于 SSE 的实时状态更新
- **历史记录**: 完整的执行历史和结果查看
- **性能监控**: 响应时间和资源使用统计
- **错误处理**: 智能重试和故障恢复

## 🛠️ 开发指南

### 添加模型助手模板

1. 在 `config/agents/templates/` 目录创建 JSON 文件
2. 定义模型助手的角色、系统提示和工具配置
3. 重启应用自动加载新模板

### 扩展 API 接口

1. 在 `src/app/api/` 目录创建路由文件
2. 实现标准的 HTTP 方法
3. 使用统一的 `ApiResponse` 格式
4. 添加适当的错误处理和验证

### 自定义组件

1. 在 `src/components/` 目录创建 React 组件
2. 使用 Ant Design X 的 AI 专用组件
3. 遵循响应式设计原则
4. 添加 TypeScript 类型定义

## 📊 API 接口

### 模型助手管理

- `GET /api/agents` - 获取模型助手列表
- `POST /api/agents` - 创建新模型助手
- `GET /api/agents/{id}` - 获取单个模型助手详情
- `PUT /api/agents/{id}` - 更新模型助手配置
- `DELETE /api/agents/{id}` - 删除模型助手
- `POST /api/agents/{id}/chat` - 与模型助手对话

### 智能体编排

- `POST /api/orchestration/run` - 启动智能体编排
- `GET /api/orchestration/stream?runId={id}` - 实时执行状态
- `POST /api/orchestration/confirm/{id}` - 确认执行计划
- `POST /api/orchestration/submit-plan/{id}` - 提交修改计划
- `GET /api/orchestration/history` - 获取执行历史

### MCP 服务管理

- `GET /api/mcp` - 获取 MCP 服务列表
- `POST /api/mcp/{name}/start` - 启动 MCP 服务
- `POST /api/mcp/{name}/stop` - 停止 MCP 服务

## 🎯 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI 组件**: Ant Design + Ant Design X (AI 原生)
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **AI 集成**: Claude Code SDK + LangChain
- **构建工具**: TypeScript + ESLint + Prettier
- **文档**: VitePress

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'feat: add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

- **文档**: [用户手册](http://localhost:5173)
- **问题反馈**: [GitHub Issues](https://github.com/Allen619/pack-agents/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/Allen619/pack-agents/discussions)

## 🙏 致谢

感谢以下开源项目的支持：

- [Claude Code SDK](https://github.com/anthropics/claude-code) - 核心AI引擎
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Ant Design X](https://x.ant.design/) - AI 原生组件库
- [Ant Design](https://ant.design/) - 企业级UI组件库
- [LangChain](https://langchain.com/) - AI应用开发框架
- [Claude](https://claude.ai/) - Anthropic AI助手

---

**Pack Agents** - 让 AI 模型助手协作变得简单而强大 🚀