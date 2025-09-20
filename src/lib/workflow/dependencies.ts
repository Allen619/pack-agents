import { WorkflowConfig, ExecutionStage } from '@/lib/types';

export interface DependencyCondition {
  type: 'success' | 'failure' | 'completion' | 'custom';
  customExpression?: string;
  description?: string;
}

export interface StageDependency {
  fromStage: string;
  toStage: string;
  condition?: DependencyCondition;
  weight?: number; // For priority ordering
}

export interface DependencyGraph {
  nodes: string[];
  edges: StageDependency[];
  levels: string[][]; // Topologically sorted levels
}

export interface ExecutionPlan {
  totalStages: number;
  estimatedDuration: number;
  executionLevels: Array<{
    level: number;
    stages: string[];
    canRunInParallel: boolean;
    estimatedDuration: number;
    dependencies: string[];
  }>;
  criticalPath: string[];
  warnings: string[];
}

export class DependencyManager {
  /**
   * Build dependency graph from workflow configuration
   */
  static buildDependencyGraph(workflow: WorkflowConfig): DependencyGraph {
    const stages = workflow.executionFlow.stages;
    const dependencies = workflow.executionFlow.dependencies || [];

    const nodes = stages.map((stage) => stage.id);
    const edges: StageDependency[] = dependencies.map((dep) => ({
      fromStage: dep.fromStage,
      toStage: dep.toStage,
      condition: dep.condition
        ? {
            type: 'custom',
            customExpression: dep.condition,
            description: dep.condition,
          }
        : { type: 'success' },
    }));

    // Perform topological sort to determine execution levels
    const levels = this.topologicalSort(nodes, edges);

    return {
      nodes,
      edges,
      levels,
    };
  }

  /**
   * Generate execution plan based on dependency graph
   */
  static generateExecutionPlan(
    workflow: WorkflowConfig,
    graph?: DependencyGraph
  ): ExecutionPlan {
    const dependencyGraph = graph || this.buildDependencyGraph(workflow);
    const stages = workflow.executionFlow.stages;

    const executionLevels = dependencyGraph.levels.map((levelStages, index) => {
      const stageObjects = levelStages.map(
        (stageId) => stages.find((stage) => stage.id === stageId)!
      );

      const dependencies = this.getDependenciesForLevel(
        levelStages,
        dependencyGraph.edges
      );
      const estimatedDuration = Math.max(
        ...stageObjects.map((stage) => stage.timeoutMs)
      );

      return {
        level: index + 1,
        stages: levelStages,
        canRunInParallel: levelStages.length > 1,
        estimatedDuration,
        dependencies,
      };
    });

    const totalDuration = executionLevels.reduce(
      (sum, level) => sum + level.estimatedDuration,
      0
    );

    const criticalPath = this.findCriticalPath(workflow, dependencyGraph);
    const warnings = this.analyzeExecutionPlan(workflow, executionLevels);

    return {
      totalStages: stages.length,
      estimatedDuration: totalDuration,
      executionLevels,
      criticalPath,
      warnings,
    };
  }

  /**
   * Validate dependency configuration
   */
  static validateDependencies(workflow: WorkflowConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const stages = workflow.executionFlow.stages;
    const dependencies = workflow.executionFlow.dependencies || [];

    const stageIds = new Set(stages.map((stage) => stage.id));

    // Check for invalid stage references
    dependencies.forEach((dep, index) => {
      if (!stageIds.has(dep.fromStage)) {
        errors.push(`依赖关系 #${index + 1}: 源阶段 "${dep.fromStage}" 不存在`);
      }
      if (!stageIds.has(dep.toStage)) {
        errors.push(`依赖关系 #${index + 1}: 目标阶段 "${dep.toStage}" 不存在`);
      }
      if (dep.fromStage === dep.toStage) {
        errors.push(`依赖关系 #${index + 1}: 阶段不能依赖自身`);
      }
    });

    // Check for circular dependencies
    const cycles = this.detectCircularDependencies(stageIds, dependencies);
    if (cycles.length > 0) {
      errors.push(`检测到循环依赖: ${cycles.join(', ')}`);
    }

    // Check for orphaned stages
    if (stages.length > 1) {
      const connectedStages = new Set();
      dependencies.forEach((dep) => {
        connectedStages.add(dep.fromStage);
        connectedStages.add(dep.toStage);
      });

      const orphanedStages = stages
        .filter((stage) => !connectedStages.has(stage.id))
        .map((stage) => stage.name);

      if (orphanedStages.length > 0) {
        warnings.push(`以下阶段没有依赖关系: ${orphanedStages.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Add dependency between two stages
   */
  static addDependency(
    workflow: WorkflowConfig,
    fromStageId: string,
    toStageId: string,
    condition?: DependencyCondition
  ): WorkflowConfig {
    const dependencies = workflow.executionFlow.dependencies || [];

    // Check if dependency already exists
    const existingDep = dependencies.find(
      (dep) => dep.fromStage === fromStageId && dep.toStage === toStageId
    );

    if (existingDep) {
      // Update existing dependency
      existingDep.condition = condition?.customExpression;
    } else {
      // Add new dependency
      dependencies.push({
        fromStage: fromStageId,
        toStage: toStageId,
        condition: condition?.customExpression,
      });
    }

    return {
      ...workflow,
      executionFlow: {
        ...workflow.executionFlow,
        dependencies,
      },
    };
  }

  /**
   * Remove dependency between two stages
   */
  static removeDependency(
    workflow: WorkflowConfig,
    fromStageId: string,
    toStageId: string
  ): WorkflowConfig {
    const dependencies = workflow.executionFlow.dependencies || [];

    const filteredDependencies = dependencies.filter(
      (dep) => !(dep.fromStage === fromStageId && dep.toStage === toStageId)
    );

    return {
      ...workflow,
      executionFlow: {
        ...workflow.executionFlow,
        dependencies: filteredDependencies,
      },
    };
  }

  /**
   * Optimize dependency structure for better performance
   */
  static optimizeDependencies(workflow: WorkflowConfig): {
    optimizedWorkflow: WorkflowConfig;
    optimizations: string[];
  } {
    const optimizations: string[] = [];
    let optimizedWorkflow = { ...workflow };

    // Remove redundant dependencies
    const redundant = this.findRedundantDependencies(workflow);
    if (redundant.length > 0) {
      optimizations.push(`移除了 ${redundant.length} 个冗余依赖关系`);
      optimizedWorkflow = this.removeRedundantDependencies(
        optimizedWorkflow,
        redundant
      );
    }

    // Suggest parallel execution opportunities
    const parallelOpportunities =
      this.findParallelizationOpportunities(optimizedWorkflow);
    if (parallelOpportunities.length > 0) {
      optimizations.push(`发现 ${parallelOpportunities.length} 个并行化机会`);
    }

    return {
      optimizedWorkflow,
      optimizations,
    };
  }

  private static topologicalSort(
    nodes: string[],
    edges: StageDependency[]
  ): string[][] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    nodes.forEach((node) => {
      inDegree.set(node, 0);
      adjList.set(node, []);
    });

    // Build graph
    edges.forEach((edge) => {
      const targets = adjList.get(edge.fromStage) || [];
      targets.push(edge.toStage);
      adjList.set(edge.fromStage, targets);

      inDegree.set(edge.toStage, (inDegree.get(edge.toStage) || 0) + 1);
    });

    const levels: string[][] = [];
    const remaining = new Set(nodes);

    while (remaining.size > 0) {
      // Find nodes with no incoming edges
      const currentLevel = Array.from(remaining).filter(
        (node) => inDegree.get(node) === 0
      );

      if (currentLevel.length === 0) {
        // Circular dependency detected
        break;
      }

      levels.push(currentLevel);

      // Remove current level nodes and update in-degrees
      currentLevel.forEach((node) => {
        remaining.delete(node);
        const targets = adjList.get(node) || [];
        targets.forEach((target) => {
          inDegree.set(target, (inDegree.get(target) || 0) - 1);
        });
      });
    }

    // Add any remaining nodes (circular dependencies)
    if (remaining.size > 0) {
      levels.push(Array.from(remaining));
    }

    return levels;
  }

  private static getDependenciesForLevel(
    levelStages: string[],
    edges: StageDependency[]
  ): string[] {
    const dependencies = new Set<string>();

    levelStages.forEach((stage) => {
      edges.forEach((edge) => {
        if (edge.toStage === stage) {
          dependencies.add(edge.fromStage);
        }
      });
    });

    return Array.from(dependencies);
  }

  private static findCriticalPath(
    workflow: WorkflowConfig,
    graph: DependencyGraph
  ): string[] {
    const stages = workflow.executionFlow.stages;
    const stageMap = new Map(stages.map((stage) => [stage.id, stage]));

    // Calculate longest path (critical path)
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize distances
    graph.nodes.forEach((node) => {
      distances.set(node, 0);
      predecessors.set(node, null);
    });

    // Process levels in order
    graph.levels.forEach((level) => {
      level.forEach((stageId) => {
        const stage = stageMap.get(stageId);
        if (!stage) return;

        // Find dependencies of this stage
        graph.edges.forEach((edge) => {
          if (edge.toStage === stageId) {
            const fromDistance = distances.get(edge.fromStage) || 0;
            const fromStage = stageMap.get(edge.fromStage);
            const newDistance = fromDistance + (fromStage?.timeoutMs || 0);

            if (newDistance > (distances.get(stageId) || 0)) {
              distances.set(stageId, newDistance);
              predecessors.set(stageId, edge.fromStage);
            }
          }
        });
      });
    });

    // Find the stage with maximum distance (end of critical path)
    let maxDistance = 0;
    let endStage = '';

    distances.forEach((distance, stage) => {
      if (distance > maxDistance) {
        maxDistance = distance;
        endStage = stage;
      }
    });

    // Reconstruct critical path
    const criticalPath: string[] = [];
    let current: string | null = endStage;

    while (current) {
      criticalPath.unshift(current);
      current = predecessors.get(current) || null;
    }

    return criticalPath;
  }

  private static analyzeExecutionPlan(
    workflow: WorkflowConfig,
    executionLevels: any[]
  ): string[] {
    const warnings: string[] = [];

    // Check for long sequential chains
    const sequentialChains = executionLevels.filter(
      (level) => !level.canRunInParallel
    );
    if (sequentialChains.length > 5) {
      warnings.push('工作流包含过多串行阶段，考虑增加并行处理');
    }

    // Check for resource bottlenecks
    const maxParallelStages = Math.max(
      ...executionLevels.map((level) => level.stages.length)
    );
    if (maxParallelStages > 5) {
      warnings.push(
        `第${executionLevels.findIndex((l) => l.stages.length === maxParallelStages) + 1}级包含${maxParallelStages}个并行阶段，可能影响性能`
      );
    }

    // Check execution time distribution
    const totalDuration = executionLevels.reduce(
      (sum, level) => sum + level.estimatedDuration,
      0
    );
    const longestLevel = Math.max(
      ...executionLevels.map((level) => level.estimatedDuration)
    );

    if (longestLevel > totalDuration * 0.5) {
      warnings.push('存在执行时间过长的阶段，考虑拆分或优化');
    }

    return warnings;
  }

  private static detectCircularDependencies(
    stageIds: Set<string>,
    dependencies: any[]
  ): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const adjList = new Map<string, string[]>();
    stageIds.forEach((id) => adjList.set(id, []));

    dependencies.forEach((dep) => {
      const targets = adjList.get(dep.fromStage) || [];
      targets.push(dep.toStage);
      adjList.set(dep.fromStage, targets);
    });

    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        cycles.push(`${path.join(' → ')} → ${node}`);
        return true;
      }

      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjList.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor, [...path, node])) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    stageIds.forEach((id) => {
      if (!visited.has(id)) {
        dfs(id, []);
      }
    });

    return cycles;
  }

  private static findRedundantDependencies(workflow: WorkflowConfig): any[] {
    // Implementation for finding transitive dependencies that can be removed
    // A→B, B→C, A→C (A→C is redundant)
    const dependencies = workflow.executionFlow.dependencies || [];
    const redundant: any[] = [];

    dependencies.forEach((dep) => {
      // Check if there's an indirect path from dep.fromStage to dep.toStage
      const hasIndirectPath = this.hasIndirectPath(
        dep.fromStage,
        dep.toStage,
        dependencies.filter((d) => d !== dep)
      );

      if (hasIndirectPath) {
        redundant.push(dep);
      }
    });

    return redundant;
  }

  private static hasIndirectPath(
    from: string,
    to: string,
    dependencies: any[]
  ): boolean {
    const adjList = new Map<string, string[]>();
    const visited = new Set<string>();

    // Build adjacency list
    dependencies.forEach((dep) => {
      if (!adjList.has(dep.fromStage)) {
        adjList.set(dep.fromStage, []);
      }
      adjList.get(dep.fromStage)!.push(dep.toStage);
    });

    // DFS to find indirect path
    const dfs = (current: string): boolean => {
      if (current === to) return true;
      if (visited.has(current)) return false;

      visited.add(current);
      const neighbors = adjList.get(current) || [];

      return neighbors.some((neighbor) => dfs(neighbor));
    };

    return dfs(from) && visited.size > 1; // Must visit at least one intermediate node
  }

  private static removeRedundantDependencies(
    workflow: WorkflowConfig,
    redundant: any[]
  ): WorkflowConfig {
    const dependencies = workflow.executionFlow.dependencies || [];
    const filteredDependencies = dependencies.filter(
      (dep) =>
        !redundant.some(
          (r) => r.fromStage === dep.fromStage && r.toStage === dep.toStage
        )
    );

    return {
      ...workflow,
      executionFlow: {
        ...workflow.executionFlow,
        dependencies: filteredDependencies,
      },
    };
  }

  private static findParallelizationOpportunities(
    workflow: WorkflowConfig
  ): string[] {
    const graph = this.buildDependencyGraph(workflow);
    const opportunities: string[] = [];

    // Find stages that could potentially run in parallel
    graph.levels.forEach((level, index) => {
      if (level.length === 1 && index < graph.levels.length - 1) {
        const nextLevel = graph.levels[index + 1];
        if (nextLevel.length === 1) {
          // Check if these stages have no direct dependency
          const hasDirectDep = graph.edges.some(
            (edge) =>
              edge.fromStage === level[0] && edge.toStage === nextLevel[0]
          );

          if (!hasDirectDep) {
            opportunities.push(
              `阶段 ${level[0]} 和 ${nextLevel[0]} 可能可以并行执行`
            );
          }
        }
      }
    });

    return opportunities;
  }
}
