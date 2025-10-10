import { useState } from 'react';
import { Tabs, Card, Space, Button, Typography, Modal, Form, Input, Select, InputNumber } from 'antd';
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
import { WorkflowConfig, ExecutionStage } from '@/lib/types';
import { generateId } from '@/lib/utils';
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
  const [stageModalVisible, setStageModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<ExecutionStage | null>(null);
  const [stageForm] = Form.useForm();

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
    const newStage: ExecutionStage = {
      id: generateId('stage'),
      name: '新阶段',
      type: 'sequential',
      tasks: [],
      timeoutMs: 300000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    };

    const updated: WorkflowConfig = {
      ...workflow,
      executionFlow: {
        ...workflow.executionFlow,
        stages: [...workflow.executionFlow.stages, newStage],
        dependencies: workflow.executionFlow.dependencies || [],
      },
      metadata: { ...workflow.metadata, updatedAt: new Date().toISOString() },
    };

    onUpdate(updated);
  };

  // 新建阶段：仅打开配置弹窗，不直接保存
  const openCreateStageModal = () => {
    setEditingStage(null);
    stageForm.setFieldsValue({
      name: '新阶段',
      type: 'sequential',
      timeoutSec: 300,
      maxRetries: 3,
      backoffSec: 1,
    });
    setStageModalVisible(true);
  };

  // 编辑阶段：打开配置弹窗并填充
  const openEditStageModal = (stage: ExecutionStage) => {
    setEditingStage(stage);
    stageForm.setFieldsValue({
      name: stage.name,
      type: stage.type,
      timeoutSec: Math.floor((stage.timeoutMs || 300000) / 1000),
      maxRetries: stage.retryPolicy?.maxRetries ?? 3,
      backoffSec: Math.floor((stage.retryPolicy?.backoffMs ?? 1000) / 1000),
    });
    setStageModalVisible(true);
  };

  const saveStageModal = async () => {
    const values = await stageForm.validateFields();
    const timeoutMs = Math.max(1, Number(values.timeoutSec)) * 1000;
    const backoffMs = Math.max(0, Number(values.backoffSec)) * 1000;

    if (editingStage) {
      const updatedStages = (workflow.executionFlow.stages || []).map((s) =>
        s.id === editingStage.id
          ? {
              ...s,
              name: values.name,
              type: values.type,
              timeoutMs,
              retryPolicy: { maxRetries: Number(values.maxRetries) || 0, backoffMs },
            }
          : s
      );
      onUpdate({
        executionFlow: { ...workflow.executionFlow, stages: updatedStages },
        metadata: { ...workflow.metadata, updatedAt: new Date().toISOString() },
      });
    } else {
      const newStage: ExecutionStage = {
        id: generateId('stage'),
        name: values.name,
        type: values.type,
        tasks: [],
        timeoutMs,
        retryPolicy: { maxRetries: Number(values.maxRetries) || 0, backoffMs },
      };
      onUpdate({
        executionFlow: {
          ...workflow.executionFlow,
          stages: [...(workflow.executionFlow.stages || []), newStage],
        },
        metadata: { ...workflow.metadata, updatedAt: new Date().toISOString() },
      });
    }

    setStageModalVisible(false);
    setEditingStage(null);
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
              onEditStage={openEditStageModal}
              onAddStage={openCreateStageModal}
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
              onAddStage={openCreateStageModal}
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

      {/* 阶段配置弹窗 */}
      <Modal
        title={editingStage ? '编辑阶段' : '新建阶段'}
        open={stageModalVisible}
        onOk={saveStageModal}
        onCancel={() => {
          setStageModalVisible(false);
          setEditingStage(null);
        }}
        okText={editingStage ? '保存' : '创建'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item name="name" label="阶段名称" rules={[{ required: true, message: '请输入阶段名称' }]}>
            <Input placeholder="例如：代码分析 / 单测执行" />
          </Form.Item>
          <Form.Item name="type" label="阶段类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '串行', value: 'sequential' },
                { label: '并行', value: 'parallel' },
              ]}
            />
          </Form.Item>
          <Form.Item name="timeoutSec" label="超时时间(秒)" rules={[{ type: 'number', min: 1 }]}>
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item name="maxRetries" label="最大重试次数" rules={[{ type: 'number', min: 0 }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="backoffSec" label="退避间隔(秒)" rules={[{ type: 'number', min: 0 }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
