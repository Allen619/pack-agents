# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Claude Code SDK 的多 Agent 工作流管理平台，提供 Agent 工厂、工作流编排、实时监控等核心功能。项目采用零数据库设计，使用 JSON 文件存储配置和状态。

## 常用命令

### 开发和构建
- `npm run dev` - 启动开发服务器（包含文档开发）
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查
- `npm run type-check` - 运行 TypeScript 类型检查

### 测试
- `npm run test` - 运行 Jest 测试
- `npm run test:watch` - 以监视模式运行测试
- `npm run test:coverage` - 运行测试覆盖率报告
- `npm run test:e2e` - 运行 Playwright 端到端测试
- `npm run test:e2e:ui` - 运行 Playwright UI 模式
- `npm run test:all` - 运行所有测试（单元测试 + E2E 测试）

### 配置和初始化
- `npm run init-config` - 初始化配置系统，创建必要的目录结构

### 文档
- `npm run docs:dev` - 启动 VitePress 文档开发服务器
- `npm run docs:build` - 构建文档
- `npm run docs:preview` - 预览构建的文档

### 分析
- `npm run analyze` - 分析打包大小
- `npm run analyze:server` - 分析服务器端包大小
- `npm run analyze:browser` - 分析浏览器端包大小

## 核心架构

### 配置系统
项目采用零数据库设计，所有配置和数据存储在 `config/` 目录下：
- `agents/templates/` - Agent 模板配置
- `agents/instances/` - Agent 实例配置
- `workflows/` - 工作流配置
- `executions/` - 执行记录
- `logs/` - 日志文件
- `settings/` - 系统设置

### 核心模块
1. **Agent 工厂** (`src/lib/claude/`) - 基于 Claude Code SDK 的 Agent 创建和管理
2. **存储服务** (`src/lib/storage/`) - 文件系统存储抽象层
3. **执行运行时** (`src/lib/runtime/`) - 工作流执行引擎
4. **API 接口** (`src/app/api/`) - RESTful API 和 SSE 接口

### 技术栈
- **框架**: Next.js 14 (App Router)
- **UI 组件**: Ant Design + Ant Design X (AI 原生组件)
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **工作流可视化**: @xyflow/react
- **核心 AI**: Claude Code SDK (主) + LangChain (辅助)
- **测试**: Jest + Playwright
- **文档**: VitePress

## 重要开发约定

### 配置系统使用
- 所有配置变更需要通过存储服务 (`src/lib/storage/`) 进行
- 避免直接操作文件系统，使用封装的存储接口
- 配置变更需要触发相关缓存更新

### API 开发
- 统一使用 ApiResponse 格式
- 支持 SSE 的接口需实现 `/stream` 路由
- Claude 相关接口在 `/api/claude/` 路径下
- 配置管理接口在 `/api/config/` 路径下

### Agent 开发
- 优先使用 Claude Code SDK 的原生能力
- LangChain 仅作为辅助工具
- Agent 配置需遵循模板系统规范
- 支持动态工具权限管理

### 工作流开发
- 支持串行和并行混合执行模式
- 实现智能依赖关系解析
- 提供实时状态反馈机制
- 内置错误处理和重试逻辑

## 文件结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── agents/            # Agent 管理页面
│   ├── workflows/         # 工作流管理页面
│   └── executions/        # 执行监控页面
├── components/            # React 组件
├── lib/                   # 核心库和服务
│   ├── storage/           # 文件存储服务
│   ├── claude/            # Claude SDK 集成
│   ├── runtime/           # 执行运行时
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript 类型
├── hooks/                 # React Hooks
└── styles/                # 样式文件
```

## 环境配置
- 使用 `.env.local` 存储环境变量
- 需要配置 Claude API 密钥
- 支持多种 LLM 提供商配置