// 配置数据验证服务
import Ajv from 'ajv';

export class ConfigValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  validateAgent(agent: any): { valid: boolean; errors?: string[] } {
    const schema = {
      type: 'object',
      required: ['id', 'name', 'role', 'systemPrompt', 'llmConfig'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        role: { enum: ['main', 'sub', 'synthesis'] },
        systemPrompt: { type: 'string', minLength: 10 },
        llmConfig: {
          type: 'object',
          required: ['provider', 'baseUrl', 'apiKey', 'capabilities'],
          properties: {
            provider: { type: 'string' },
            model: { type: 'string' },
            baseUrl: { type: 'string', minLength: 1 },
            apiKey: { type: 'string', minLength: 1 },
            capabilities: {
              type: 'object',
              required: ['language', 'vision', 'web'],
              properties: {
                language: { type: 'boolean' },
                vision: { type: 'boolean' },
                web: { type: 'boolean' },
              },
            },
            parameters: { type: 'object' },
          },
        },
        knowledgeBasePaths: {
          type: 'array',
          items: { type: 'string' },
        },
        mcpServerIds: {
          type: 'array',
          items: { type: 'string' },
        },
        enabledTools: {
          type: 'array',
          items: { type: 'string' },
        },
        metadata: {
          type: 'object',
          required: [
            'version',
            'author',
            'tags',
            'createdAt',
            'updatedAt',
            'usage',
          ],
          properties: {
            version: { type: 'string' },
            author: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            usage: {
              type: 'object',
              properties: {
                totalExecutions: { type: 'number', minimum: 0 },
                successRate: { type: 'number', minimum: 0, maximum: 1 },
                avgExecutionTime: { type: 'number', minimum: 0 },
              },
            },
          },
        },
      },
    };

    const valid = this.ajv.validate(schema, agent);
    if (!valid) {
      const errors =
        this.ajv.errors?.map(
          (error) => `${error.instancePath}: ${error.message}`
        ) || [];
      return { valid: false, errors };
    }
    return { valid: true };
  }

  validateWorkflow(workflow: any): { valid: boolean; errors?: string[] } {
    const schema = {
      type: 'object',
      required: ['id', 'name', 'agentIds', 'mainAgentId', 'executionFlow'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        agentIds: { type: 'array', minItems: 1, items: { type: 'string' } },
        mainAgentId: { type: 'string' },
        executionFlow: {
          type: 'object',
          required: ['stages'],
          properties: {
            stages: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['id', 'name', 'type', 'tasks'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { enum: ['parallel', 'sequential'] },
                  tasks: { type: 'array', minItems: 1 },
                },
              },
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                required: ['fromStage', 'toStage'],
                properties: {
                  fromStage: { type: 'string' },
                  toStage: { type: 'string' },
                  condition: { type: 'string' },
                },
              },
            },
          },
        },
        configuration: {
          type: 'object',
          properties: {
            maxExecutionTime: { type: 'number', minimum: 1000 },
            autoRetry: { type: 'boolean' },
            notifications: { type: 'boolean' },
          },
        },
        metadata: {
          type: 'object',
          required: ['version', 'createdAt', 'updatedAt', 'executionCount'],
          properties: {
            version: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            lastExecuted: { type: 'string' },
            executionCount: { type: 'number', minimum: 0 },
          },
        },
      },
    };

    const valid = this.ajv.validate(schema, workflow);
    if (!valid) {
      const errors =
        this.ajv.errors?.map(
          (error) => `${error.instancePath}: ${error.message}`
        ) || [];
      return { valid: false, errors };
    }
    return { valid: true };
  }

  validateExecution(execution: any): { valid: boolean; errors?: string[] } {
    const schema = {
      type: 'object',
      required: [
        'id',
        'workflowId',
        'status',
        'input',
        'scratchpad',
        'tasks',
        'metadata',
      ],
      properties: {
        id: { type: 'string', minLength: 1 },
        workflowId: { type: 'string', minLength: 1 },
        status: {
          enum: [
            'pending',
            'planning',
            'confirmed',
            'running',
            'paused',
            'completed',
            'failed',
            'cancelled',
          ],
        },
        input: { type: 'object' },
        output: { type: 'object' },
        scratchpad: {
          type: 'object',
          required: [
            'data',
            'agentOutputs',
            'sharedContext',
            'intermediateResults',
            'executionTrace',
          ],
          properties: {
            data: { type: 'object' },
            agentOutputs: { type: 'object' },
            sharedContext: { type: 'object' },
            intermediateResults: { type: 'array' },
            executionTrace: { type: 'array' },
          },
        },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'agentId',
              'agentName',
              'status',
              'progress',
              'retryCount',
            ],
            properties: {
              id: { type: 'string' },
              agentId: { type: 'string' },
              agentName: { type: 'string' },
              status: {
                enum: ['pending', 'running', 'completed', 'failed', 'retrying'],
              },
              progress: { type: 'number', minimum: 0, maximum: 100 },
              retryCount: { type: 'number', minimum: 0 },
            },
          },
        },
        metadata: {
          type: 'object',
          required: ['startedAt'],
          properties: {
            startedAt: { type: 'string' },
            completedAt: { type: 'string' },
            totalDuration: { type: 'number', minimum: 0 },
            tokensUsed: { type: 'number', minimum: 0 },
            cost: { type: 'number', minimum: 0 },
          },
        },
      },
    };

    const valid = this.ajv.validate(schema, execution);
    if (!valid) {
      const errors =
        this.ajv.errors?.map(
          (error) => `${error.instancePath}: ${error.message}`
        ) || [];
      return { valid: false, errors };
    }
    return { valid: true };
  }

  validateAgentTemplate(template: any): { valid: boolean; errors?: string[] } {
    const schema = {
      type: 'object',
      required: [
        'id',
        'name',
        'description',
        'role',
        'systemPrompt',
        'enabledTools',
        'tags',
        'category',
      ],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        role: { enum: ['main', 'sub', 'synthesis'] },
        systemPrompt: { type: 'string', minLength: 10 },
        enabledTools: {
          type: 'array',
          items: { type: 'string' },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        category: { type: 'string', minLength: 1 },
      },
    };

    const valid = this.ajv.validate(schema, template);
    if (!valid) {
      const errors =
        this.ajv.errors?.map(
          (error) => `${error.instancePath}: ${error.message}`
        ) || [];
      return { valid: false, errors };
    }
    return { valid: true };
  }
}
