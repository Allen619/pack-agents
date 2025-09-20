---
title: API 参考文档
description: Pack Agents REST API 完整参考文档
---

# API 参考文档

Pack Agents 提供的 REST API 接口详细说明。

## 🌐 基础信息

### 基础 URL

```
http://localhost:3001/api
```

### 认证方式

当前版本使用本地部署，无需 API 认证。未来版本将支持 API Token 认证。

### 响应格式

所有 API 响应都使用统一的 JSON 格式：

```json
{
  "success": true,
  "data": {...},
  "message": "操作成功",
  "timestamp": "2025-09-20T14:30:00Z"
}
```

**错误响应格式**：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": {...}
  },
  "timestamp": "2025-09-20T14:30:00Z"
}
```

## 🤖 Agent 管理 API

### 获取 Agent 列表

```http
GET /api/agents
```

**查询参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| limit | integer | 否 | 每页数量，默认 10 |
| role | string | 否 | 按角色筛选 |
| search | string | 否 | 按名称搜索 |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent_001",
        "name": "代码质量检查师",
        "description": "专业的代码质量分析助手",
        "role": "developer",
        "created_at": "2025-09-20T10:30:00Z",
        "updated_at": "2025-09-20T14:15:00Z",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

### 创建 Agent

```http
POST /api/agents
```

**请求体**：

```json
{
  "name": "我的代码助手",
  "description": "帮助分析和优化代码质量",
  "role": "developer",
  "system_prompt": "你是一个专业的代码审查专家...",
  "llm_config": {
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229",
    "api_key": "sk-ant-...",
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 4000
    }
  },
  "knowledge_base": {
    "paths": ["./docs", "./standards"],
    "file_types": ["*.md", "*.txt"],
    "auto_update": true
  },
  "tools": {
    "file_read": true,
    "file_write": false,
    "network_access": true,
    "code_execution": false
  }
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "agent_002",
    "name": "我的代码助手",
    "status": "created",
    "created_at": "2025-09-20T14:30:00Z"
  },
  "message": "Agent 创建成功"
}
```

### 获取 Agent 详情

```http
GET /api/agents/{agent_id}
```

**路径参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| agent_id | string | 是 | Agent ID |

### 更新 Agent

```http
PUT /api/agents/{agent_id}
```

### 删除 Agent

```http
DELETE /api/agents/{agent_id}
```

## 🔄 工作流管理 API

### 获取工作流列表

```http
GET /api/workflows
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_001",
        "name": "代码质量检查流程",
        "description": "自动化代码质量分析和报告生成",
        "status": "active",
        "agent_count": 3,
        "last_execution": "2025-09-20T13:45:00Z",
        "success_rate": 95.2,
        "created_at": "2025-09-15T09:00:00Z"
      }
    ]
  }
}
```

### 创建工作流

```http
POST /api/workflows
```

**请求体**：

```json
{
  "name": "代码质量检查流程",
  "description": "全面的代码质量分析工作流",
  "config": {
    "timeout": 900,
    "retry_count": 2,
    "parallel_limit": 3
  },
  "agents": ["agent_001", "agent_002", "agent_003"],
  "main_agent": "agent_001",
  "execution_flow": {
    "stages": [
      {
        "id": "stage_1",
        "name": "代码分析",
        "agent_id": "agent_001",
        "parallel": false
      },
      {
        "id": "stage_2",
        "name": "安全检查",
        "agent_id": "agent_002",
        "depends_on": ["stage_1"]
      }
    ],
    "dependencies": [
      {
        "from": "stage_1",
        "to": "stage_2",
        "condition": "quality_score >= 60"
      }
    ]
  }
}
```

### 执行工作流

```http
POST /api/workflows/{workflow_id}/execute
```

**请求体**：

```json
{
  "input_data": {
    "source_code": "文件路径或代码内容",
    "analysis_type": "full",
    "output_format": "json"
  },
  "execution_options": {
    "priority": "normal",
    "timeout": 900,
    "notification": true
  }
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "execution_id": "exec_20250920_143015",
    "workflow_id": "workflow_001",
    "status": "started",
    "estimated_duration": "8-12 minutes",
    "started_at": "2025-09-20T14:30:15Z"
  }
}
```

### 查询执行状态

```http
GET /api/workflows/executions/{execution_id}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "execution_id": "exec_20250920_143015",
    "workflow_id": "workflow_001",
    "status": "running",
    "progress": {
      "completed_stages": 2,
      "total_stages": 4,
      "percentage": 50
    },
    "current_stage": {
      "id": "stage_3",
      "name": "性能分析",
      "status": "running",
      "started_at": "2025-09-20T14:35:22Z"
    },
    "stages": [
      {
        "id": "stage_1",
        "name": "代码分析",
        "status": "completed",
        "duration": "3m 45s",
        "result": {
          "quality_score": 85,
          "issues_found": 3
        }
      }
    ],
    "started_at": "2025-09-20T14:30:15Z",
    "estimated_completion": "2025-09-20T14:42:30Z"
  }
}
```

## 📊 系统管理 API

### 获取系统状态

```http
GET /api/system/status
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "system": {
      "version": "1.0.0",
      "uptime": "5d 12h 30m",
      "status": "healthy"
    },
    "statistics": {
      "total_agents": 15,
      "total_workflows": 8,
      "active_executions": 2,
      "completed_executions": 147
    },
    "performance": {
      "cpu_usage": 25.5,
      "memory_usage": 68.2,
      "disk_usage": 15.8
    },
    "services": {
      "claude_api": "connected",
      "file_system": "healthy",
      "cache": "healthy"
    }
  }
}
```

### 获取系统配置

```http
GET /api/config
```

### 健康检查

```http
GET /api/health
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": "ok",
      "ai_service": "ok",
      "file_system": "ok",
      "memory": "ok"
    },
    "timestamp": "2025-09-20T14:30:00Z"
  }
}
```

## 🔍 查询和搜索 API

### 搜索 Agent

```http
GET /api/search/agents?q={query}
```

### 搜索工作流

```http
GET /api/search/workflows?q={query}
```

### 全局搜索

```http
GET /api/search?q={query}&type={type}
```

**查询参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |
| type | string | 否 | 搜索类型：agent, workflow, all |
| limit | integer | 否 | 结果数量限制 |

## 📈 统计和分析 API

### 获取使用统计

```http
GET /api/analytics/usage
```

**查询参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| period | string | 否 | 时间段：day, week, month |
| start_date | string | 否 | 开始日期 |
| end_date | string | 否 | 结束日期 |

### 获取性能指标

```http
GET /api/analytics/performance
```

### 获取错误统计

```http
GET /api/analytics/errors
```

## 📝 日志和审计 API

### 获取执行日志

```http
GET /api/logs/execution/{execution_id}
```

### 获取系统日志

```http
GET /api/logs/system
```

**查询参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| level | string | 否 | 日志级别：debug, info, warn, error |
| start_time | string | 否 | 开始时间 |
| end_time | string | 否 | 结束时间 |
| limit | integer | 否 | 结果数量 |

## 🔒 错误码说明

### HTTP 状态码

| 状态码 | 说明           |
| ------ | -------------- |
| 200    | 请求成功       |
| 201    | 创建成功       |
| 400    | 请求参数错误   |
| 401    | 未授权         |
| 403    | 权限不足       |
| 404    | 资源不存在     |
| 409    | 资源冲突       |
| 500    | 服务器内部错误 |

### 业务错误码

| 错误码                  | 说明          |
| ----------------------- | ------------- |
| AGENT_NOT_FOUND         | Agent 不存在  |
| WORKFLOW_NOT_FOUND      | 工作流不存在  |
| EXECUTION_FAILED        | 执行失败      |
| VALIDATION_ERROR        | 参数验证错误  |
| PERMISSION_DENIED       | 权限不足      |
| RESOURCE_LIMIT_EXCEEDED | 资源限制超出  |
| AI_SERVICE_UNAVAILABLE  | AI 服务不可用 |

## 📚 SDK 和客户端

### JavaScript/Node.js SDK

```bash
npm install @pack-agents/client
```

**使用示例**：

```javascript
import { PackAgentsClient } from '@pack-agents/client';

const client = new PackAgentsClient({
  baseUrl: 'http://localhost:3001/api',
});

// 获取 Agent 列表
const agents = await client.agents.list();

// 创建工作流
const workflow = await client.workflows.create({
  name: 'My Workflow',
  agents: ['agent_001'],
});

// 执行工作流
const execution = await client.workflows.execute(workflow.id, {
  input_data: {
    /* ... */
  },
});
```

### Python SDK

```bash
pip install pack-agents-client
```

**使用示例**：

```python
from pack_agents import PackAgentsClient

client = PackAgentsClient(base_url="http://localhost:3001/api")

# 获取 Agent 列表
agents = client.agents.list()

# 创建并执行工作流
workflow = client.workflows.create(
    name="My Workflow",
    agents=["agent_001"]
)

execution = client.workflows.execute(
    workflow_id=workflow["id"],
    input_data={"source_code": "..."}
)
```

---

**API 文档持续更新中，如有疑问请参考最新版本或联系技术支持。**

_相关文档：[术语表](./glossary.md) | [版本更新记录](./changelog.md)_
