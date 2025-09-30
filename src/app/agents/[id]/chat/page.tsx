'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { LoadingSpinner } from '@/lib/utils/lazy-loading';
import AppLayout from '@/components/layout/AppLayout';
import { AgentChatInterface } from '@/components/agents/AgentChatInterface';
import { AgentConfig, ApiResponse } from '@/types';

interface AgentChatPageProps {
  params: {
    id: string;
  };
}

export default function AgentChatPage({ params }: AgentChatPageProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
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
          message.error('Agent 不存在');
          router.push('/agents');
        }
      } catch (err) {
        setError('网络请求失败');
        message.error('加载失败');
        console.error('Fetch agent error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [params.id, router]);

  const handleOpenSettings = () => {
    router.push(`/agents/${params.id}/edit`);
  };

  const handleBack = () => {
    router.push('/agents');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <LoadingSpinner size="large" tip="加载 Agent 信息..." />
        </div>
      </AppLayout>
    );
  }

  if (error || !agent) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">{error || 'Agent 不存在'}</div>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              返回 Agent 列表
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full p-6">
        <AgentChatInterface
          agent={agent}
          onBack={handleBack}
          onOpenSettings={handleOpenSettings}
        />
      </div>
    </AppLayout>
  );
}
