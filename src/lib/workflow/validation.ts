import { WorkflowConfig, AgentConfig, ExecutionStage } from '@/lib/types';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'configuration' | 'flow' | 'agents' | 'performance';
  code: string;
  message: string;
  suggestion?: string;
  location?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export class WorkflowValidator {
  static validate(
    workflow: WorkflowConfig,
    agents: AgentConfig[]
  ): WorkflowValidationResult {
    const issues: ValidationIssue[] = [];

    // Basic configuration validation
    issues.push(...this.validateBasicConfig(workflow));

    // Agent team validation
    issues.push(...this.validateAgentTeam(workflow, agents));

    // Execution flow validation
    issues.push(...this.validateExecutionFlow(workflow, agents));

    // Performance validation
    issues.push(...this.validatePerformance(workflow));

    // Dependency validation
    issues.push(...this.validateDependencies(workflow));

    const summary = this.summarizeIssues(issues);
    const score = this.calculateScore(issues);
    const isValid = summary.errors === 0;

    return {
      isValid,
      issues,
      score,
      summary,
    };
  }

  private static validateBasicConfig(
    workflow: WorkflowConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Name validation
    if (!workflow.name || workflow.name.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'configuration',
        code: 'MISSING_NAME',
        message: '工作流名称不能为空',
        suggestion: '请为工作流设置一个有意义的名称',
      });
    } else if (workflow.name.length > 50) {
      issues.push({
        type: 'warning',
        category: 'configuration',
        code: 'LONG_NAME',
        message: '工作流名称过长，建议控制在50个字符以内',
        suggestion: '简化工作流名称以提高可读性',
      });
    }

    // Description validation
    if (!workflow.description || workflow.description.trim().length === 0) {
      issues.push({
        type: 'warning',
        category: 'configuration',
        code: 'MISSING_DESCRIPTION',
        message: '建议为工作流添加描述',
        suggestion: '添加描述有助于团队理解工作流的用途',
      });
    }

    // Configuration validation
    const config = workflow.configuration;

    if (config.maxExecutionTime < 30000) {
      issues.push({
        type: 'warning',
        category: 'configuration',
        code: 'SHORT_TIMEOUT',
        message: '执行超时时间过短，可能导致任务被过早中断',
        suggestion: '建议设置至少30秒的超时时间',
      });
    }

    if (config.maxExecutionTime > 7200000) {
      // 2 hours
      issues.push({
        type: 'warning',
        category: 'performance',
        code: 'LONG_TIMEOUT',
        message: '执行超时时间过长，可能影响系统资源',
        suggestion: '考虑将长任务拆分为多个较短的阶段',
      });
    }

    return issues;
  }

  private static validateAgentTeam(
    workflow: WorkflowConfig,
    agents: AgentConfig[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Agent count validation
    if (workflow.agentIds.length === 0) {
      issues.push({
        type: 'error',
        category: 'agents',
        code: 'NO_AGENTS',
        message: '工作流必须包含至少一个 Agent',
        suggestion: '请添加 Agent 到工作流团队',
      });
    }

    if (workflow.agentIds.length > 10) {
      issues.push({
        type: 'warning',
        category: 'performance',
        code: 'TOO_MANY_AGENTS',
        message: 'Agent 数量过多可能影响协调效率',
        suggestion: '考虑重新设计工作流以减少 Agent 数量',
      });
    }

    // Main agent validation
    if (workflow.agentIds.length > 0 && !workflow.mainAgentId) {
      issues.push({
        type: 'error',
        category: 'agents',
        code: 'NO_MAIN_AGENT',
        message: '必须指定一个主 Agent',
        suggestion: '选择一个 Agent 作为主 Agent 负责协调',
      });
    }

    if (
      workflow.mainAgentId &&
      !workflow.agentIds.includes(workflow.mainAgentId)
    ) {
      issues.push({
        type: 'error',
        category: 'agents',
        code: 'INVALID_MAIN_AGENT',
        message: '主 Agent 必须是工作流团队的成员',
        suggestion: '请选择团队中的 Agent 作为主 Agent',
      });
    }

    // Agent existence validation
    const missingAgents = workflow.agentIds.filter(
      (id) => !agents.find((agent) => agent.id === id)
    );

    if (missingAgents.length > 0) {
      issues.push({
        type: 'error',
        category: 'agents',
        code: 'MISSING_AGENTS',
        message: `以下 Agent 不存在: ${missingAgents.join(', ')}`,
        suggestion: '请移除不存在的 Agent 或创建对应的 Agent',
      });
    }

    // Agent role distribution validation
    const workflowAgents = agents.filter((agent) =>
      workflow.agentIds.includes(agent.id)
    );
    const roleDistribution = workflowAgents.reduce(
      (acc, agent) => {
        acc[agent.role] = (acc[agent.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    if (workflowAgents.length > 1 && roleDistribution.main > 1) {
      issues.push({
        type: 'warning',
        category: 'agents',
        code: 'MULTIPLE_MAIN_AGENTS',
        message: '工作流中有多个主角色 Agent，可能导致职责冲突',
        suggestion: '考虑将额外的主角色 Agent 改为子角色',
      });
    }

    if (workflowAgents.length > 2 && !roleDistribution.synthesis) {
      issues.push({
        type: 'info',
        category: 'agents',
        code: 'NO_SYNTHESIS_AGENT',
        message: '复杂工作流建议添加综合角色 Agent',
        suggestion: '添加综合角色 Agent 可以提高结果质量',
      });
    }

    return issues;
  }

  private static validateExecutionFlow(
    workflow: WorkflowConfig,
    agents: AgentConfig[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const flow = workflow.executionFlow;

    // Basic flow validation
    if (!flow || !flow.stages || flow.stages.length === 0) {
      issues.push({
        type: 'warning',
        category: 'flow',
        code: 'NO_EXECUTION_STAGES',
        message: '工作流没有定义执行阶段',
        suggestion: '添加执行阶段以明确任务流程',
      });
      return issues;
    }

    // Stage validation
    flow.stages.forEach((stage, index) => {
      issues.push(...this.validateStage(stage, index, agents));
    });

    // Dependency validation
    const dependencies = flow.dependencies || [];
    const stageIds = new Set(flow.stages.map((stage) => stage.id));

    dependencies.forEach((dep, index) => {
      if (!stageIds.has(dep.fromStage)) {
        issues.push({
          type: 'error',
          category: 'flow',
          code: 'INVALID_DEPENDENCY_SOURCE',
          message: `依赖关系 #${index + 1} 的源阶段不存在: ${dep.fromStage}`,
          location: `dependency-${index}`,
        });
      }

      if (!stageIds.has(dep.toStage)) {
        issues.push({
          type: 'error',
          category: 'flow',
          code: 'INVALID_DEPENDENCY_TARGET',
          message: `依赖关系 #${index + 1} 的目标阶段不存在: ${dep.toStage}`,
          location: `dependency-${index}`,
        });
      }

      if (dep.fromStage === dep.toStage) {
        issues.push({
          type: 'error',
          category: 'flow',
          code: 'CIRCULAR_DEPENDENCY',
          message: `依赖关系 #${index + 1} 形成自循环`,
          location: `dependency-${index}`,
        });
      }
    });

    // Check for potential deadlocks
    const deadlockCheck = this.detectDeadlocks(flow.stages, dependencies);
    if (deadlockCheck.length > 0) {
      issues.push({
        type: 'error',
        category: 'flow',
        code: 'POTENTIAL_DEADLOCK',
        message: '检测到潜在的死锁情况',
        suggestion: '检查依赖关系是否形成循环',
      });
    }

    return issues;
  }

  private static validateStage(
    stage: ExecutionStage,
    index: number,
    agents: AgentConfig[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const location = `stage-${index}`;

    // Basic stage validation
    if (!stage.name || stage.name.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'flow',
        code: 'MISSING_STAGE_NAME',
        message: `阶段 #${index + 1} 缺少名称`,
        location,
      });
    }

    if (stage.tasks.length === 0) {
      issues.push({
        type: 'warning',
        category: 'flow',
        code: 'EMPTY_STAGE',
        message: `阶段 "${stage.name}" 没有包含任何任务`,
        location,
      });
    }

    // Timeout validation
    if (stage.timeoutMs < 10000) {
      issues.push({
        type: 'warning',
        category: 'performance',
        code: 'SHORT_STAGE_TIMEOUT',
        message: `阶段 "${stage.name}" 的超时时间过短`,
        suggestion: '建议设置至少10秒的超时时间',
        location,
      });
    }

    // Retry policy validation
    if (stage.retryPolicy.maxRetries > 5) {
      issues.push({
        type: 'warning',
        category: 'performance',
        code: 'EXCESSIVE_RETRIES',
        message: `阶段 "${stage.name}" 的重试次数过多`,
        suggestion: '过多的重试可能导致执行时间过长',
        location,
      });
    }

    // Task validation
    stage.tasks.forEach((task, taskIndex) => {
      const agent = agents.find((a) => a.id === task.agentId);
      if (!agent) {
        issues.push({
          type: 'error',
          category: 'flow',
          code: 'MISSING_TASK_AGENT',
          message: `阶段 "${stage.name}" 中的任务 #${taskIndex + 1} 引用了不存在的 Agent`,
          location: `${location}-task-${taskIndex}`,
        });
      }

      if (task.timeout < 5000) {
        issues.push({
          type: 'warning',
          category: 'performance',
          code: 'SHORT_TASK_TIMEOUT',
          message: `任务超时时间过短: ${task.timeout}ms`,
          location: `${location}-task-${taskIndex}`,
        });
      }
    });

    // Parallel execution validation
    if (stage.type === 'parallel' && stage.tasks.length > 5) {
      issues.push({
        type: 'warning',
        category: 'performance',
        code: 'HIGH_PARALLELISM',
        message: `阶段 "${stage.name}" 并行任务数量较多，可能影响系统性能`,
        suggestion: '考虑将任务分组或调整为串行执行',
        location,
      });
    }

    return issues;
  }

  private static validatePerformance(
    workflow: WorkflowConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const flow = workflow.executionFlow;

    if (!flow.stages || flow.stages.length === 0) return issues;

    // Calculate estimated execution time
    const estimatedTime = this.estimateExecutionTime(workflow);

    if (estimatedTime > workflow.configuration.maxExecutionTime) {
      issues.push({
        type: 'warning',
        category: 'performance',
        code: 'EXECUTION_TIME_MISMATCH',
        message: '预估执行时间超过了配置的最大执行时间',
        suggestion: '调整超时设置或优化执行流程',
      });
    }

    // Check for resource-intensive patterns
    const parallelStages = flow.stages.filter(
      (stage) => stage.type === 'parallel'
    );
    const maxParallelTasks = Math.max(
      ...parallelStages.map((stage) => stage.tasks.length),
      0
    );

    if (maxParallelTasks > 3) {
      issues.push({
        type: 'info',
        category: 'performance',
        code: 'HIGH_RESOURCE_USAGE',
        message: '工作流可能消耗较多计算资源',
        suggestion: '监控系统资源使用情况',
      });
    }

    return issues;
  }

  private static validateDependencies(
    workflow: WorkflowConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const flow = workflow.executionFlow;
    const dependencies = flow.dependencies || [];

    if (flow.stages.length > 1 && dependencies.length === 0) {
      issues.push({
        type: 'info',
        category: 'flow',
        code: 'NO_DEPENDENCIES',
        message: '多阶段工作流建议配置阶段间的依赖关系',
        suggestion: '明确的依赖关系有助于确保执行顺序',
      });
    }

    // Check for orphaned stages
    const stagesWithDeps = new Set([
      ...dependencies.map((dep) => dep.fromStage),
      ...dependencies.map((dep) => dep.toStage),
    ]);

    const orphanedStages = flow.stages.filter(
      (stage) => !stagesWithDeps.has(stage.id) && flow.stages.length > 1
    );

    if (orphanedStages.length > 0) {
      issues.push({
        type: 'warning',
        category: 'flow',
        code: 'ORPHANED_STAGES',
        message: `以下阶段没有依赖关系: ${orphanedStages.map((s) => s.name).join(', ')}`,
        suggestion: '确认这些阶段是否需要与其他阶段建立依赖关系',
      });
    }

    return issues;
  }

  private static detectDeadlocks(
    stages: ExecutionStage[],
    dependencies: any[]
  ): string[] {
    // Simplified deadlock detection using DFS
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    // Build adjacency list
    stages.forEach((stage) => graph.set(stage.id, []));
    dependencies.forEach((dep) => {
      const targets = graph.get(dep.fromStage) || [];
      targets.push(dep.toStage);
      graph.set(dep.fromStage, targets);
    });

    // DFS to detect cycles
    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        cycles.push(`Cycle detected: ${path.join(' -> ')} -> ${node}`);
        return true;
      }

      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor, [...path, node])) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    stages.forEach((stage) => {
      if (!visited.has(stage.id)) {
        dfs(stage.id, []);
      }
    });

    return cycles;
  }

  private static estimateExecutionTime(workflow: WorkflowConfig): number {
    const flow = workflow.executionFlow;
    if (!flow.stages || flow.stages.length === 0) return 0;

    // Simple estimation: sum of stage timeouts
    return flow.stages.reduce((total, stage) => total + stage.timeoutMs, 0);
  }

  private static summarizeIssues(issues: ValidationIssue[]) {
    return {
      errors: issues.filter((issue) => issue.type === 'error').length,
      warnings: issues.filter((issue) => issue.type === 'warning').length,
      infos: issues.filter((issue) => issue.type === 'info').length,
    };
  }

  private static calculateScore(issues: ValidationIssue[]): number {
    const weights = { error: -20, warning: -5, info: -1 };
    const penalty = issues.reduce(
      (total, issue) => total + weights[issue.type],
      0
    );
    return Math.max(0, Math.min(100, 100 + penalty));
  }
}
