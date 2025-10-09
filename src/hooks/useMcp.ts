// MCP 管理 Hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ApiResponse,
  MCPServerDefinition,
  MCPServerInput,
} from '@/lib/types';

interface UseMcpReturn {
  servers: MCPServerDefinition[];
  loading: boolean;
  error: string | null;
  createServer: (input: MCPServerInput) => Promise<MCPServerDefinition>;
  updateServer: (
    id: string,
    updates: Partial<MCPServerInput>
  ) => Promise<MCPServerDefinition>;
  deleteServer: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const MCP_QUERY_KEY = ['mcp-servers'];

export function useMcp(): UseMcpReturn {
  const queryClient = useQueryClient();

  const {
    data: servers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: MCP_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/mcp');
      if (!response.ok) {
        throw new Error('无法获取 MCP 列表');
      }

      const result: ApiResponse<MCPServerDefinition[]> = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'MCP 列表请求失败');
      }

      return result.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (
      input: MCPServerInput
    ): Promise<MCPServerDefinition> => {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('创建 MCP 失败');
      }

      const result: ApiResponse<MCPServerDefinition> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '创建 MCP 失败');
      }

      return result.data;
    },
    onSuccess: (server) => {
      message.success(`MCP “${server.name}” 创建成功`);
      queryClient.invalidateQueries({ queryKey: MCP_QUERY_KEY });
    },
    onError: (err: Error) => {
      message.error(`创建 MCP 失败：${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<MCPServerInput>;
    }): Promise<MCPServerDefinition> => {
      const response = await fetch(`/api/mcp/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('更新 MCP 失败');
      }

      const result: ApiResponse<MCPServerDefinition> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '更新 MCP 失败');
      }

      return result.data;
    },
    onSuccess: (server) => {
      message.success(`MCP “${server.name}” 已更新`);
      queryClient.invalidateQueries({ queryKey: MCP_QUERY_KEY });
    },
    onError: (err: Error) => {
      message.error(`更新 MCP 失败：${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      const response = await fetch(`/api/mcp/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除 MCP 失败');
      }

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || '删除 MCP 失败');
      }

      return true;
    },
    onSuccess: () => {
      message.success('MCP 删除成功');
      queryClient.invalidateQueries({ queryKey: MCP_QUERY_KEY });
    },
    onError: (err: Error) => {
      message.error(`删除 MCP 失败：${err.message}`);
    },
  });

  return {
    servers,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    createServer: (input) => createMutation.mutateAsync(input),
    updateServer: (id, updates) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteServer: (id) => deleteMutation.mutateAsync(id),
    refresh: () => refetch(),
  };
}
