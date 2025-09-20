import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ApiResponse, WorkflowConfig } from '@/lib/types';
import { logger } from '@/lib/logging/logger';

const configManager = new ConfigManager();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { agentIds }: { agentIds: string[] } = await request.json();
    
    if (!agentIds || !Array.isArray(agentIds)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_AGENT_IDS',
          message: 'Agent IDs must be provided as an array'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Load the workflow
    const workflow = await configManager.loadWorkflow(params.id);
    
    // Validate that all agent IDs exist
    for (const agentId of agentIds) {
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

    // Add new agents (avoid duplicates)
    const currentAgentIds = new Set(workflow.agentIds);
    agentIds.forEach(id => currentAgentIds.add(id));
    workflow.agentIds = Array.from(currentAgentIds);

    // Update metadata
    workflow.metadata.updatedAt = new Date().toISOString();

    // Save updated workflow
    await configManager.saveWorkflow(workflow);

    logger.info('Agents added to workflow', { 
      workflowId: params.id, 
      addedAgents: agentIds,
      totalAgents: workflow.agentIds.length 
    });

    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: workflow
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to add agents to workflow', { workflowId: params.id, error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_AGENT_ADD_ERROR',
        message: 'Failed to add agents to workflow'
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
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'MISSING_AGENT_ID',
          message: 'Agent ID must be provided'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Load the workflow
    const workflow = await configManager.loadWorkflow(params.id);
    
    // Check if agent is in the workflow
    if (!workflow.agentIds.includes(agentId)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'AGENT_NOT_IN_WORKFLOW',
          message: 'Agent is not part of this workflow'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if removing main agent
    if (workflow.mainAgentId === agentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'CANNOT_REMOVE_MAIN_AGENT',
          message: 'Cannot remove the main agent. Please designate a new main agent first.'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Remove agent from workflow
    workflow.agentIds = workflow.agentIds.filter(id => id !== agentId);

    // Update metadata
    workflow.metadata.updatedAt = new Date().toISOString();

    // Save updated workflow
    await configManager.saveWorkflow(workflow);

    logger.info('Agent removed from workflow', { 
      workflowId: params.id, 
      removedAgent: agentId,
      remainingAgents: workflow.agentIds.length 
    });

    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: workflow
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to remove agent from workflow', { workflowId: params.id, error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_AGENT_REMOVE_ERROR',
        message: 'Failed to remove agent from workflow'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}
