import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ConfigValidator } from '@/lib/storage/validation';
import { ApiResponse, WorkflowConfig } from '@/lib/types';
import { logger } from '@/lib/logging/logger';

const configManager = new ConfigManager();
const validator = new ConfigValidator();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = await configManager.loadWorkflow(params.id);
    
    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: workflow
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to load workflow', { workflowId: params.id, error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_NOT_FOUND',
        message: `Workflow with ID ${params.id} not found`
      }
    };
    return NextResponse.json(response, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // 装载现有工作流，用于与传入的部分更新进行合并
    let existingWorkflow: WorkflowConfig | null = null;
    try {
      existingWorkflow = await configManager.loadWorkflow(params.id);
    } catch {
      existingWorkflow = null;
    }

    // 确保 ID 一致
    const incoming: Partial<WorkflowConfig> = { ...body, id: params.id };

    // 执行深度合并（顶层 + 常用嵌套字段）以支持部分更新
    const merged: WorkflowConfig = existingWorkflow
      ? {
          ...existingWorkflow,
          ...incoming,
          executionFlow: {
            ...(existingWorkflow.executionFlow || { stages: [], dependencies: [] }),
            ...(incoming.executionFlow || {}),
          },
          configuration: {
            ...(existingWorkflow.configuration || {
              maxExecutionTime: 300000,
              autoRetry: false,
              notifications: false,
            }),
            ...(incoming.configuration || {}),
          },
          metadata: {
            ...existingWorkflow.metadata,
            ...(incoming.metadata || {}),
            updatedAt: new Date().toISOString(),
            createdAt: existingWorkflow.metadata.createdAt,
          },
          agentIds: incoming.agentIds ?? existingWorkflow.agentIds,
          mainAgentId: incoming.mainAgentId ?? existingWorkflow.mainAgentId,
        }
      : {
          // 若不存在则创建新对象（允许部分字段缺省）
          id: params.id,
          name: (incoming as any).name || '',
          description: (incoming as any).description || '',
          agentIds: incoming.agentIds || [],
          mainAgentId: incoming.mainAgentId || '',
          executionFlow: incoming.executionFlow || { stages: [], dependencies: [] },
          configuration:
            incoming.configuration ||
            ({ maxExecutionTime: 300000, autoRetry: false, notifications: false } as any),
          metadata: {
            version: (incoming.metadata as any)?.version || '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastExecuted: (incoming.metadata as any)?.lastExecuted,
            executionCount: (incoming.metadata as any)?.executionCount || 0,
          },
        };

    // 单位兼容：若 maxExecutionTime < 1000，按“秒”转为“毫秒”
    if (
      merged?.configuration?.maxExecutionTime !== undefined &&
      typeof merged.configuration.maxExecutionTime === 'number' &&
      merged.configuration.maxExecutionTime < 1000
    ) {
      merged.configuration.maxExecutionTime = Math.floor(
        merged.configuration.maxExecutionTime * 1000
      );
    }

    // 校验合并后的结果
    const validationResult = validator.validateWorkflow(merged);
    if (!validationResult.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid workflow configuration',
          details: validationResult.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 校验 Agent 是否存在（基于合并后结果）
    if (merged.agentIds && merged.agentIds.length > 0) {
      for (const agentId of merged.agentIds) {
        try {
          await configManager.loadAgent(agentId);
        } catch {
          const response: ApiResponse<null> = {
            success: false,
            error: {
              code: 'AGENT_NOT_FOUND',
              message: `Agent with ID ${agentId} not found`
            }
          };
          return NextResponse.json(response, { status: 400 });
        }
      }
    }

    // 校验主 Agent ID 是否包含在 agentIds 中
    if (merged.mainAgentId && !merged.agentIds.includes(merged.mainAgentId)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_MAIN_AGENT',
          message: 'Main agent must be included in the agent list'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 保存更新后的工作流
    await configManager.saveWorkflow(merged);

    logger.info('Workflow updated successfully', { 
      workflowId: params.id, 
      name: merged.name,
      agentCount: merged.agentIds.length 
    });

    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: merged
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to update workflow', { workflowId: params.id, error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_UPDATE_ERROR',
        message: 'Failed to update workflow'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if workflow has any active executions
    const activeExecutions = await configManager.listActiveExecutions();
    const hasActiveExecution = activeExecutions.some(exec => exec.workflowId === params.id);
    
    if (hasActiveExecution) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'WORKFLOW_IN_USE',
          message: 'Cannot delete workflow with active executions'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    await configManager.deleteWorkflow(params.id);

    logger.info('Workflow deleted successfully', { workflowId: params.id });

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to delete workflow', { workflowId: params.id, error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_DELETE_ERROR',
        message: 'Failed to delete workflow'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}
