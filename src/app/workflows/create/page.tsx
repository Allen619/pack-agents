'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { WorkflowConfigForm } from '@/components/workflows/WorkflowConfigForm';
import { useWorkflows } from '@/hooks/useWorkflows';
import { PageHeader, ErrorBoundary } from '@/components';
import { WorkflowConfig } from '@/lib/types';

export default function CreateWorkflowPage() {
  const router = useRouter();
  const { createWorkflow, isCreating } = useWorkflows();

  const handleSubmit = async (workflowData: WorkflowConfig) => {
    try {
      await createWorkflow(workflowData);
      router.push('/workflows');
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCancel = () => {
    router.push('/workflows');
  };

  return (
    <AppLayout>
      <ErrorBoundary>
        <div className="create-workflow-page py-8">
          <div className="max-w-4xl mx-auto px-6">
            <PageHeader
              title="创建新工作流"
              description="配置工作流的基本信息，创建后可以添加 Agent 团队并设计执行流程"
              onBack={() => router.back()}
            />

            <div className="mt-6">
              <WorkflowConfigForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                loading={isCreating}
              />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
