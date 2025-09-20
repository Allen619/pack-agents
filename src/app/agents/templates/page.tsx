'use client';

import { Button, Alert, Empty, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { AgentTemplateSelector } from '@/components/agents/AgentTemplateSelector';
import { useAgents } from '@/hooks/useAgents';

export default function AgentTemplatesPage() {
  const { 
    templates, 
    loading, 
    error, 
    createFromTemplate, 
    refreshTemplates 
  } = useAgents();

  const handleSelectTemplate = async (templateId: string, overrides?: any) => {
    await createFromTemplate(templateId, overrides);
  };

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader
          title="Agent 模板"
          description="从预制模板快速创建 Agent"
          extra={
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={refreshTemplates}
                loading={loading}
              >
                刷新
              </Button>
              <Link href="/agents/create">
                <Button type="primary" icon={<PlusOutlined />}>
                  自定义创建
                </Button>
              </Link>
            </Space>
          }
        />

        {error && (
          <Alert
            message="加载失败"
            description={error}
            type="error"
            action={
              <Button size="small" onClick={refreshTemplates}>
                重试
              </Button>
            }
            className="mb-4"
            closable
          />
        )}

        <LoadingState loading={loading}>
          {templates.length === 0 ? (
            <div className="bg-white rounded-lg border p-8">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="没有可用的 Agent 模板"
              >
                <Link href="/agents/create">
                  <Button type="primary">自定义创建 Agent</Button>
                </Link>
              </Empty>
            </div>
          ) : (
            <AgentTemplateSelector
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
              loading={loading}
            />
          )}
        </LoadingState>
      </div>
    </AppLayout>
  );
}
