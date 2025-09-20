import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ApiResponse, WorkflowConfig } from '@/lib/types';
import { logger } from '@/lib/logging/logger';

const configManager = new ConfigManager();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { mainAgentId }: { mainAgentId: string } = await request.json();
    
    if (!mainAgentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'MISSING_MAIN_AGENT_ID',
          message: 'Main agent ID must be provided'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Load the workflow
    const workflow = await configManager.loadWorkflow(params.id);
    
    // Validate that the agent is part of the workflow
    if (!workflow.agentIds.includes(mainAgentId)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'AGENT_NOT_IN_WORKFLOW',
          message: 'Main agent must be part of the workflow'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate that the agent exists
    try {
      await configManager.loadAgent(mainAgentId);
    } catch {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${mainAgentId} not found`
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update main agent
    workflow.mainAgentId = mainAgentId;
    workflow.metadata.updatedAt = new Date().toISOString();

    // Save updated workflow
    await configManager.saveWorkflow(workflow);

    logger.info('Main agent updated for workflow', { 
      workflowId: params.id, 
      mainAgentId: mainAgentId
    });

    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: workflow
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to set main agent for workflow', { workflowId: params.id, error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_MAIN_AGENT_ERROR',
        message: 'Failed to set main agent for workflow'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}
