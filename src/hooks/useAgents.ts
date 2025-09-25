// Agent 管理 Hook
import { useState, useEffect, useCallback } from 'react';
import { AgentConfig, AgentTemplate, ApiResponse } from '@/types';

export interface UseAgentsReturn {
  agents: AgentConfig[];
  templates: AgentTemplate[];
  loading: boolean;
  error: string | null;
  createAgent: (agentData: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  createFromTemplate: (templateId: string, overrides?: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  refreshAgents: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/agents', { cache: 'no-store' });
      const result: ApiResponse<AgentConfig[]> = await response.json();

      if (result.success) {
        setAgents(result.data || []);
      } else {
        setError(result.error?.message || '获取 Agent 列表失败');
      }
    } catch (err) {
      setError('网络请求失败');
      console.error('Fetch agents error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/agents/templates', { cache: 'no-store' });
      const result: ApiResponse<AgentTemplate[]> = await response.json();

      if (result.success) {
        setTemplates(result.data || []);
      } else {
        console.error('获取模板失败:', result.error?.message);
      }
    } catch (err) {
      console.error('Fetch templates error:', err);
    }
  }, []);

  const createAgent = useCallback(
    async (agentData: Partial<AgentConfig>): Promise<AgentConfig | null> => {
      try {
        setError(null);

        const response = await fetch('/api/agents', {
          cache: 'no-store',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData),
        });

        const result: ApiResponse<AgentConfig> = await response.json();

        if (result.success && result.data) {
          await refreshAgents();
          return result.data;
        } else {
          setError(result.error?.message || '创建 Agent 失败');
          return null;
        }
      } catch (err) {
        setError('网络请求失败');
        console.error('Create agent error:', err);
        return null;
      }
    },
    [refreshAgents]
  );

  const updateAgent = useCallback(
    async (id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> => {
      try {
        setError(null);

        const response = await fetch(`/api/agents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const result: ApiResponse<AgentConfig> = await response.json();

        if (result.success && result.data) {
          setAgents((prev) => prev.map((agent) => (agent.id === id ? result.data! : agent)));
          return result.data;
        } else {
          setError(result.error?.message || '更新 Agent 失败');
          return null;
        }
      } catch (err) {
        setError('网络请求失败');
        console.error('Update agent error:', err);
        return null;
      }
    },
    []
  );

  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        setAgents((prev) => prev.filter((agent) => agent.id !== id));
        return true;
      } else {
        setError(result.error?.message || '删除 Agent 失败');
        return false;
      }
    } catch (err) {
      setError('网络请求失败');
      console.error('Delete agent error:', err);
      return false;
    }
  }, []);

  const createFromTemplate = useCallback(
    async (templateId: string, overrides?: Partial<AgentConfig>): Promise<AgentConfig | null> => {
      try {
        setError(null);

        const response = await fetch('/api/agents/templates', {
          cache: 'no-store',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, overrides }),
        });

        const result: ApiResponse<AgentConfig> = await response.json();

        if (result.success && result.data) {
          await refreshAgents();
          return result.data;
        } else {
          setError(result.error?.message || '从模板创建 Agent 失败');
          return null;
        }
      } catch (err) {
        setError('网络请求失败');
        console.error('Create from template error:', err);
        return null;
      }
    },
    [refreshAgents]
  );

  useEffect(() => {
    refreshAgents();
    refreshTemplates();
  }, [refreshAgents, refreshTemplates]);

  return {
    agents,
    templates,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    createFromTemplate,
    refreshAgents,
    refreshTemplates,
  };
}
