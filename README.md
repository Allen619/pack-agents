# Pack Agents - 多Agent工作流管理平台

> 基于 Claude Code SDK 的 AI 工作流管理平台，支持多Agent协作、可视化编排和实时监控

## 🌟 特性

- 🤖 **Agent 工厂**: 可视化创建和管理 AI Agent
- 🔄 **工作流编排**: 拖拽式工作流设计和执行
- 📊 **实时监控**: 基于 SSE 的实时状态反馈
- 🗃️ **文件存储**: 零配置的 JSON 文件存储系统
- 🎨 **现代化 UI**: 基于 Ant Design X 的 AI 原生界面
- 🔧 **Claude 集成**: 深度集成 Claude Code SDK

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

1. 克隆项目：

```bash
git clone https://github.com/Allen619/pack-agents.git
cd pack-agents
```

2. 安装依赖：

```bash
npm install
```

3. 初始化配置系统：

```bash
npm run init-config
```

4. 配置环境变量：

```bash
cp .env.example .env.local
# 编辑 .env.local 添加你的 API 密钥
```

5. 启动开发服务器：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
pack-agents/
├── config/                  # 配置文件目录（零数据库）
│   ├── agents/
│   │   ├── templates/       # Agent 模板
│   │   └── instances/       # Agent 实例
│   ├── workflows/           # 工作流配置
│   ├── executions/          # 执行记录
│   ├── logs/               # 日志文件
│   └── settings/           # 系统设置
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── dashboard/      # 主控面板
│   │   ├── agents/         # Agent 管理
│   │   ├── workflows/      # 工作流管理
│   │   └── executions/     # 执行监控
│   ├── components/         # React 组件
│   ├── lib/                # 工具库和服务
│   │   ├── storage/        # 文件存储服务
│   │   ├── claude/         # Claude SDK 集成
│   │   ├── runtime/        # 执行运行时
│   │   ├── utils/          # 工具函数
│   │   └── types/          # TypeScript 类型
│   ├── styles/             # 样式文件
│   └── hooks/              # React Hooks
├── scripts/                # 脚本文件
└── docs/                   # 文档
```

## 🔧 核心功能

### Agent 工厂

- 基于模板快速创建 Agent
- 配置 LLM 提供商和参数
- 管理工具权限和知识库路径
- Agent 使用统计和性能监控

### 工作流编排

- 可视化工作流设计界面
- 支持串行和并行任务执行
- 智能依赖关系管理
- 工作流模板和复用

### 执行运行时

- 实时执行状态监控
- 错误处理和自动重试
- 草稿板状态共享
- 结果聚合和输出

## 🛠️ 开发指南

### 添加新的 Agent 模板

1. 在 `config/agents/templates/` 目录创建 JSON 文件
2. 定义 Agent 的角色、提示词和工具
3. 重启应用加载新模板

### 扩展 API 接口

1. 在 `src/app/api/` 目录下创建新的路由文件
2. 实现 GET、POST、PUT、DELETE 方法
3. 使用统一的 ApiResponse 格式

### 自定义组件

1. 在 `src/components/` 目录创建组件
2. 使用 Ant Design X 的 AI 专用组件
3. 遵循响应式设计原则

## 📊 API 文档

### Claude 执行 API (核心)

- `POST /api/claude/agents/{id}/execute` - 执行 Claude Agent
- `POST /api/claude/agents/{id}/execute/stream` - 流式执行 (SSE)
- `POST /api/claude/workflows/{id}/execute` - 执行 Claude 工作流
- `GET /api/claude/mcp/tools` - 获取 MCP 工具列表

### 配置管理

- `GET /api/config` - 获取系统配置概览
- `POST /api/config` - 初始化配置系统

### Agent 管理

- `GET /api/agents` - 获取 Agent 列表
- `POST /api/agents` - 创建新 Agent
- `GET /api/agents/{id}` - 获取单个 Agent
- `PUT /api/agents/{id}` - 更新 Agent
- `DELETE /api/agents/{id}` - 删除 Agent

### 模板管理

- `GET /api/agents/templates` - 获取模板列表
- `POST /api/agents/templates` - 从模板创建 Agent

## 🎯 路线图

### 第一期 (已完成)

- ✅ 项目架构搭建
- ✅ 配置系统设计
- ✅ Agent 工厂基础功能
- ✅ 基础 API 接口
- ✅ 现代化 UI 界面

### 第二期 (开发中)

- 🔄 工作流可视化编排
- 🔄 多 Agent 协作执行
- 🔄 实时监控和调试
- 🔄 Claude Code SDK 深度集成

### 第三期 (计划中)

- 📋 企业级权限管理
- 📋 分布式部署支持
- 📋 性能优化和缓存
- 📋 监控和告警系统

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如有问题或建议，请：

1. 查看 [文档](docs/)
2. 搜索 [Issues](https://github.com/Allen619/pack-agents/issues)
3. 创建新的 Issue

## 🙏 致谢

感谢以下开源项目：

- [Claude Code SDK](https://github.com/anthropics/claude-code) - 核心AI引擎
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Ant Design X](https://x.ant.design/) - AI 原生组件库
- [Ant Design](https://ant.design/) - 企业级 UI 组件库
- [LangChain](https://langchain.com/) - 辅助工具开发框架
- [Claude](https://claude.ai/) - Anthropic AI 助手

---

**Pack Agents** - 让 AI 工作流变得简单而强大 🚀
# Pack Agents - 多 Agent 工作流管理平台

> 基于 Claude Code SDK 的 AI 工作流管理平台，支持多 Agent 协作、可视化编排与集成。

## 🌟 特性

- 🤖 Agent 工厂：可视化创建和管理 AI Agent
- 🔄 工作流编排（置灰）：当前版本仅支持浏览，暂不支持新建/执行/删除
- 📊 实时监控：SSE 实时状态反馈（导航入口已下线，后续合并）
- 🗃️ 文件存储：零配置的 JSON 文件存储
- 🎨 现代化 UI：基于 Ant Design 的响应式界面
- 🔧 Claude 集成：深度集成 Claude Code SDK

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

1. 克隆项目

```bash
git clone https://github.com/Allen619/pack-agents.git
cd pack-agents
```

2. 安装依赖

```bash
npm install
```

3. 初始化配置系统

```bash
npm run init-config
```

4. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 添加你的 API 密钥
```

5. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 查看应用

## 📌 当前版本说明（重要）

- 协调内核 Demo 页面与相关用户文档已移除。
- 工作流编排功能已置灰：页面保留浏览能力；“新建工作流”按钮（包含顶部右上角）已移除，卡片编辑/执行/删除操作禁用。
- 左侧导航移除了“执行监控”和“系统设置”。
- MCP 服务中心页面不再提示“写入 config/settings/mcp-servers.json”的文案。
- 控制台（首页）已重排：移除“创建工作流”快捷入口与“执行监控”跳转链接，保留统计与最近活动概览。

## 📁 项目结构

```
pack-agents/
├── config/
│   ├── agents/
│   │   ├── templates/
│   │   └── instances/
│   ├── workflows/
│   ├── executions/          # 执行记录（导航入口已移除）
│   └── settings/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── workflows/       # 工作流管理（置灰，仅浏览）
│   │   └── mcp/
│   ├── components/
│   ├── lib/
│   └── hooks/
└── docs-site/
```

## 🔧 核心功能

### Agent 工厂

- 基于模板快速创建 Agent
- 配置 LLM 提供商与参数
- 管理工具权限与知识库路径
- Agent 使用统计与性能监控

### 工作流编排（置灰）

- 可视化工作流设计界面（当前版本仅浏览）
- 串行/并行、依赖管理与模板化（后续恢复）

## 🛠️ 开发指引

### 添加新的 Agent 模板

1. 在 `config/agents/templates/` 目录创建 JSON 文件
2. 定义 Agent 的角色、提示词与工具
3. 重启应用加载新模板

### 扩展 API 接口

1. 在 `src/app/api/` 目录下创建新的路由文件
2. 实现 GET、POST、PUT、DELETE 方法
3. 使用统一 `ApiResponse` 格式

## 🤝 贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'feat: xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 提交 Pull Request

## 📄 许可证

MIT，详见 LICENSE。
