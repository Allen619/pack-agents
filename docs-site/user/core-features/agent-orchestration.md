---
title: 智能体编排
description: 深入了解规划-执行-总结三阶段协作模式，掌握多模型助手协同工作原理
---

# 智能体编排

智能体编排是 Pack Agents 平台的核心功能，通过"规划→执行→总结"的三阶段协作模式，让多个模型助手协同完成复杂任务。这种设计突破了传统工作流的限制，实现了更智能、更灵活的模型助手协作机制。

## 🎯 核心理念

### 什么是智能体编排？

智能体编排是一种**任务驱动的多模型助手协作框架**，它模拟人类团队解决问题的自然方式：

1. **规划阶段**：资深专家（规划模型助手）分析问题，制定执行方案
2. **执行阶段**：多个专业执行者（执行模型助手）并行开展工作
3. **总结阶段**：综合分析专家（总结模型助手）整合结果，形成最终输出

### 与传统工作流的区别

| 特性         | 传统工作流         | 智能体编排         |
| ------------ | ------------------ | ------------------ |
| **设计模式** | 预定义的固定流程   | 动态生成的执行计划 |
| **灵活性**   | 修改需要重新设计   | AI自动调整执行策略 |
| **适应性**   | 难以处理异常情况   | 智能处理异常和重试 |
| **决策方式** | 基于规则的条件判断 | 基于AI的智能决策   |
| **交互性**   | 基本无用户交互     | 支持实时确认和修改 |

## 🏗️ 三阶段详解

### 阶段一：规划（Planning Phase）

#### 规划模型助手的职责

**规划模型助手**是整个编排过程的"大脑"，负责：

1. **需求分析**：深度理解用户的真实意图
2. **任务分解**：将复杂任务拆分为可执行的子任务
3. **资源分配**：根据模型助手的专业能力分配任务
4. **时序规划**：确定任务的执行顺序和依赖关系
5. **风险评估**：识别潜在问题并制定应对策略

#### 规划输出示例

```markdown
## 任务执行计划

### 📋 需求分析

用户要求对电商平台进行全面的性能优化分析，包括代码质量、数据库查询、前端加载速度等多个维度。

### 🎯 执行目标

1. 识别性能瓶颈点
2. 提供具体的优化建议
3. 给出实施优先级排序
4. 估算优化效果

### 👥 任务分配

**并行执行组**：

- **代码质量分析** - 开发助手模型助手
  - 分析代码规范性
  - 检查算法复杂度
  - 识别潜在性能问题

- **数据库分析** - 数据分析师模型助手
  - 分析慢查询日志
  - 检查索引使用情况
  - 评估数据库设计

- **前端性能分析** - 前端专家模型助手
  - 分析资源加载时间
  - 检查缓存策略
  - 评估用户体验指标

### 📅 执行顺序

1. 并行执行以上三个分析任务（预计15分钟）
2. 汇总分析结果
3. 生成综合优化报告（预计5分钟）

### ⚠️ 风险预案

- 如遇到代码访问权限问题，优先进行可公开访问的部分
- 数据库连接异常时，基于日志文件进行分析
- 前端工具无法访问时，提供手动检测指导
```

#### 规划确认机制

**交互式确认**是智能体编排的重要特性：

- **自动倒计时**：60秒倒计时，无操作自动确认
- **用户审核**：可以仔细审查AI生成的计划
- **实时编辑**：支持修改计划内容
- **即时预览**：Markdown格式实时预览修改效果

**为什么需要确认机制？**

1. **质量控制**：确保执行方向符合用户预期
2. **风险管控**：避免AI误解用户意图
3. **资源优化**：防止不必要的资源消耗
4. **用户参与**：保持人在回路中的人机协作

### 阶段二：执行（Execution Phase）

#### 执行通道（Execution Channels）

**执行通道**是每个执行模型助手的独立工作空间：

```
通道 1 (开发助手)    通道 2 (数据分析师)   通道 3 (前端专家)
     │                    │                   │
   任务队列              任务队列             任务队列
     │                    │                   │
   执行引擎              执行引擎             执行引擎
     │                    │                   │
   结果缓存              结果缓存             结果缓存
```

#### 并行执行特性

**1. 真正的并行处理**

- 所有执行模型助手同时开始工作
- 不存在串行等待（除非有逻辑依赖）
- 充分利用系统资源

**2. 独立的执行环境**

- 每个通道有自己的上下文
- 避免模型助手间的相互干扰
- 支持不同的工具权限配置

**3. 实时状态同步**

```typescript
// 执行状态示例
{
  "stage": "execute",
  "channel": 1,
  "agent": "开发助手",
  "status": "running",
  "progress": 65,
  "message": "正在分析代码复杂度...",
  "findings": [
    "发现3个潜在性能问题",
    "识别2个代码异味"
  ]
}
```

#### 错误处理和重试

**智能重试机制**：

1. **自动重试**：网络超时、API限流等临时问题
2. **策略调整**：改变执行方法或工具
3. **降级处理**：降低目标复杂度，确保核心任务完成
4. **人工介入**：复杂问题暂停等待人工决策

### 阶段三：总结（Summary Phase）

#### 总结模型助手的综合分析

**总结模型助手**担任"首席分析师"角色：

1. **结果整合**：汇总所有执行通道的输出
2. **质量评估**：分析各任务的完成质量
3. **一致性检查**：识别不同模型助手结论的冲突
4. **优先级排序**：按重要性和可行性排序建议
5. **实施规划**：提供具体的执行路线图

#### 综合报告示例

```markdown
# 电商平台性能优化综合报告

## 📊 执行概览

- **总执行时间**：18分32秒
- **参与模型助手**：3个（开发助手、数据分析师、前端专家）
- **任务完成度**：100%
- **发现问题**：12个关键问题

## 🔍 详细发现

### 代码层面（开发助手报告）

**高优先级问题**：

1. 循环嵌套过深（3层）→ 时间复杂度O(n³)
2. 数据库查询未使用索引→ 查询时间增加300%
3. 缺乏缓存机制→ 重复计算过多

**建议优化**：

- 重构嵌套循环为扁平结构
- 为关键字段添加复合索引
- 实施Redis缓存策略

### 数据库层面（数据分析师报告）

**关键发现**：

- 慢查询占比15%（主要在订单查询模块）
- 表连接效率低下（缺乏适当的JOIN优化）
- 数据存储碎片化严重

**优化方案**：

- 优化查询语句，减少子查询使用
- 重新设计表结构，合理规范化
- 定期执行数据维护和重建索引

### 前端层面（前端专家报告）

**性能瓶颈**：

- 首屏加载时间4.2秒（目标<2秒）
- 资源文件未压缩，总计传输量2.8MB
- 缺乏有效的缓存策略

**改进措施**：

- 实施代码分割和懒加载
- 压缩图片和静态资源
- 配置CDN和浏览器缓存

## 🎯 优化路线图

### 第一阶段（1-2周）：基础优化

1. 数据库索引优化 - 预期性能提升40%
2. 前端资源压缩 - 加载时间减少50%

### 第二阶段（3-4周）：架构优化

1. 代码重构 - 消除性能瓶颈
2. 缓存系统实施 - 响应速度提升60%

### 第三阶段（5-6周）：深度优化

1. 架构升级 - 微服务化改造
2. 性能监控体系建立

## 📈 预期效果

- **整体性能提升**：65-80%
- **用户体验改善**：加载时间减少70%
- **服务器成本降低**：30-40%
```

## ⚙️ 高级特性

### 影子模式（Shadow Mode）

#### 什么是影子模式？

**影子模式**是一种A/B测试机制，用于安全地验证新的调度内核：

```
用户请求
    │
    ├─► 主调度内核（实际执行）
    │   └─► 返回结果给用户
    │
    └─► 影子调度内核（并行执行，仅记录）
        └─► 记录执行结果用于对比分析
```

#### 影子模式的价值

1. **零风险验证**：新系统在后台运行，不影响用户
2. **效果对比**：客观比较新旧系统的性能
3. **渐进切换**：确信新系统稳定后再切换
4. **回滚保障**：发现问题可立即回滚

#### 对比指标

```typescript
interface ComparisonMetrics {
  executionTime: {
    primary: number; // 主调度耗时
    shadow: number; // 影子调度耗时
    improvement: number; // 性能提升百分比
  };

  resourceUsage: {
    cpu: number[]; // CPU使用率对比
    memory: number[]; // 内存使用对比
    apiCalls: number[]; // API调用次数对比
  };

  quality: {
    accuracy: number; // 结果准确性
    completeness: number; // 结果完整性
    userSatisfaction: number; // 用户满意度
  };
}
```

### 新调度内核

#### 智能负载均衡

**传统调度**：简单的轮询或随机分配
**智能调度**：基于多维度评估的动态分配

```python
def calculate_agent_score(agent, task):
    """计算模型助手对任务的适配度分数"""

    # 专业能力匹配度 (40%)
    expertise_score = match_expertise(agent.skills, task.requirements)

    # 当前工作负载 (25%)
    load_score = 1.0 - (agent.current_load / agent.max_capacity)

    # 历史成功率 (20%)
    success_score = agent.historical_success_rate

    # 响应速度 (15%)
    speed_score = agent.average_response_time

    return (expertise_score * 0.4 +
            load_score * 0.25 +
            success_score * 0.2 +
            speed_score * 0.15)
```

#### 动态资源优化

**资源感知调度**：

- **CPU密集型任务**→ 分配给计算能力强的模型助手
- **I/O密集型任务**→ 分配给网络优化好的模型助手
- **内存密集型任务**→ 分配给内存充足的模型助手
- **实时性要求高**→ 分配给响应快的模型助手

#### 自适应容错

**多层容错机制**：

1. **预测性容错**：基于历史数据预测可能的失败
2. **实时监控**：异常情况立即检测和处理
3. **自动恢复**：无需人工干预的故障恢复
4. **学习优化**：从失败中学习，改进调度策略

### 任务类型白名单

#### 精细化控制

**白名单机制**允许精确控制新调度内核的应用范围：

```typescript
interface TaskTypeAllowlist {
  plan: boolean; // 规划阶段是否使用新内核
  execute: boolean; // 执行阶段是否使用新内核
  summarize: boolean; // 总结阶段是否使用新内核
}

// 示例配置
const config: TaskTypeAllowlist = {
  plan: true, // 规划阶段启用新内核（AI推理密集）
  execute: false, // 执行阶段使用传统内核（稳定为主）
  summarize: true, // 总结阶段启用新内核（文本处理密集）
};
```

#### 渐进式部署策略

**阶段1**：仅在规划阶段启用新内核
**阶段2**：增加总结阶段
**阶段3**：全面启用新调度内核
**阶段4**：关闭影子模式，完全切换

## 🎛️ 操作界面详解

### 启动配置面板

#### 基础配置

```
任务描述：[必填] 详细描述要完成的任务

规划模型助手：[下拉选择] 选择负责规划的模型助手
执行模型助手：[多选] 选择参与执行的多个模型助手
总结模型助手：[下拉选择] 选择负责总结的模型助手
```

#### 高级开关

**启用新调度**：

- **关闭**：仅使用传统调度内核
- **开启**：根据白名单配置启用新调度内核
- **影子模式**：新内核并行运行但不影响实际执行

**任务类型白名单**：

- ☑️ 规划（Plan）
- ☐ 执行（Execute）
- ☑️ 总结（Summarize）

### 实时输出界面

#### 执行状态展示

```
[14:30:15] [规划]（代码架构师）
正在分析任务需求...

[14:30:45] [规划]（代码架构师）
已生成执行计划，等待用户确认...

[14:31:20] [执行]（通道1 · 开发助手）
开始代码质量分析...

[14:31:21] [执行]（通道2 · 数据分析师）
开始数据库性能分析...

[14:31:22] [执行]（通道3 · 前端专家）
开始前端性能分析...

[14:33:15] [总结]（技术总监）
正在整合分析结果...

[14:34:30] [结果]
任务完成，生成综合报告
```

#### 交互式确认区域

当规划完成时，界面会显示确认区域：

```html
<div class="plan-confirmation">
  <h3>📋 规划已生成，请确认</h3>

  <div class="plan-content">
    <!-- 显示AI生成的计划内容 -->
  </div>

  <div class="countdown">⏰ 倒计时：<span id="timer">45</span>秒</div>

  <div class="actions">
    <button onclick="editPlan()">✏️ 修改计划</button>
    <button onclick="confirmPlan()" class="primary">✅ 确认执行</button>
  </div>
</div>
```

### 历史记录管理

#### 执行历史列表

| 运行ID  | 用户问题         | 状态   | 开始时间 | 结束时间 | 操作      |
| ------- | ---------------- | ------ | -------- | -------- | --------- |
| run_001 | 电商平台性能优化 | 已完成 | 14:30:15 | 14:49:02 | 查看 删除 |
| run_002 | 代码安全性审查   | 已完成 | 10:15:30 | 10:28:45 | 查看 删除 |
| run_003 | 文档完整性检查   | 失败   | 09:45:20 | -        | 查看 删除 |

#### 详细执行报告

点击"查看"按钮可查看完整的执行报告，包括：

- **基本信息**：执行时间、参与模型助手、总体状态
- **规划内容**：AI生成的详细执行计划
- **执行过程**：每个模型助手的执行日志和输出
- **总结报告**：最终生成的综合分析报告

## 🚀 最佳实践

### 任务设计原则

#### 1. 明确具体

**好的任务描述**：

```
对我的Node.js电商后端项目进行性能分析，重点关注API响应时间、数据库查询效率和内存使用情况。项目位于./src目录，使用Express框架和MongoDB数据库。
```

**不好的任务描述**：

```
优化我的代码
```

#### 2. 合理分解

避免过于庞大复杂的任务，适当拆分：

**原始任务**：

```
全面分析我的整个技术栈并提供优化建议
```

**拆分后**：

```
1. 分析后端API性能瓶颈
2. 评估数据库查询效率
3. 检查前端资源加载速度
4. 评估系统架构可扩展性
```

#### 3. 提供上下文

为模型助手提供充分的背景信息：

- 项目类型和技术栈
- 具体的性能要求或目标
- 已知的限制条件
- 期望的输出格式

### 模型助手选择策略

#### 规划模型助手选择

**理想的规划模型助手特征**：

- 具备丰富的项目管理经验
- 善于任务分解和时间规划
- 有较强的逻辑思维能力
- 能够预见潜在风险

**推荐角色**：

- 技术架构师
- 项目经理
- 系统分析师

#### 执行模型助手选择

**专业匹配原则**：

- 代码分析 → 开发助手、代码审查员
- 数据处理 → 数据分析师、数据科学家
- 安全检查 → 安全审核员、渗透测试专家
- 性能优化 → 性能工程师、系统管理员
- 文档生成 → 技术写作者、文档工程师

#### 总结模型助手选择

**总结模型助手要求**：

- 具备全局视野和综合分析能力
- 善于信息整合和归纳总结
- 有较强的表达和写作能力
- 能够提出有价值的见解和建议

**推荐角色**：

- 技术总监
- 首席架构师
- 资深顾问

### 使用技巧

#### 1. 充分利用规划确认

- **仔细审查**：花时间检查AI生成的计划
- **及时调整**：发现问题立即修改
- **补充信息**：添加AI可能遗漏的重要细节

#### 2. 监控执行过程

- **实时关注**：留意执行日志中的异常信息
- **适时干预**：发现方向错误可及时终止
- **记录经验**：总结成功和失败的案例

#### 3. 重视总结结果

- **完整阅读**：仔细查看最终报告
- **验证建议**：评估建议的可行性和价值
- **制定行动计划**：将建议转化为具体的实施步骤

## 🔮 进阶应用

### 复杂场景编排

#### 多轮协作

对于特别复杂的任务，可以设计多轮编排：

```
第一轮：基础分析 → 生成初步报告
第二轮：深度分析 → 针对重点问题深入研究
第三轮：方案设计 → 制定具体的解决方案
```

#### 动态调整策略

根据执行结果动态调整后续策略：

```python
def adjust_strategy(execution_results):
    """基于执行结果动态调整策略"""

    if execution_results.quality_score < 0.7:
        # 质量不达标，增加审查环节
        return add_review_step()

    if execution_results.has_security_issues:
        # 发现安全问题，优先处理
        return prioritize_security()

    if execution_results.performance_severe:
        # 性能问题严重，增加优化力度
        return intensify_optimization()
```

### 与其他功能集成

#### 模型助手工厂联动

- 智能体编排中发现能力不足时，可触发模型助手工厂创建专门的模型助手
- 编排成功的模型助手组合可以保存为模板供后续使用

#### 知识库协同

- 执行模型助手可访问项目知识库获取上下文信息
- 编排结果和经验可以沉淀到知识库中供未来参考

## 💾 编排配置保存

### 编排模板管理

#### 创建编排配置

智能体编排支持将成功的编排配置保存为模板，便于后续复用：

```typescript
interface OrchestrationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;

  // 核心配置
  configuration: {
    planningAgent: {
      agentId: string;
      systemPrompt?: string;
      timeout: number;
    };
    executionAgents: Array<{
      agentId: string;
      specialty: string;
      tools: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
    summaryAgent: {
      agentId: string;
      systemPrompt?: string;
      consolidationStrategy: 'merge' | 'prioritize' | 'vote';
    };
  };

  // 高级设置
  advancedSettings: {
    executionMode: 'sequential' | 'parallel' | 'adaptive';
    shadowMode: boolean;
    taskTypeAllowlist: TaskTypeAllowlist;
    retryPolicy: RetryPolicy;
    notificationSettings: NotificationSettings;
  };

  // 元数据
  metadata: {
    createdBy: string;
    createdAt: string;
    usage: {
      totalExecutions: number;
      successRate: number;
      averageDuration: number;
    };
    tags: string[];
    version: string;
  };
}
```

#### 保存编排配置

在执行完成后，系统会提示用户保存当前的编排配置：

```html
<div class="save-template-dialog">
  <h3>💾 保存编排模板</h3>

  <div class="template-info">
    <label>模板名称：</label>
    <input type="text" placeholder="例如：代码性能分析模板" />

    <label>描述：</label>
    <textarea placeholder="描述该模板的适用场景和特点..."></textarea>

    <label>分类：</label>
    <select>
      <option>代码分析</option>
      <option>性能优化</option>
      <option>安全审查</option>
      <option>文档生成</option>
      <option>数据处理</option>
      <option>自定义</option>
    </select>

    <label>标签：</label>
    <input type="text" placeholder="用逗号分隔，如：性能,优化,分析" />
  </div>

  <div class="template-preview">
    <h4>配置预览</h4>
    <ul>
      <li>规划助手：{{selectedPlanningAgent}}</li>
      <li>执行助手：{{executionAgents.length}} 个</li>
      <li>总结助手：{{selectedSummaryAgent}}</li>
      <li>执行模式：{{executionMode}}</li>
    </ul>
  </div>

  <div class="actions">
    <button onclick="saveAsDraft()">保存为草稿</button>
    <button onclick="saveAsTemplate()" class="primary">保存模板</button>
  </div>
</div>
```

#### 模板库管理

```typescript
interface TemplateLibrary {
  // 模板分类
  categories: {
    'development': DevelopmentTemplate[];
    'analysis': AnalysisTemplate[];
    'optimization': OptimizationTemplate[];
    'security': SecurityTemplate[];
    'documentation': DocumentationTemplate[];
  };

  // 模板操作
  operations: {
    saveTemplate: (template: OrchestrationTemplate) => Promise<void>;
    loadTemplate: (templateId: string) => Promise<OrchestrationTemplate>;
    deleteTemplate: (templateId: string) => Promise<void>;
    updateTemplate: (templateId: string, updates: Partial<OrchestrationTemplate>) => Promise<void>;
    duplicateTemplate: (templateId: string, newName: string) => Promise<OrchestrationTemplate>;
  };

  // 模板搜索和推荐
  search: {
    searchTemplates: (query: string, filters: TemplateFilters) => Promise<OrchestrationTemplate[]>;
    recommendTemplates: (taskDescription: string) => Promise<OrchestrationTemplate[]>;
    getPopularTemplates: () => Promise<OrchestrationTemplate[]>;
    getRecentTemplates: () => Promise<OrchestrationTemplate[]>;
  };
}
```

### 快速应用模板

用户可以通过以下方式快速应用保存的模板：

1. **模板库浏览**：在编排启动页面浏览可用的模板
2. **智能推荐**：基于任务描述自动推荐合适的模板
3. **一键应用**：选择模板后一键填充配置
4. **参数调整**：应用后仍可调整具体参数

```typescript
interface TemplateApplication {
  // 应用流程
  applyTemplate: {
    selectTemplate: (templateId: string) => Promise<void>;
    previewConfiguration: (template: OrchestrationTemplate) => void;
    customizeParameters: (template: OrchestrationTemplate) => OrchestrationTemplate;
    executeWithTemplate: (template: OrchestrationTemplate, task: string) => Promise<string>;
  };

  // 参数自定义
  customization: {
    modifyAgents: boolean;        // 是否允许修改模型助手
    modifySettings: boolean;      // 是否允许修改设置
    modifyPrompts: boolean;       // 是否允许修改提示词
    preserveCore: boolean;        // 是否保持核心配置
  };
}
```

## 🌐 API 服务接口

### RESTful API 设计

智能体编排提供完整的 RESTful API，支持外部系统集成和程序化调用。

#### 核心API端点

```typescript
// 编排配置API
POST   /api/v1/orchestration/configurations        // 创建编排配置
GET    /api/v1/orchestration/configurations        // 获取配置列表
GET    /api/v1/orchestration/configurations/:id    // 获取特定配置
PUT    /api/v1/orchestration/configurations/:id    // 更新配置
DELETE /api/v1/orchestration/configurations/:id    // 删除配置

// 编排执行API
POST   /api/v1/orchestration/executions           // 启动编排执行
GET    /api/v1/orchestration/executions           // 获取执行列表
GET    /api/v1/orchestration/executions/:id       // 获取执行详情
PUT    /api/v1/orchestration/executions/:id/pause // 暂停执行
PUT    /api/v1/orchestration/executions/:id/resume // 恢复执行
PUT    /api/v1/orchestration/executions/:id/stop  // 停止执行

// 模板管理API
POST   /api/v1/orchestration/templates            // 保存模板
GET    /api/v1/orchestration/templates            // 获取模板列表
GET    /api/v1/orchestration/templates/:id        // 获取模板详情
PUT    /api/v1/orchestration/templates/:id        // 更新模板
DELETE /api/v1/orchestration/templates/:id        // 删除模板
```

#### API 请求示例

##### 1. 创建并启动编排

```bash
curl -X POST "https://api.packagents.com/v1/orchestration/executions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "task": "对我的Node.js电商后端进行性能分析",
    "configuration": {
      "planningAgent": {
        "agentId": "architect-001",
        "timeout": 300000
      },
      "executionAgents": [
        {
          "agentId": "developer-001",
          "specialty": "code_analysis"
        },
        {
          "agentId": "analyst-001",
          "specialty": "database_analysis"
        },
        {
          "agentId": "frontend-001",
          "specialty": "performance_analysis"
        }
      ],
      "summaryAgent": {
        "agentId": "manager-001",
        "consolidationStrategy": "merge"
      }
    },
    "options": {
      "priority": "high",
      "requireConfirmation": false,
      "shadowMode": false
    }
  }'
```

##### 2. 查询执行状态

```bash
curl -X GET "https://api.packagents.com/v1/orchestration/executions/exec_123456" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

响应示例：
```json
{
  "success": true,
  "data": {
    "executionId": "exec_123456",
    "status": "running",
    "stage": "execution",
    "progress": 65,
    "startTime": "2025-01-12T14:30:15Z",
    "estimatedCompletion": "2025-01-12T14:48:30Z",
    "agents": [
      {
        "agentId": "developer-001",
        "status": "completed",
        "progress": 100,
        "result": "发现3个性能瓶颈..."
      },
      {
        "agentId": "analyst-001",
        "status": "running",
        "progress": 80,
        "currentTask": "分析数据库索引使用情况"
      },
      {
        "agentId": "frontend-001",
        "status": "pending",
        "progress": 0
      }
    ],
    "metrics": {
      "tokensUsed": 15420,
      "estimatedCost": 2.35,
      "elapsedTime": 1025
    }
  }
}
```

##### 3. 保存模板

```bash
curl -X POST "https://api.packagents.com/v1/orchestration/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "电商性能分析模板",
    "description": "适用于电商后端性能分析的智能体编排模板",
    "category": "performance_analysis",
    "configuration": {
      "planningAgent": {
        "agentId": "architect-001"
      },
      "executionAgents": [
        {
          "agentId": "developer-001",
          "specialty": "code_analysis"
        },
        {
          "agentId": "analyst-001",
          "specialty": "database_analysis"
        },
        {
          "agentId": "frontend-001",
          "specialty": "performance_analysis"
        }
      ],
      "summaryAgent": {
        "agentId": "manager-001"
      }
    },
    "metadata": {
      "tags": ["电商", "性能", "分析"],
      "public": true
    }
  }'
```

### WebSocket 实时通信

对于需要实时监控的场景，提供 WebSocket 接口：

```typescript
// 连接WebSocket
const ws = new WebSocket('wss://api.packagents.com/v1/orchestration/executions/exec_123456/stream');

// 监听实时事件
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'agent_message':
      console.log(`[${data.agentId}] ${data.message}`);
      break;

    case 'task_progress':
      console.log(`任务进度: ${data.progress}%`);
      break;

    case 'execution_complete':
      console.log('执行完成:', data.result);
      break;

    case 'execution_error':
      console.error('执行错误:', data.error);
      break;
  }
};
```

### SDK 集成

提供多种语言的 SDK，简化集成工作：

#### JavaScript/TypeScript SDK

```typescript
import { PackAgentsOrchestration } from '@packagents/orchestration-sdk';

const client = new PackAgentsOrchestration({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.packagents.com'
});

// 启动编排
const execution = await client.executions.create({
  task: '分析代码性能',
  configuration: {
    planningAgent: { agentId: 'architect-001' },
    executionAgents: [
      { agentId: 'developer-001', specialty: 'code_analysis' }
    ],
    summaryAgent: { agentId: 'manager-001' }
  }
});

// 监听进度
execution.on('progress', (progress) => {
  console.log(`进度: ${progress.percentage}%`);
});

// 获取结果
const result = await execution.waitForCompletion();
console.log('结果:', result.summary);
```

#### Python SDK

```python
from packagents import OrchestrationClient

client = OrchestrationClient(api_key='YOUR_API_KEY')

# 启动编排
execution = client.executions.create(
    task='分析代码性能',
    configuration={
        'planning_agent': {'agent_id': 'architect-001'},
        'execution_agents': [
            {'agent_id': 'developer-001', 'specialty': 'code_analysis'}
        ],
        'summary_agent': {'agent_id': 'manager-001'}
    }
)

# 等待完成
result = execution.wait_for_completion()
print('结果:', result.summary)
```

### 集成场景示例

#### 1. CI/CD 集成

```yaml
# .github/workflows/code-analysis.yml
name: Code Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run PackAgents Analysis
        run: |
          curl -X POST "${{ secrets.PACKAGENTS_API_URL }}/orchestration/executions" \
            -H "Authorization: Bearer ${{ secrets.PACKAGENTS_API_KEY }}" \
            -d '{
              "task": "分析代码质量，重点关注性能优化建议",
              "configuration": {
                "planningAgent": {"agentId": "architect-001"},
                "executionAgents": [
                  {"agentId": "developer-001", "specialty": "code_analysis"}
                ],
                "summaryAgent": {"agentId": "manager-001"}
              }
            }'
```

#### 2. 企业系统集成

```typescript
// 企业ERP系统集成示例
class ERPIntegration {
  async analyzeProjectPerformance(projectId: string) {
    // 从ERP获取项目信息
    const project = await this.erpService.getProject(projectId);

    // 启动智能体分析
    const analysis = await this.packAgentsClient.executions.create({
      task: `分析项目 ${project.name} 的性能瓶颈`,
      configuration: {
        planningAgent: { agentId: 'architect-001' },
        executionAgents: [
          { agentId: 'developer-001', specialty: 'code_analysis' },
          { agentId: 'analyst-001', specialty: 'database_analysis' }
        ],
        summaryAgent: { agentId: 'manager-001' }
      }
    });

    // 等待分析完成
    const result = await analysis.waitForCompletion();

    // 将分析结果保存到ERP
    await this.erpService.saveAnalysisReport(projectId, {
      summary: result.summary,
      recommendations: result.recommendations,
      metrics: result.metrics,
      analyzedAt: new Date().toISOString()
    });

    return result;
  }
}
```

#### API集成

- 通过API可以程序化地启动编排任务
- 编排结果可以通过API集成到其他系统中
- 支持完整的配置管理和模板操作
- 提供实时监控和状态查询能力
- 多语言SDK简化集成工作

---

**掌握智能体编排，您就能够构建真正智能的多模型助手协作系统！**

_下一步：[探索实用案例](./use-cases.md)_
