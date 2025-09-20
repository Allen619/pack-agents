import { WorkflowConfig, AgentConfig } from '@/lib/types';
import { generateId } from '@/lib/utils';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;

  // Template configuration
  agentRoles: Array<{
    role: string;
    name: string;
    description: string;
    required: boolean;
    systemPrompt?: string;
    enabledTools?: string[];
    knowledgeBasePaths?: string[];
  }>;

  executionFlow: {
    stages: Array<{
      id: string;
      name: string;
      type: 'parallel' | 'sequential';
      description?: string;
      agentRoles: string[]; // References to agentRoles
      timeoutMs: number;
      retryPolicy: {
        maxRetries: number;
        backoffMs: number;
      };
    }>;
    dependencies: Array<{
      fromStage: string;
      toStage: string;
      condition?: string;
    }>;
  };

  configuration: {
    maxExecutionTime: number;
    autoRetry: boolean;
    notifications: boolean;
  };

  metadata: {
    complexity: 'simple' | 'medium' | 'complex';
    estimatedDuration: number;
    requiredAgentCount: number;
    successRate?: number;
    usageCount: number;
    rating?: number;
    screenshots?: string[];
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: WorkflowTemplate[];
}

export class WorkflowTemplateManager {
  /**
   * Get built-in workflow templates
   */
  static getBuiltInTemplates(): WorkflowTemplate[] {
    return [
      {
        id: 'code-review-workflow',
        name: '代码审查工作流',
        description:
          '多 Agent 协作进行代码审查，包括代码分析、安全检查和质量评估',
        category: 'development',
        tags: ['代码审查', '质量控制', '团队协作'],
        version: '1.0.0',
        author: 'Pack Agents Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        agentRoles: [
          {
            role: 'code_analyzer',
            name: '代码分析师',
            description: '负责分析代码结构、性能和可维护性',
            required: true,
            systemPrompt:
              '你是一个专业的代码分析师，负责分析代码质量、发现潜在问题、提供改进建议。请仔细分析代码结构、性能、安全性和可维护性。',
            enabledTools: ['Read', 'Grep', 'Search', 'List'],
            knowledgeBasePaths: ['./src', './docs'],
          },
          {
            role: 'security_auditor',
            name: '安全审计员',
            description: '专注于代码安全性检查和漏洞发现',
            required: true,
            systemPrompt:
              '你是一个安全专家，专门负责审查代码中的安全漏洞和风险。重点关注 SQL 注入、XSS、CSRF、身份验证等安全问题。',
            enabledTools: ['Read', 'Grep', 'Search'],
            knowledgeBasePaths: ['./src'],
          },
          {
            role: 'quality_reviewer',
            name: '质量评审员',
            description: '评估代码质量和开发规范合规性',
            required: true,
            systemPrompt:
              '你是一个代码质量专家，负责检查代码规范、最佳实践和团队约定的遵循情况。',
            enabledTools: ['Read', 'Grep', 'List'],
            knowledgeBasePaths: ['./src', './docs'],
          },
          {
            role: 'report_synthesizer',
            name: '报告综合员',
            description: '整合各方面的审查结果并生成最终报告',
            required: true,
            systemPrompt:
              '你负责整合代码分析、安全审计和质量评审的结果，生成一份全面的代码审查报告。',
            enabledTools: ['Write'],
            knowledgeBasePaths: ['./docs'],
          },
        ],

        executionFlow: {
          stages: [
            {
              id: 'parallel_analysis',
              name: '并行分析阶段',
              type: 'parallel',
              description: '同时进行代码分析、安全审计和质量评审',
              agentRoles: [
                'code_analyzer',
                'security_auditor',
                'quality_reviewer',
              ],
              timeoutMs: 300000,
              retryPolicy: { maxRetries: 2, backoffMs: 5000 },
            },
            {
              id: 'report_synthesis',
              name: '报告综合阶段',
              type: 'sequential',
              description: '综合所有分析结果生成最终报告',
              agentRoles: ['report_synthesizer'],
              timeoutMs: 180000,
              retryPolicy: { maxRetries: 1, backoffMs: 3000 },
            },
          ],
          dependencies: [
            {
              fromStage: 'parallel_analysis',
              toStage: 'report_synthesis',
              condition: 'success',
            },
          ],
        },

        configuration: {
          maxExecutionTime: 600000,
          autoRetry: true,
          notifications: true,
        },

        metadata: {
          complexity: 'medium',
          estimatedDuration: 480000,
          requiredAgentCount: 4,
          successRate: 0.92,
          usageCount: 156,
          rating: 4.7,
        },
      },

      {
        id: 'content-creation-workflow',
        name: '内容创作工作流',
        description: '多角色协作创建高质量内容，包括研究、写作、编辑和审核',
        category: 'content',
        tags: ['内容创作', '写作', '编辑'],
        version: '1.0.0',
        author: 'Pack Agents Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        agentRoles: [
          {
            role: 'researcher',
            name: '内容研究员',
            description: '负责收集和整理相关资料和信息',
            required: true,
            systemPrompt:
              '你是一个专业的内容研究员，负责收集、整理和分析相关主题的资料。请提供准确、全面的信息支持。',
            enabledTools: ['Search', 'Read', 'List'],
            knowledgeBasePaths: ['./content', './research'],
          },
          {
            role: 'writer',
            name: '内容写作者',
            description: '基于研究资料创作原创内容',
            required: true,
            systemPrompt:
              '你是一个经验丰富的内容写作者，负责基于研究资料创作引人入胜、信息丰富的原创内容。',
            enabledTools: ['Write', 'Read'],
            knowledgeBasePaths: ['./content'],
          },
          {
            role: 'editor',
            name: '内容编辑',
            description: '编辑和改进内容质量',
            required: true,
            systemPrompt:
              '你是一个专业的内容编辑，负责改进文章的结构、语言和可读性。确保内容清晰、准确、吸引人。',
            enabledTools: ['Read', 'Write'],
            knowledgeBasePaths: ['./content'],
          },
        ],

        executionFlow: {
          stages: [
            {
              id: 'research_phase',
              name: '资料研究阶段',
              type: 'sequential',
              description: '收集和整理相关资料',
              agentRoles: ['researcher'],
              timeoutMs: 240000,
              retryPolicy: { maxRetries: 2, backoffMs: 5000 },
            },
            {
              id: 'writing_phase',
              name: '内容写作阶段',
              type: 'sequential',
              description: '基于研究资料创作内容',
              agentRoles: ['writer'],
              timeoutMs: 360000,
              retryPolicy: { maxRetries: 2, backoffMs: 5000 },
            },
            {
              id: 'editing_phase',
              name: '内容编辑阶段',
              type: 'sequential',
              description: '编辑和改进内容质量',
              agentRoles: ['editor'],
              timeoutMs: 180000,
              retryPolicy: { maxRetries: 1, backoffMs: 3000 },
            },
          ],
          dependencies: [
            {
              fromStage: 'research_phase',
              toStage: 'writing_phase',
            },
            {
              fromStage: 'writing_phase',
              toStage: 'editing_phase',
            },
          ],
        },

        configuration: {
          maxExecutionTime: 900000,
          autoRetry: true,
          notifications: false,
        },

        metadata: {
          complexity: 'simple',
          estimatedDuration: 780000,
          requiredAgentCount: 3,
          successRate: 0.89,
          usageCount: 89,
          rating: 4.5,
        },
      },

      {
        id: 'data-analysis-workflow',
        name: '数据分析工作流',
        description: '完整的数据分析流程，包括数据收集、清洗、分析和报告生成',
        category: 'analytics',
        tags: ['数据分析', '统计', '报告'],
        version: '1.0.0',
        author: 'Pack Agents Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        agentRoles: [
          {
            role: 'data_collector',
            name: '数据收集员',
            description: '负责收集和导入数据',
            required: true,
            systemPrompt:
              '你是一个数据收集专家，负责从各种数据源收集、导入和初步整理数据。',
            enabledTools: ['Read', 'List', 'Search'],
            knowledgeBasePaths: ['./data'],
          },
          {
            role: 'data_cleaner',
            name: '数据清洗员',
            description: '清洗和预处理数据',
            required: true,
            systemPrompt:
              '你是一个数据清洗专家，负责识别和处理数据质量问题，进行数据预处理。',
            enabledTools: ['Read', 'Write'],
            knowledgeBasePaths: ['./data'],
          },
          {
            role: 'data_analyst',
            name: '数据分析师',
            description: '执行数据分析和统计计算',
            required: true,
            systemPrompt:
              '你是一个数据分析师，负责执行统计分析、生成洞察和发现数据模式。',
            enabledTools: ['Read', 'Write'],
            knowledgeBasePaths: ['./data', './analysis'],
          },
          {
            role: 'report_generator',
            name: '报告生成员',
            description: '生成数据分析报告',
            required: true,
            systemPrompt:
              '你负责将数据分析结果整理成清晰、易懂的报告，包括图表和关键洞察。',
            enabledTools: ['Write', 'Read'],
            knowledgeBasePaths: ['./reports'],
          },
        ],

        executionFlow: {
          stages: [
            {
              id: 'data_collection',
              name: '数据收集',
              type: 'sequential',
              agentRoles: ['data_collector'],
              timeoutMs: 180000,
              retryPolicy: { maxRetries: 2, backoffMs: 5000 },
            },
            {
              id: 'data_cleaning',
              name: '数据清洗',
              type: 'sequential',
              agentRoles: ['data_cleaner'],
              timeoutMs: 240000,
              retryPolicy: { maxRetries: 2, backoffMs: 5000 },
            },
            {
              id: 'data_analysis',
              name: '数据分析',
              type: 'sequential',
              agentRoles: ['data_analyst'],
              timeoutMs: 300000,
              retryPolicy: { maxRetries: 1, backoffMs: 3000 },
            },
            {
              id: 'report_generation',
              name: '报告生成',
              type: 'sequential',
              agentRoles: ['report_generator'],
              timeoutMs: 180000,
              retryPolicy: { maxRetries: 1, backoffMs: 3000 },
            },
          ],
          dependencies: [
            { fromStage: 'data_collection', toStage: 'data_cleaning' },
            { fromStage: 'data_cleaning', toStage: 'data_analysis' },
            { fromStage: 'data_analysis', toStage: 'report_generation' },
          ],
        },

        configuration: {
          maxExecutionTime: 1200000,
          autoRetry: true,
          notifications: true,
        },

        metadata: {
          complexity: 'complex',
          estimatedDuration: 900000,
          requiredAgentCount: 4,
          successRate: 0.85,
          usageCount: 67,
          rating: 4.6,
        },
      },
    ];
  }

  /**
   * Get template categories
   */
  static getTemplateCategories(): TemplateCategory[] {
    const templates = this.getBuiltInTemplates();

    const categories: Record<string, TemplateCategory> = {
      development: {
        id: 'development',
        name: '软件开发',
        description: '代码审查、测试、部署等开发相关工作流',
        icon: '💻',
        templates: [],
      },
      content: {
        id: 'content',
        name: '内容创作',
        description: '写作、编辑、内容策划等创作工作流',
        icon: '✍️',
        templates: [],
      },
      analytics: {
        id: 'analytics',
        name: '数据分析',
        description: '数据收集、分析、报告生成等分析工作流',
        icon: '📊',
        templates: [],
      },
      business: {
        id: 'business',
        name: '业务流程',
        description: '项目管理、客户服务等业务工作流',
        icon: '🏢',
        templates: [],
      },
      research: {
        id: 'research',
        name: '研究调研',
        description: '市场调研、学术研究等研究工作流',
        icon: '🔍',
        templates: [],
      },
    };

    // Group templates by category
    templates.forEach((template) => {
      if (categories[template.category]) {
        categories[template.category].templates.push(template);
      }
    });

    return Object.values(categories);
  }

  /**
   * Apply template to create new workflow
   */
  static applyTemplate(
    template: WorkflowTemplate,
    options: {
      name?: string;
      description?: string;
      agentMappings?: Record<string, string>; // role -> agentId
    } = {}
  ): Partial<WorkflowConfig> {
    const workflowId = generateId('workflow');

    // Apply agent mappings or create placeholder agent IDs
    const agentIds: string[] = [];
    const agentMappings = options.agentMappings || {};

    template.agentRoles.forEach((role) => {
      if (agentMappings[role.role]) {
        agentIds.push(agentMappings[role.role]);
      } else {
        // Create placeholder agent ID that needs to be mapped later
        agentIds.push(`placeholder-${role.role}`);
      }
    });

    // Convert template stages to workflow stages
    const stages = template.executionFlow.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      tasks: stage.agentRoles.map((role) => {
        const agentId = agentMappings[role] || `placeholder-${role}`;
        return {
          id: generateId('task'),
          agentId,
          taskType: this.inferTaskType(role),
          inputs: {},
          dependencies: [],
          timeout: stage.timeoutMs,
        };
      }),
      timeoutMs: stage.timeoutMs,
      retryPolicy: stage.retryPolicy,
    }));

    return {
      id: workflowId,
      name: options.name || template.name,
      description: options.description || template.description,
      agentIds,
      mainAgentId: agentIds[0] || '',
      executionFlow: {
        stages,
        dependencies: template.executionFlow.dependencies,
      },
      configuration: template.configuration,
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionCount: 0,
      },
    };
  }

  /**
   * Create template from existing workflow
   */
  static createTemplateFromWorkflow(
    workflow: WorkflowConfig,
    agents: AgentConfig[],
    templateInfo: {
      name: string;
      description: string;
      category: string;
      tags: string[];
      author: string;
    }
  ): WorkflowTemplate {
    const workflowAgents = agents.filter((agent) =>
      workflow.agentIds.includes(agent.id)
    );

    const agentRoles = workflowAgents.map((agent) => ({
      role: agent.role,
      name: agent.name,
      description: agent.description,
      required: true,
      systemPrompt: agent.systemPrompt,
      enabledTools: agent.enabledTools,
      knowledgeBasePaths: agent.knowledgeBasePaths,
    }));

    const stages = workflow.executionFlow.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      description: `Stage: ${stage.name}`,
      agentRoles: stage.tasks.map((task) => {
        const agent = agents.find((a) => a.id === task.agentId);
        return agent?.role || 'unknown';
      }),
      timeoutMs: stage.timeoutMs,
      retryPolicy: stage.retryPolicy,
    }));

    return {
      id: generateId('template'),
      ...templateInfo,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentRoles,
      executionFlow: {
        stages,
        dependencies: workflow.executionFlow.dependencies || [],
      },
      configuration: workflow.configuration,
      metadata: {
        complexity: this.assessComplexity(workflow),
        estimatedDuration: this.estimateDuration(workflow),
        requiredAgentCount: workflowAgents.length,
        usageCount: 0,
      },
    };
  }

  /**
   * Validate template configuration
   */
  static validateTemplate(template: WorkflowTemplate): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!template.name || template.name.trim().length === 0) {
      errors.push('模板名称不能为空');
    }

    if (!template.description || template.description.trim().length === 0) {
      warnings.push('建议添加模板描述');
    }

    if (template.agentRoles.length === 0) {
      errors.push('模板必须包含至少一个 Agent 角色');
    }

    if (template.executionFlow.stages.length === 0) {
      errors.push('模板必须包含至少一个执行阶段');
    }

    // Validate agent role references
    const roleIds = new Set(template.agentRoles.map((role) => role.role));
    template.executionFlow.stages.forEach((stage, index) => {
      stage.agentRoles.forEach((roleId) => {
        if (!roleIds.has(roleId)) {
          errors.push(`阶段 "${stage.name}" 引用了不存在的角色 "${roleId}"`);
        }
      });
    });

    // Validate stage dependencies
    const stageIds = new Set(
      template.executionFlow.stages.map((stage) => stage.id)
    );
    template.executionFlow.dependencies.forEach((dep) => {
      if (!stageIds.has(dep.fromStage)) {
        errors.push(`依赖关系引用了不存在的源阶段 "${dep.fromStage}"`);
      }
      if (!stageIds.has(dep.toStage)) {
        errors.push(`依赖关系引用了不存在的目标阶段 "${dep.toStage}"`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static inferTaskType(
    role: string
  ): 'main_planning' | 'sub_execution' | 'synthesis' {
    const planningRoles = ['planner', 'coordinator', 'manager'];
    const synthesisRoles = [
      'synthesizer',
      'reporter',
      'aggregator',
      'summarizer',
    ];

    if (planningRoles.some((r) => role.toLowerCase().includes(r))) {
      return 'main_planning';
    }

    if (synthesisRoles.some((r) => role.toLowerCase().includes(r))) {
      return 'synthesis';
    }

    return 'sub_execution';
  }

  private static assessComplexity(
    workflow: WorkflowConfig
  ): 'simple' | 'medium' | 'complex' {
    const stageCount = workflow.executionFlow.stages.length;
    const agentCount = workflow.agentIds.length;
    const dependencyCount = workflow.executionFlow.dependencies?.length || 0;

    const complexityScore = stageCount + agentCount + dependencyCount;

    if (complexityScore <= 6) return 'simple';
    if (complexityScore <= 12) return 'medium';
    return 'complex';
  }

  private static estimateDuration(workflow: WorkflowConfig): number {
    return workflow.executionFlow.stages.reduce(
      (total, stage) => total + stage.timeoutMs,
      0
    );
  }
}
