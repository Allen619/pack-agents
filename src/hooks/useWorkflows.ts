import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { WorkflowConfig, ApiResponse } from '@/lib/types';

export function useWorkflows() {
  const queryClient = useQueryClient();

  // List workflows
  const {
    data: workflowsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const result: ApiResponse<{
        workflows: WorkflowConfig[];
        pagination: any;
      }> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch workflows');
      }
      
      return result.data;
    }
  });

  // Create workflow
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Partial<WorkflowConfig>) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create workflow');
      }

      const result: ApiResponse<WorkflowConfig> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create workflow');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.setQueryData(['workflow', data.id], data);
      message.success(`工作流 "${data.name}" 创建成功！`);
    },
    onError: (error: Error) => {
      message.error(`创建工作流失败：${error.message}`);
    }
  });

  // Update workflow
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkflowConfig> }) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update workflow');
      }

      const result: ApiResponse<WorkflowConfig> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update workflow');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.setQueryData(['workflow', data.id], data);
      message.success(`工作流 "${data.name}" 更新成功！`);
    },
    onError: (error: Error) => {
      message.error(`更新工作流失败：${error.message}`);
    }
  });

  // Delete workflow
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete workflow');
      }

      const result: ApiResponse<null> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete workflow');
      }

      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.removeQueries({ queryKey: ['workflow', deletedId] });
      message.success('工作流删除成功！');
    },
    onError: (error: Error) => {
      message.error(`删除工作流失败：${error.message}`);
    }
  });

  // Add agents to workflow
  const addAgentsToWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId, agentIds }: { workflowId: string; agentIds: string[] }) => {
      const response = await fetch(`/api/workflows/${workflowId}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to add agents');
      }

      const result: ApiResponse<WorkflowConfig> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to add agents');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.setQueryData(['workflow', data.id], data);
      message.success('Agent 添加成功！');
    },
    onError: (error: Error) => {
      message.error(`添加 Agent 失败：${error.message}`);
    }
  });

  // Remove agent from workflow
  const removeAgentFromWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId, agentId }: { workflowId: string; agentId: string }) => {
      const response = await fetch(`/api/workflows/${workflowId}/agents?agentId=${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove agent');
      }

      const result: ApiResponse<WorkflowConfig> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to remove agent');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.setQueryData(['workflow', data.id], data);
      message.success('Agent 移除成功！');
    },
    onError: (error: Error) => {
      message.error(`移除 Agent 失败：${error.message}`);
    }
  });

  // Set main agent
  const setMainAgentMutation = useMutation({
    mutationFn: async ({ workflowId, mainAgentId }: { workflowId: string; mainAgentId: string }) => {
      const response = await fetch(`/api/workflows/${workflowId}/main-agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mainAgentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to set main agent');
      }

      const result: ApiResponse<WorkflowConfig> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to set main agent');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.setQueryData(['workflow', data.id], data);
      message.success('主 Agent 设置成功！');
    },
    onError: (error: Error) => {
      message.error(`设置主 Agent 失败：${error.message}`);
    }
  });

  return {
    // Data
    workflows: workflowsData?.workflows || [],
    pagination: workflowsData?.pagination,
    
    // Loading states
    isLoading,
    isCreating: createWorkflowMutation.isPending,
    isUpdating: updateWorkflowMutation.isPending,
    isDeleting: deleteWorkflowMutation.isPending,
    
    // Error states
    error,
    
    // Actions
    refetch,
    createWorkflow: createWorkflowMutation.mutate,
    updateWorkflow: updateWorkflowMutation.mutate,
    deleteWorkflow: deleteWorkflowMutation.mutate,
    addAgentsToWorkflow: addAgentsToWorkflowMutation.mutate,
    removeAgentFromWorkflow: removeAgentFromWorkflowMutation.mutate,
    setMainAgent: setMainAgentMutation.mutate
  };
}

export function useWorkflow(id: string) {
  const queryClient = useQueryClient();

  const {
    data: workflow,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow');
      }
      const result: ApiResponse<WorkflowConfig> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch workflow');
      }
      
      return result.data;
    },
    enabled: !!id
  });

  return {
    workflow,
    isLoading,
    error,
    refetch
  };
}
