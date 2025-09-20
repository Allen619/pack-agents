import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/storage/config-manager';
import { ConfigValidator } from '@/lib/storage/validation';
import { ApiResponse, WorkflowConfig } from '@/lib/types';
import { generateId, getPagination } from '@/lib/utils';
import { logger } from '@/lib/logging/logger';

const configManager = new ConfigManager();
const validator = new ConfigValidator();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    // List all workflows
    const allWorkflows = await configManager.listWorkflows();
    
    // Apply filters
    let filteredWorkflows = allWorkflows;
    
    if (search) {
      filteredWorkflows = filteredWorkflows.filter(workflow => 
        workflow.name.toLowerCase().includes(search.toLowerCase()) ||
        workflow.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status) {
      // Filter by workflow status based on metadata
      filteredWorkflows = filteredWorkflows.filter(workflow => {
        if (status === 'active') return workflow.metadata.lastExecuted;
        if (status === 'inactive') return !workflow.metadata.lastExecuted;
        return true;
      });
    }

    // Apply pagination
    const { items, ...pagination } = getPagination(filteredWorkflows, page, pageSize);

    const response: ApiResponse<{
      workflows: WorkflowConfig[];
      pagination: typeof pagination;
    }> = {
      success: true,
      data: {
        workflows: items,
        pagination
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to list workflows', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_LIST_ERROR',
        message: 'Failed to list workflows'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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

    // Generate ID if not provided
    if (!body.id) {
      body.id = generateId('workflow');
    }

    // Set metadata
    const now = new Date().toISOString();
    body.metadata = {
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
      ...body.metadata
    };

    // Initialize execution flow if not provided
    if (!body.executionFlow) {
      body.executionFlow = {
        stages: [],
        dependencies: []
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

    // Save workflow
    await configManager.saveWorkflow(body);

    logger.info('Workflow created successfully', { 
      workflowId: body.id, 
      name: body.name,
      agentCount: body.agentIds.length 
    });

    const response: ApiResponse<WorkflowConfig> = {
      success: true,
      data: body
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error('Failed to create workflow', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'WORKFLOW_CREATE_ERROR',
        message: 'Failed to create workflow'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}
