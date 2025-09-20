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
    
    // Ensure ID matches
    body.id = params.id;
    
    // Validate workflow configuration
    const validationResult = validator.validateWorkflow(body);
    if (!validationResult.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid workflow configuration',
          details: validationResult.errors
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Load existing workflow to preserve creation date
    try {
      const existingWorkflow = await configManager.loadWorkflow(params.id);
      body.metadata = {
        ...body.metadata,
        createdAt: existingWorkflow.metadata.createdAt,
        updatedAt: new Date().toISOString()
      };
    } catch {
      // Workflow doesn't exist, treat as new
      const now = new Date().toISOString();
      body.metadata = {
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        executionCount: 0,
        ...body.metadata
      };
    }

    // Validate that all agent IDs exist
    if (body.agentIds && body.agentIds.length > 0) {
      for (const agentId of body.agentIds) {
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

    // Validate main agent ID
    if (body.mainAgentId && !body.agentIds.includes(body.mainAgentId)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_MAIN_AGENT',
          message: 'Main agent must be included in the agent list'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Save updated workflow
    await configManager.saveWorkflow(body);

    logger.info('Workflow updated successfully', { 
      workflowId: params.id, 
      name: body.name,
      agentCount: body.agentIds.length 
    });

    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: body
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
