'use client';

import { useRouter } from 'next/navigation';
import { Tabs, Card } from 'antd';
import { LoadingSpinner } from '@/lib/utils/lazy-loading';
import { WorkflowConfigForm } from '@/components/workflows/WorkflowConfigForm';
import { AgentTeamAssembly } from '@/components/workflows/AgentTeamAssembly';
import { FlowCanvasEditor } from '@/components/workflows/FlowCanvasEditor';
import { useWorkflow, useWorkflows } from '@/hooks/useWorkflows';
import { PageHeader, ErrorBoundary } from '@/components';
import { WorkflowConfig } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';

const { TabPane } = Tabs;

export default function EditWorkflowPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { workflow, isLoading, error } = useWorkflow(params.id);
  const { updateWorkflow, isUpdating } = useWorkflows();

  const handleUpdateBasicInfo = async (workflowData: WorkflowConfig) => {
    try {
      await updateWorkflow({ 
        id: params.id, 
        updates: {
          name: workflowData.name,
          description: workflowData.description,
          configuration: workflowData.configuration
        }
      });
      // Stay on edit page to continue editing
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleUpdateTeam = async (updates: Partial<WorkflowConfig>) => {
    try {
      await updateWorkflow({ id: params.id, updates });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCancel = () => {
    router.push('/workflows');
  };

  if (error) {
    return (
      <AppLayout>
        <ErrorBoundary>
          <div className="edit-workflow-page min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-6">
              <PageHeader
                title="编辑工作流"
                description="工作流不存在或加载失败"
                onBack={() => router.back()}
              />
              <Card className="mt-6">
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">无法加载工作流信息</p>
                  <p className="text-gray-500">请检查工作流 ID 是否正确，或返回工作流列表。</p>
                </div>
              </Card>
            </div>
          </div>
        </ErrorBoundary>
      </AppLayout>
    );
  }

  if (isLoading || !workflow) {
    return (
      <AppLayout>
        <ErrorBoundary>
          <div className="edit-workflow-page min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-6">
              <PageHeader
                title="编辑工作流"
                description="加载工作流信息中..."
                onBack={() => router.back()}
              />
                <Card className="mt-6">
                  <LoadingSpinner size="large" />
                </Card>
            </div>
          </div>
        </ErrorBoundary>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        <div className="edit-workflow-page min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-6">
            <PageHeader
              title={`编辑工作流: ${workflow.name}`}
              description="修改工作流配置，管理 Agent 团队和执行流程"
              onBack={() => router.back()}
            />

          <div className="mt-6">
            <Tabs defaultActiveKey="basic" size="large">
              <TabPane tab="基本信息" key="basic">
                <WorkflowConfigForm
                  initialValues={workflow}
                  onSubmit={handleUpdateBasicInfo}
                  onCancel={handleCancel}
                  loading={isUpdating}
                />
              </TabPane>

              <TabPane tab="Agent 团队" key="team">
                <div className="max-w-4xl mx-auto">
                  <AgentTeamAssembly
                    workflow={workflow}
                    onUpdate={handleUpdateTeam}
                  />
                </div>
              </TabPane>

              <TabPane tab="执行流程" key="flow">
                <div className="max-w-full">
                  <FlowCanvasEditor
                    workflow={workflow}
                    onUpdate={handleUpdateTeam}
                  />
                </div>
              </TabPane>
            </Tabs>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
