import { NextRequest, NextResponse } from 'next/server';
import { ClaudeWorkflowEngine } from '@/lib/claude/core/workflow';
import { ConfigManager } from '@/lib/storage/config-manager';
import { getExecutionStore } from '@/lib/storage/session-store';
import { generateId } from '@/lib/utils';

/**
 * 执行Claude工作流
 * 基于 Claude Code SDK 的多Agent协作执行
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowRequest = await request.json();
    const configManager = new ConfigManager();
    const executionStore = getExecutionStore();

    // 加载工作流配置
    const workflowConfig = await configManager.loadWorkflow(params.id);
    if (!workflowConfig) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found',
          },
        },
        { status: 404 }
      );
    }

    // 验证工作流配置格式
    if (!workflowConfig.mainAgent || !workflowConfig.specialists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_WORKFLOW_CONFIG',
            message: 'Workflow is not configured for Claude Code SDK',
          },
        },
        { status: 400 }
      );
    }

    // 验证必需的Agent是否存在
    const requiredAgentIds = [
      workflowConfig.mainAgent.agentId,
      ...workflowConfig.specialists.map((s) => s.agentId),
    ];

    for (const agentId of requiredAgentIds) {
      const agent = await configManager.loadAgent(agentId);
      if (!agent) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_AGENT',
              message: `Required agent ${agentId} not found`,
            },
          },
          { status: 400 }
        );
      }

      if (!agent.claudeConfig) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_AGENT_CONFIG',
              message: `Agent ${agentId} is not configured for Claude Code SDK`,
            },
          },
          { status: 400 }
        );
      }
    }

    // 创建工作流执行引擎
    const engine = new ClaudeWorkflowEngine(workflowConfig);

    // 执行工作流
    const result = await engine.execute(workflowRequest);

    // 保存执行记录
    const executionRecord = {
      id: result.executionId,
      workflowId: params.id,
      request: workflowRequest,
      result,
      timestamp: new Date().toISOString(),
      status: result.success ? 'completed' : 'failed',
      metadata: result.metadata,
    };

    await executionStore.saveExecutionRecord(executionRecord);

    return NextResponse.json({
      success: true,
      data: {
        executionId: result.executionId,
        workflowId: params.id,
        success: result.success,
        plan: result.plan,
        results: result.results,
        metadata: result.metadata,
        error: result.error,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: result.executionId,
      },
    });
  } catch (error: any) {
    console.error('Workflow execution error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WORKFLOW_EXECUTION_ERROR',
          message: error.message,
          details:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 获取工作流执行状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_EXECUTION_ID',
            message: 'Execution ID is required',
          },
        },
        { status: 400 }
      );
    }

    const executionStore = getExecutionStore();
    const execution = await executionStore.loadExecutionRecord(executionId);

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXECUTION_NOT_FOUND',
            message: 'Execution record not found',
          },
        },
        { status: 404 }
      );
    }

    // 如果是工作流执行，提供更详细的状态信息
    const workflowResult = execution.result;
    let detailedStatus = {
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      timestamp: execution.timestamp,
    };

    if (workflowResult && workflowResult.results) {
      const taskResults = workflowResult.results;
      const totalTasks = Object.keys(taskResults).length;
      const completedTasks = Object.values(taskResults).filter(
        (result: any) => result.success || result.skipped
      ).length;
      const failedTasks = Object.values(taskResults).filter(
        (result: any) => result.error
      ).length;

      detailedStatus = {
        ...detailedStatus,
        progress: {
          totalTasks,
          completedTasks,
          failedTasks,
          percentage:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
        },
        plan: workflowResult.plan,
        taskResults: Object.entries(taskResults).map(
          ([taskId, result]: [string, any]) => ({
            taskId,
            success: result.success,
            skipped: result.skipped,
            error: result.error,
            metadata: result.metadata,
          })
        ),
        metadata: workflowResult.metadata,
      };
    }

    return NextResponse.json({
      success: true,
      data: detailedStatus,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get workflow execution status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_WORKFLOW_STATUS_ERROR',
          message: error.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 控制工作流执行（暂停、恢复、取消）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, executionId, reason } = await request.json();

    if (!executionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_EXECUTION_ID',
            message: 'Execution ID is required',
          },
        },
        { status: 400 }
      );
    }

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be one of: pause, resume, cancel',
          },
        },
        { status: 400 }
      );
    }

    const executionStore = getExecutionStore();
    const execution = await executionStore.loadExecutionRecord(executionId);

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXECUTION_NOT_FOUND',
            message: 'Execution record not found',
          },
        },
        { status: 404 }
      );
    }

    // 更新执行状态
    let newStatus = execution.status;
    switch (action) {
      case 'pause':
        if (execution.status === 'running') {
          newStatus = 'paused';
        }
        break;
      case 'resume':
        if (execution.status === 'paused') {
          newStatus = 'running';
        }
        break;
      case 'cancel':
        if (['running', 'paused', 'pending'].includes(execution.status || '')) {
          newStatus = 'cancelled';
        }
        break;
    }

    // 保存更新后的执行记录
    const updatedExecution = {
      ...execution,
      status: newStatus,
      metadata: {
        ...execution.metadata,
        [`${action}edAt`]: new Date().toISOString(),
        [`${action}Reason`]: reason,
      },
    };

    await executionStore.saveExecutionRecord(updatedExecution);

    return NextResponse.json({
      success: true,
      data: {
        executionId,
        workflowId: params.id,
        action,
        previousStatus: execution.status,
        newStatus,
        reason,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Control workflow execution error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONTROL_WORKFLOW_ERROR',
          message: error.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
