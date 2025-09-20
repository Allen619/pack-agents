'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, message } from 'antd';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { AgentConfigForm } from '@/components/agents/AgentConfigForm';
import { useAgents } from '@/hooks/useAgents';
import { AgentConfig } from '@/types';

export default function CreateAgentPage() {
  const router = useRouter();
  const { createAgent } = useAgents();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: Partial<AgentConfig>) => {
    try {
      setLoading(true);
      const newAgent = await createAgent(values);
      
      if (newAgent) {
        message.success('Agent 创建成功');
        router.push('/agents');
      }
    } catch (error) {
      message.error('创建失败');
      console.error('Create agent error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader
          title="创建 Agent"
          description="配置一个新的 AI Agent"
        />

        <Card>
          <AgentConfigForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
