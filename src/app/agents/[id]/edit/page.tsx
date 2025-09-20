'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/agents/${params.id}`);
        const result: ApiResponse<AgentConfig> = await response.json();

        if (result.success && result.data) {
          setAgent(result.data);
        } else {
          setError(result.error?.message || 'Agent 不存在');
        }
      } catch (err) {
        setError('网络请求失败');
        console.error('Fetch agent error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [params.id]);

  const handleSubmit = async (values: Partial<AgentConfig>) => {
    if (!agent) return;

    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/agents/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      const result: ApiResponse<AgentConfig> = await response.json();
      
      if (result.success) {
        message.success('Agent 更新成功');
        router.push('/agents');
      } else {
        message.error(result.error?.message || '更新失败');
      }
    } catch (error) {
      message.error('网络请求失败');
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
          <div className="flex items-center justify-center py-20">
            <Spin size="large" tip="加载 Agent 信息..." />
          </div>
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
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                返回
              </button>
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
