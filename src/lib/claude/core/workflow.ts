import { ClaudeAgent, ClaudeAgentConfig } from './agent';
import { query } from '@anthropic-ai/claude-code';
import { generateId } from '@/lib/utils';
import {
  getSessionStore,
  getExecutionStore,
} from '../../storage/session-store';

export interface ClaudeWorkflowConfig {
  id: string;
  name: string;
  description: string;

  // 主要Agent（负责整体规划和协调）
  mainAgent: {
    agentId: string;
    role: 'coordinator';
  };

  // 专业Agent团队
  specialists: Array<{
    agentId: string;
    role: 'specialist';
    specialty: string; // 'code-analysis' | 'code-generation' | 'testing' | 'documentation'
  }>;

  // 工作流模式
  mode: 'sequential' | 'parallel' | 'adaptive';

  // Claude Code 执行配置
  execution: {
    sharedContext: boolean; // 是否共享上下文
    crossSessionSharing: boolean; // 是否跨会话共享
    resultSynthesis: boolean; // 是否需要结果综合
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

export interface WorkflowRequest {
  description: string;
  input?: any;
  requirements?: string[];
  priority?: 'low' | 'normal' | 'high';
  requireConfirmation?: boolean;
  timeout?: number;
}

export interface ExecutionPlan {
  id: string;
  tasks: ExecutionTask[];
  dependencies: TaskDependency[];
  estimatedDuration: number;
  successCriteria: string[];
  metadata: {
    createdAt: string;
    createdBy: string;
  };
}

export interface ExecutionTask {
  id: string;
  name: string;
  description: string;
  agentId: string;
  taskType: 'main_planning' | 'sub_execution' | 'synthesis';
  inputs: any;
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  deliverables: string[];
  timeout: number;
}

export interface TaskDependency {
  fromTask: string;
  toTask: string;
  condition?: string;
  required: boolean;
}

export interface WorkflowResult {
  success: boolean;
  executionId: string;
  plan?: ExecutionPlan;
  results?: WorkflowResults;
  metadata?: {
    executionTime: number;
    tokensUsed: number;
    agentsUsed: string[];
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface WorkflowResults {
  [taskId: string]: TaskResult;
}

export interface TaskResult {
  success: boolean;
  output?: any;
  artifacts?: any[];
  metadata?: {
    executionTime: number;
    tokensUsed: number;
    toolsUsed: string[];
  };
  error?: {
    message: string;
    code: string;
  };
  skipped?: boolean;
  reason?: string;
}

export type WorkflowContext = Map<string, any>;
export type SharedContext = Map<string, any>;

/**
 * Claude 工作流执行引擎 - 基于 Claude Code SDK 的多Agent协作
 */
export class ClaudeWorkflowEngine {
  private config: ClaudeWorkflowConfig;
  private agents: Map<string, ClaudeAgent> = new Map();
  private sharedContext: SharedContext = new Map();
  private executionStore = getExecutionStore();

  constructor(config: ClaudeWorkflowConfig) {
    this.config = config;
    this.loadAgents();
  }

  /**
   * 主要执行方法
   */
  async execute(request: WorkflowRequest): Promise<WorkflowResult> {
    const executionId = generateId();
    const startTime = Date.now();

    try {
      // 1. 主Agent制定执行计划
      const plan = await this.createExecutionPlan(request);

      // 2. 用户确认计划（可选）
      if (request.requireConfirmation) {
        await this.presentPlanForConfirmation(plan);
      }

      // 3. 执行计划
      const results = await this.executePlan(plan, executionId);

      // 4. 结果综合（如果需要）
      const finalResult = this.config.execution.resultSynthesis
        ? await this.synthesizeResults(results, executionId)
        : results;

      const workflowResult: WorkflowResult = {
        success: true,
        executionId,
        plan,
        results: finalResult,
        metadata: {
          executionTime: Date.now() - startTime,
          tokensUsed: this.calculateTotalTokens(results),
          agentsUsed: Object.keys(results),
        },
      };

      // 保存执行记录
      await this.saveExecutionRecord(executionId, workflowResult);

      return workflowResult;
    } catch (error: any) {
      const workflowResult: WorkflowResult = {
        success: false,
        executionId,
        error: {
          message: error.message,
          code: 'WORKFLOW_EXECUTION_ERROR',
          details: error,
        },
      };

      await this.saveExecutionRecord(executionId, workflowResult);
      return workflowResult;
    }
  }

  /**
   * 使用主Agent制定执行计划
   */
  private async createExecutionPlan(
    request: WorkflowRequest
  ): Promise<ExecutionPlan> {
    const mainAgent = this.agents.get(this.config.mainAgent.agentId);
    if (!mainAgent) {
      throw new Error('Main agent not found');
    }

    // 使用 Claude Code SDK 制定详细执行计划
    const planningPrompt = this.buildPlanningPrompt(request);
    const planResult = await mainAgent.execute(planningPrompt);

    if (!planResult.success) {
      throw new Error(`Planning failed: ${planResult.error?.message}`);
    }

    return this.parsePlanFromResult(planResult.results || []);
  }

  /**
   * 构建规划提示词
   */
  private buildPlanningPrompt(request: WorkflowRequest): string {
    return `
作为项目协调者，请为以下请求制定详细的执行计划：

请求描述: ${request.description}
可用专家: ${this.config.specialists.map((s) => `${s.specialty} (${s.agentId})`).join(', ')}
执行模式: ${this.config.mode}
优先级: ${request.priority || 'normal'}

请生成一个包含以下信息的JSON格式执行计划：
1. 任务分解和优先级
2. 专家分工安排
3. 依赖关系和执行顺序
4. 预期产出和验收标准

计划格式要求：
{
  "tasks": [
    {
      "id": "task-1",
      "name": "任务名称", 
      "description": "详细描述",
      "agentId": "负责的专家ID",
      "dependencies": ["前置任务ID"],
      "priority": "high|medium|low",
      "estimatedDuration": "预估时间",
      "deliverables": ["交付物列表"]
    }
  ],
  "execution_order": "执行顺序说明",
  "success_criteria": "成功标准"
}

请确保计划合理、可执行，且充分利用各专家的能力。
`;
  }

  /**
   * 解析执行计划
   */
  private parsePlanFromResult(results: any[]): ExecutionPlan {
    try {
      // 尝试从结果中提取JSON格式的执行计划
      const planText = results.join(' ');
      const jsonMatch = planText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[0]);

        return {
          id: generateId(),
          tasks: planData.tasks.map((task: any) => ({
            ...task,
            timeout: 300000, // 默认5分钟超时
            taskType: this.determineTaskType(task.agentId),
          })),
          dependencies: this.buildDependencies(planData.tasks),
          estimatedDuration: this.calculateEstimatedDuration(planData.tasks),
          successCriteria: planData.success_criteria
            ? [planData.success_criteria]
            : [],
          metadata: {
            createdAt: new Date().toISOString(),
            createdBy: this.config.mainAgent.agentId,
          },
        };
      }
    } catch (error) {
      console.error('Failed to parse execution plan:', error);
    }

    // 如果解析失败，创建默认计划
    return this.createDefaultPlan();
  }

  /**
   * 创建默认执行计划
   */
  private createDefaultPlan(): ExecutionPlan {
    const tasks: ExecutionTask[] = this.config.specialists.map(
      (specialist, index) => ({
        id: `task-${index + 1}`,
        name: `${specialist.specialty} 任务`,
        description: `执行 ${specialist.specialty} 相关工作`,
        agentId: specialist.agentId,
        taskType: 'sub_execution',
        inputs: {},
        dependencies: index > 0 ? [`task-${index}`] : [],
        priority: 'medium',
        estimatedDuration: '30分钟',
        deliverables: [`${specialist.specialty} 结果`],
        timeout: 1800000, // 30分钟
      })
    );

    return {
      id: generateId(),
      tasks,
      dependencies: this.buildDependencies(tasks),
      estimatedDuration: tasks.length * 30 * 60 * 1000, // 30分钟 * 任务数
      successCriteria: ['所有任务成功完成'],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: this.config.mainAgent.agentId,
      },
    };
  }

  /**
   * 确定任务类型
   */
  private determineTaskType(
    agentId: string
  ): 'main_planning' | 'sub_execution' | 'synthesis' {
    if (agentId === this.config.mainAgent.agentId) {
      return 'main_planning';
    }

    const specialist = this.config.specialists.find(
      (s) => s.agentId === agentId
    );
    if (specialist?.specialty === 'synthesis') {
      return 'synthesis';
    }

    return 'sub_execution';
  }

  /**
   * 构建任务依赖关系
   */
  private buildDependencies(tasks: any[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    tasks.forEach((task) => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach((depId: string) => {
          dependencies.push({
            fromTask: depId,
            toTask: task.id,
            required: true,
          });
        });
      }
    });

    return dependencies;
  }

  /**
   * 计算预估执行时间
   */
  private calculateEstimatedDuration(tasks: any[]): number {
    // 简单计算：串行执行总时间
    return tasks.reduce((total, task) => {
      const duration = this.parseDuration(task.estimatedDuration || '30分钟');
      return total + duration;
    }, 0);
  }

  /**
   * 解析时间字符串为毫秒
   */
  private parseDuration(durationStr: string): number {
    const match = durationStr.match(/(\d+)\s*(分钟|小时|秒)/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case '秒':
          return value * 1000;
        case '分钟':
          return value * 60 * 1000;
        case '小时':
          return value * 60 * 60 * 1000;
        default:
          return 30 * 60 * 1000; // 默认30分钟
      }
    }
    return 30 * 60 * 1000; // 默认30分钟
  }

  /**
   * 执行计划
   */
  private async executePlan(
    plan: ExecutionPlan,
    executionId: string
  ): Promise<WorkflowResults> {
    switch (this.config.mode) {
      case 'sequential':
        return await this.executeSequential(plan, executionId);
      case 'parallel':
        return await this.executeParallel(plan, executionId);
      case 'adaptive':
        return await this.executeAdaptive(plan, executionId);
      default:
        throw new Error(`Unsupported execution mode: ${this.config.mode}`);
    }
  }

  /**
   * 串行执行
   */
  private async executeSequential(
    plan: ExecutionPlan,
    executionId: string
  ): Promise<WorkflowResults> {
    const results: WorkflowResults = {};

    for (const task of plan.tasks) {
      const agent = this.agents.get(task.agentId);
      if (!agent) {
        throw new Error(`Agent ${task.agentId} not found`);
      }

      // 构建包含共享上下文的提示
      const contextualPrompt = this.buildContextualPrompt(task, results);

      // 执行任务，启用流式模式获取实时反馈
      const taskResult = await agent.execute(contextualPrompt, {
        onProgress: (progress) => {
          this.emitProgress(executionId, task.id, progress);
        },
        timeout: task.timeout,
      });

      results[task.id] = {
        success: taskResult.success,
        output: taskResult.results,
        metadata: taskResult.metadata,
        error: taskResult.error,
      };

      // 更新共享上下文
      if (this.config.execution.sharedContext) {
        this.updateSharedContext(task.id, results[task.id]);
      }

      // 发送任务完成事件
      this.emitTaskComplete(executionId, task.id, results[task.id]);

      // 如果任务失败，根据配置决定是否继续
      if (!taskResult.success) {
        console.error(`Task ${task.id} failed:`, taskResult.error);
        // 可以添加错误处理策略
      }
    }

    return results;
  }

  /**
   * 并行执行
   */
  private async executeParallel(
    plan: ExecutionPlan,
    executionId: string
  ): Promise<WorkflowResults> {
    const taskPromises = plan.tasks.map(async (task) => {
      const agent = this.agents.get(task.agentId);
      if (!agent) {
        throw new Error(`Agent ${task.agentId} not found`);
      }

      const contextualPrompt = this.buildContextualPrompt(task, {});
      const taskResult = await agent.execute(contextualPrompt, {
        timeout: task.timeout,
      });

      return {
        taskId: task.id,
        result: {
          success: taskResult.success,
          output: taskResult.results,
          metadata: taskResult.metadata,
          error: taskResult.error,
        },
      };
    });

    const taskResults = await Promise.allSettled(taskPromises);
    const results: WorkflowResults = {};

    taskResults.forEach((result, index) => {
      const task = plan.tasks[index];
      if (result.status === 'fulfilled') {
        results[task.id] = result.value.result;
      } else {
        results[task.id] = {
          success: false,
          error: {
            message: result.reason.message,
            code: 'TASK_EXECUTION_ERROR',
          },
        };
      }
    });

    return results;
  }

  /**
   * 自适应执行（基于主Agent的动态决策）
   */
  private async executeAdaptive(
    plan: ExecutionPlan,
    executionId: string
  ): Promise<WorkflowResults> {
    const results: WorkflowResults = {};
    const mainAgent = this.agents.get(this.config.mainAgent.agentId);

    if (!mainAgent) {
      throw new Error('Main agent not found for adaptive execution');
    }

    for (const task of plan.tasks) {
      // 主Agent决定下一步行动
      const decisionPrompt = this.buildDecisionPrompt(task, results);
      const decision = await mainAgent.execute(decisionPrompt);

      // 根据决策执行
      if (this.shouldExecuteTask(decision)) {
        const agent = this.agents.get(task.agentId);
        if (!agent) {
          throw new Error(`Agent ${task.agentId} not found`);
        }

        const taskResult = await agent.execute(task.description);
        results[task.id] = {
          success: taskResult.success,
          output: taskResult.results,
          metadata: taskResult.metadata,
          error: taskResult.error,
        };

        // 实时反馈给主Agent
        this.updateSharedContext(task.id, results[task.id]);
      } else {
        // 跳过或修改任务
        results[task.id] = {
          success: true,
          skipped: true,
          reason: this.extractDecisionReason(decision),
        };
      }
    }

    return results;
  }

  /**
   * 构建上下文化的提示词
   */
  private buildContextualPrompt(
    task: ExecutionTask,
    previousResults: WorkflowResults
  ): string {
    let prompt = `任务：${task.name}\n描述：${task.description}\n`;

    // 添加输入信息
    if (task.inputs && Object.keys(task.inputs).length > 0) {
      prompt += `\n输入信息：\n${JSON.stringify(task.inputs, null, 2)}\n`;
    }

    // 添加前置任务结果
    if (task.dependencies.length > 0) {
      prompt += `\n前置任务结果：\n`;
      task.dependencies.forEach((depId) => {
        const depResult = previousResults[depId];
        if (depResult) {
          prompt += `- ${depId}: ${JSON.stringify(depResult.output, null, 2)}\n`;
        }
      });
    }

    // 添加共享上下文
    if (this.config.execution.sharedContext && this.sharedContext.size > 0) {
      prompt += `\n共享上下文：\n`;
      for (const [key, value] of this.sharedContext) {
        prompt += `- ${key}: ${JSON.stringify(value, null, 2)}\n`;
      }
    }

    prompt += `\n请根据以上信息完成任务，并提供详细的结果。`;

    return prompt;
  }

  /**
   * 构建决策提示词
   */
  private buildDecisionPrompt(
    task: ExecutionTask,
    currentResults: WorkflowResults
  ): string {
    return `
作为工作流协调者，请决定是否执行以下任务：

任务信息：
- ID: ${task.id}
- 名称: ${task.name}
- 描述: ${task.description}
- 负责Agent: ${task.agentId}

当前执行情况：
${Object.entries(currentResults)
  .map(([id, result]) => `- ${id}: ${result.success ? '成功' : '失败'}`)
  .join('\n')}

请回答：
1. 是否应该执行此任务？（是/否）
2. 理由是什么？
3. 是否需要修改任务参数？

请以JSON格式回答：
{
  "shouldExecute": true/false,
  "reason": "决策理由",
  "modifications": {}
}
`;
  }

  /**
   * 判断是否应该执行任务
   */
  private shouldExecuteTask(decision: any): boolean {
    try {
      const decisionText = Array.isArray(decision.results)
        ? decision.results.join(' ')
        : JSON.stringify(decision.results);

      const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decisionData = JSON.parse(jsonMatch[0]);
        return decisionData.shouldExecute === true;
      }
    } catch (error) {
      console.error('Failed to parse decision:', error);
    }

    // 默认执行
    return true;
  }

  /**
   * 提取决策理由
   */
  private extractDecisionReason(decision: any): string {
    try {
      const decisionText = Array.isArray(decision.results)
        ? decision.results.join(' ')
        : JSON.stringify(decision.results);

      const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decisionData = JSON.parse(jsonMatch[0]);
        return decisionData.reason || 'No reason provided';
      }
    } catch (error) {
      console.error('Failed to extract decision reason:', error);
    }

    return 'Decision reason not available';
  }

  /**
   * 更新共享上下文
   */
  private updateSharedContext(taskId: string, result: TaskResult): void {
    this.sharedContext.set(taskId, result);

    // 可以添加更智能的上下文管理逻辑
    if (result.output) {
      this.sharedContext.set(`${taskId}_output`, result.output);
    }
  }

  /**
   * 发出进度更新事件
   */
  private emitProgress(
    executionId: string,
    taskId: string,
    progress: any
  ): void {
    // 这里可以集成SSE或WebSocket来发送实时更新
    console.log(`Execution ${executionId}, Task ${taskId}:`, progress);
  }

  /**
   * 发出任务完成事件
   */
  private emitTaskComplete(
    executionId: string,
    taskId: string,
    result: TaskResult
  ): void {
    console.log(
      `Task ${taskId} completed in execution ${executionId}:`,
      result.success ? 'SUCCESS' : 'FAILED'
    );
  }

  /**
   * 结果综合
   */
  private async synthesizeResults(
    results: WorkflowResults,
    executionId: string
  ): Promise<WorkflowResults> {
    const mainAgent = this.agents.get(this.config.mainAgent.agentId);
    if (!mainAgent) {
      return results;
    }

    const synthesisPrompt = `
请综合以下工作流执行结果，生成最终的统一结果：

${Object.entries(results)
  .map(
    ([taskId, result]) =>
      `任务 ${taskId}:\n成功: ${result.success}\n结果: ${JSON.stringify(result.output, null, 2)}\n`
  )
  .join('\n')}

请提供：
1. 整体执行摘要
2. 关键发现和结果
3. 建议和后续行动
4. 质量评估
`;

    const synthesisResult = await mainAgent.execute(synthesisPrompt);

    results['_synthesis'] = {
      success: synthesisResult.success,
      output: synthesisResult.results,
      metadata: synthesisResult.metadata,
    };

    return results;
  }

  /**
   * 计算总token使用量
   */
  private calculateTotalTokens(results: WorkflowResults): number {
    return Object.values(results).reduce((total, result) => {
      return total + (result.metadata?.tokensUsed || 0);
    }, 0);
  }

  /**
   * 展示计划供用户确认
   */
  private async presentPlanForConfirmation(plan: ExecutionPlan): Promise<void> {
    // 这里可以实现计划确认逻辑
    console.log('Plan created, awaiting confirmation:', plan);
    // 在实际实现中，这里会暂停执行等待用户确认
  }

  /**
   * 加载Agent实例
   */
  private async loadAgents(): Promise<void> {
    // 这里需要从配置中加载Agent实例
    // 暂时使用Mock实现
    console.log('Loading agents for workflow:', this.config.id);
  }

  /**
   * 保存执行记录
   */
  private async saveExecutionRecord(
    executionId: string,
    result: WorkflowResult
  ): Promise<void> {
    try {
      await this.executionStore.saveExecutionRecord({
        id: executionId,
        workflowId: this.config.id,
        result,
        timestamp: new Date().toISOString(),
        status: result.success ? 'completed' : 'failed',
        metadata: result.metadata,
      });
    } catch (error) {
      console.error('Failed to save execution record:', error);
    }
  }

  /**
   * 获取工作流配置
   */
  getConfig(): ClaudeWorkflowConfig {
    return this.config;
  }

  /**
   * 更新工作流配置
   */
  updateConfig(updates: Partial<ClaudeWorkflowConfig>): void {
    this.config = { ...this.config, ...updates };
    this.config.metadata.updatedAt = new Date().toISOString();
  }
}
