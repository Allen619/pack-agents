import { useState } from 'react';
import { Tabs, Card, Space, Button, Typography } from 'antd';
import { 
  ApartmentOutlined, 
  TableOutlined, 
  AppstoreOutlined,
  FullscreenOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
  BookOutlined
} from '@ant-design/icons';
import { FlowCanvas } from './FlowCanvas';
import { EnhancedFlowCanvasWrapper } from './EnhancedFlowCanvas';
import { SwimlaneView } from './SwimlaneView';
import { KanbanView } from './KanbanView';
import { WorkflowValidationPanel } from './WorkflowValidationPanel';
import { ExecutionPlanPreview } from './ExecutionPlanPreview';
import { DependencyEditor } from './DependencyEditor';
import { WorkflowTemplateGallery } from './WorkflowTemplateGallery';
import { WorkflowTemplateManager } from '@/lib/workflow/templates';
import { useAgents } from '@/hooks/useAgents';
import { WorkflowConfig } from '@/lib/types';
import { Node, Edge } from '@xyflow/react';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface FlowCanvasEditorProps {
  workflow: WorkflowConfig;
  onUpdate: (updates: Partial<WorkflowConfig>) => void;
  readonly?: boolean;
  className?: string;
}

export function FlowCanvasEditor({ 
  workflow, 
  onUpdate, 
  readonly = false, 
  className 
}: FlowCanvasEditorProps) {
  const { agents } = useAgents();
  const [activeTab, setActiveTab] = useState('canvas');

  const handleFlowSave = (flow: { nodes: Node[]; edges: Edge[] }) => {
    // TODO: Convert React Flow data back to workflow execution flow
    console.log('Saving flow:', flow);
    
    // For now, just trigger a mock update
    onUpdate({
      metadata: {
        ...workflow.metadata,
        updatedAt: new Date().toISOString()
      }
    });
  };

  const handleAddStage = () => {
    // TODO: Implement stage creation
    console.log('Adding new stage');
  };

  const handleEditStage = (stage: any) => {
    // TODO: Implement stage editing
    console.log('Editing stage:', stage);
  };

  const handleDeleteStage = (stageId: string) => {
    // TODO: Implement stage deletion
    console.log('Deleting stage:', stageId);
  };

  return (
    <div className={`flow-canvas-editor ${className}`}>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <Title level={4} className="!mb-1">
              执行流程编排
            </Title>
            <Text type="secondary">
              可视化设计工作流的执行流程，支持多种视图模式
            </Text>
          </div>
          
          <Space>
            <Button
              icon={<FullscreenOutlined />}
              onClick={() => {
                // TODO: Implement fullscreen mode
                console.log('Entering fullscreen mode');
              }}
            >
              全屏编辑
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="h-full">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          className="h-full"
        >
          <TabPane
            tab={
              <Space>
                <ApartmentOutlined />
                流程画布
              </Space>
            }
            key="canvas"
            className="h-full"
          >
            <div className="h-96">
              <EnhancedFlowCanvasWrapper
                workflow={workflow}
                agents={agents}
                onSave={onUpdate}
                readonly={readonly}
                className="h-full"
              />
            </div>
          </TabPane>

          <TabPane
            tab={
              <Space>
                <TableOutlined />
                泳道视图
              </Space>
            }
            key="swimlane"
          >
            <SwimlaneView
              workflow={workflow}
              agents={agents}
              onEditStage={handleEditStage}
              onAddStage={handleAddStage}
              readonly={readonly}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <AppstoreOutlined />
                看板视图
              </Space>
            }
            key="kanban"
          >
            <KanbanView
              workflow={workflow}
              agents={agents}
              onEditStage={handleEditStage}
              onDeleteStage={handleDeleteStage}
              onAddStage={handleAddStage}
              readonly={readonly}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <CheckCircleOutlined />
                工作流验证
              </Space>
            }
            key="validation"
          >
            <WorkflowValidationPanel
              workflow={workflow}
              agents={agents}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <PlayCircleOutlined />
                执行计划
              </Space>
            }
            key="execution-plan"
          >
            <ExecutionPlanPreview
              workflow={workflow}
              agents={agents}
              onExecute={() => {
                // TODO: Implement execution functionality
                console.log('Starting workflow execution...');
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <InfoCircleOutlined />
                依赖管理
              </Space>
            }
            key="dependencies"
          >
            <DependencyEditor
              workflow={workflow}
              onUpdate={onUpdate}
              readonly={readonly}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <BookOutlined />
                模板库
              </Space>
            }
            key="templates"
          >
            <WorkflowTemplateGallery
              onApplyTemplate={(template, options) => {
                const newWorkflow = WorkflowTemplateManager.applyTemplate(template, options);
                onUpdate(newWorkflow);
              }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
