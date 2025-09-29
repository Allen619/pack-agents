// Agent 管理 Hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { AgentConfig, AgentTemplate, ApiResponse } from '@/types';

export interface UseAgentsReturn {
  agents: AgentConfig[];
  templates: AgentTemplate[];
  agentsLoading: boolean;
  templatesLoading: boolean;
  error: string | null;
  createAgent: (agentData: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  createFromTemplate: (templateId: string, overrides?: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  refreshAgents: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

export function useAgents(): UseAgentsReturn {
  const queryClient = useQueryClient();

  // 获取 Agent 列表
  const {
    data: agents = [],
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refreshAgents
  } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const result: ApiResponse<AgentConfig[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch agents');
      }

      return result.data || [];
    }
  });

  // 获取 Agent 模板列表
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refreshTemplates
  } = useQuery({
    queryKey: ['agent-templates'],
    queryFn: async () => {
      const response = await fetch('/api/agents/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch agent templates');
      }
      const result: ApiResponse<AgentTemplate[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch agent templates');
      }

      return result.data || [];
    }
  });

  // 创建 Agent
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: Partial<AgentConfig>): Promise<AgentConfig> => {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      const result: ApiResponse<AgentConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create agent');
      }

      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      message.success(`Agent "${data.name}" 创建成功！`);
    },
    onError: (error: Error) => {
      message.error(`创建 Agent 失败：${error.message}`);
    }
  });

  // 更新 Agent
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgentConfig> }): Promise<AgentConfig> => {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      const result: ApiResponse<AgentConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update agent');
      }

      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.setQueryData(['agent', data.id], data);
      message.success(`Agent "${data.name}" 更新成功！`);
    },
    onError: (error: Error) => {
      message.error(`更新 Agent 失败：${error.message}`);
    }
  });

  // 删除 Agent
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete agent');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      message.success('Agent 删除成功！');
    },
    onError: (error: Error) => {
      message.error(`删除 Agent 失败：${error.message}`);
    }
  });

  // 从模板创建 Agent
  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, overrides }: { templateId: string; overrides?: Partial<AgentConfig> }): Promise<AgentConfig> => {
      const response = await fetch('/api/agents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, overrides }),
      });

      if (!response.ok) {
        throw new Error('Failed to create agent from template');
      }

      const result: ApiResponse<AgentConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create agent from template');
      }

      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      message.success(`从模板创建 Agent "${data.name}" 成功！`);
    },
    onError: (error: Error) => {
      message.error(`从模板创建 Agent 失败：${error.message}`);
    }
  });

  const error = agentsError?.message || templatesError?.message || null;

  return {
    agents,
    templates,
    agentsLoading,
    templatesLoading,
    error,
    createAgent: (agentData) => createAgentMutation.mutateAsync(agentData),
    updateAgent: (id, updates) => updateAgentMutation.mutateAsync({ id, updates }),
    deleteAgent: (id) => deleteAgentMutation.mutateAsync(id).then(() => true).catch(() => false),
    createFromTemplate: (templateId, overrides) => createFromTemplateMutation.mutateAsync({ templateId, overrides }),
    refreshAgents,
    refreshTemplates,
  };
}