'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, message, Spin } from 'antd';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { AgentConfigForm } from '@/components/agents/AgentConfigForm';
import { AgentConfig, ApiResponse } from '@/types';

interface EditAgentPageProps {
  params: {
    id: string;
  };
}

export default function EditAgentPage({ params }: EditAgentPageProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${params.id}`, {
        headers: {
          'Cache-Control': 'no-cache', // 绕过浏览器缓存获取最新数据
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<AgentConfig> = await response.json();

      if (result.success && result.data) {
        setAgent(result.data);
      } else {
        setError(result.error?.message || 'Agent 不存在');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络请求失败';
      setError(errorMessage);
      console.error('Fetch agent error:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleSubmit = async (values: Partial<AgentConfig>) => {
    if (!agent) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/agents/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<AgentConfig> = await response.json();

      if (result.success) {
        message.success('Agent 更新成功');

        // 立即更新本地状态，避免额外的网络请求
        setAgent(prev => prev ? { ...prev, ...values } : null);

        // 延迟导航，让用户看到成功消息
        setTimeout(() => {
          router.push('/agents');
        }, 500);
      } else {
        message.error(result.error?.message || '更新失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络请求失败';
      message.error(`更新失败: ${errorMessage}`);
      console.error('Update agent error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <PageHeader
            title="编辑 Agent"
            description="正在加载 Agent 配置..."
          />
          <Card>
            <div className="flex items-center justify-center py-20">
              <Spin size="large" tip="加载 Agent 信息..." />
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error || !agent) {
    return (
      <AppLayout>
        <div className="p-6">
          <PageHeader
            title="编辑 Agent"
            description="编辑 Agent 配置"
          />
          <Card>
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">{error || 'Agent 不存在'}</div>
              <div className="space-x-4">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  返回
                </button>
                <button
                  onClick={fetchAgent}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? '重试中...' : '重试'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader
          title={`编辑 Agent - ${agent.name}`}
          description="修改 Agent 配置信息"
        />

        <Card>
          <AgentConfigForm
            agent={agent}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
