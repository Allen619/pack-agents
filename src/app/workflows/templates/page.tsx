'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { WorkflowTemplateGallery } from '@/components/workflows/WorkflowTemplateGallery';
import { WorkflowTemplateManager } from '@/lib/workflow/templates';
import { useWorkflows } from '@/hooks/useWorkflows';
import { PageHeader, ErrorBoundary } from '@/components';
import { message } from 'antd';

export default function WorkflowTemplatesPage() {
  const router = useRouter();
  const { createWorkflow } = useWorkflows();

  const handleApplyTemplate = async (template: any, options: any) => {
    try {
      const workflowData = WorkflowTemplateManager.applyTemplate(template, options);
      
      await createWorkflow(workflowData);
      
      message.success(`基于模板 "${template.name}" 创建工作流成功！`);
      router.push('/workflows');
    } catch (error) {
      console.error('Failed to apply template:', error);
      message.error('应用模板失败，请稍后重试。');
    }
  };

  const handleCreateFromTemplate = (template: any) => {
    // Navigate to create page with template pre-filled
    const searchParams = new URLSearchParams({
      template: template.id
    });
    router.push(`/workflows/create?${searchParams.toString()}`);
  };

  return (
    <AppLayout>
      <ErrorBoundary>
        <div className="workflow-templates-page py-8">
          <div className="max-w-7xl mx-auto px-6">
            <PageHeader
              title="工作流模板库"
              description="快速开始，选择预设模板创建专业的多 Agent 工作流"
              onBack={() => router.back()}
            />

            <div className="mt-6">
              <WorkflowTemplateGallery
                onApplyTemplate={handleApplyTemplate}
                onCreateFromTemplate={handleCreateFromTemplate}
              />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
