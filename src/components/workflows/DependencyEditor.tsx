import { useState, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Input, 
  Form, 
  Space, 
  Table, 
  Tag, 
  Tooltip, 
  Modal,
  Typography,
  Alert,
  Divider,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { WorkflowConfig, ExecutionStage } from '@/lib/types';
import { DependencyManager, DependencyCondition, StageDependency } from '@/lib/workflow/dependencies';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface DependencyEditorProps {
  workflow: WorkflowConfig;
  onUpdate: (workflow: WorkflowConfig) => void;
  readonly?: boolean;
  className?: string;
}

export function DependencyEditor({ 
  workflow, 
  onUpdate, 
  readonly = false, 
  className 
}: DependencyEditorProps) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDependency, setEditingDependency] = useState<StageDependency | null>(null);
  const [form] = Form.useForm();

  const stages = workflow.executionFlow.stages;
  const dependencies = workflow.executionFlow.dependencies || [];

  // Validate current dependencies
  const validation = DependencyManager.validateDependencies(workflow);
  const executionPlan = DependencyManager.generateExecutionPlan(workflow);

  const handleAddDependency = () => {
    setEditingDependency(null);
    setEditModalVisible(true);
    form.resetFields();
  };

  const handleEditDependency = (dependency: any) => {
    setEditingDependency(dependency);
    setEditModalVisible(true);
    form.setFieldsValue({
      fromStage: dependency.fromStage,
      toStage: dependency.toStage,
      conditionType: dependency.condition ? 'custom' : 'success',
      customExpression: dependency.condition || ''
    });
  };

  const handleSaveDependency = async () => {
    try {
      const values = await form.validateFields();
      
      let updatedWorkflow = { ...workflow };

      // Remove existing dependency if editing
      if (editingDependency) {
        updatedWorkflow = DependencyManager.removeDependency(
          updatedWorkflow,
          editingDependency.fromStage,
          editingDependency.toStage
        );
      }

      // Add new dependency
      const condition: DependencyCondition | undefined = values.conditionType === 'custom' 
        ? {
            type: 'custom',
            customExpression: values.customExpression,
            description: values.customExpression
          }
        : values.conditionType !== 'success' 
        ? { type: values.conditionType }
        : undefined;

      updatedWorkflow = DependencyManager.addDependency(
        updatedWorkflow,
        values.fromStage,
        values.toStage,
        condition
      );

      onUpdate(updatedWorkflow);
      setEditModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save dependency:', error);
    }
  };

  const handleDeleteDependency = (dependency: any) => {
    const updatedWorkflow = DependencyManager.removeDependency(
      workflow,
      dependency.fromStage,
      dependency.toStage
    );
    onUpdate(updatedWorkflow);
  };

  const handleOptimizeDependencies = () => {
    const { optimizedWorkflow, optimizations } = DependencyManager.optimizeDependencies(workflow);
    
    if (optimizations.length > 0) {
      Modal.info({
        title: '依赖关系优化',
        content: (
          <div>
            <p>发现以下优化机会:</p>
            <ul>
              {optimizations.map((opt, index) => (
                <li key={index}>{opt}</li>
              ))}
            </ul>
          </div>
        ),
        onOk: () => onUpdate(optimizedWorkflow)
      });
    } else {
      Modal.info({
        title: '依赖关系优化',
        content: '当前依赖关系已经是最优的，无需优化。'
      });
    }
  };

  const getStageDisplayName = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.name : stageId;
  };

  const getConditionDisplay = (condition?: string) => {
    if (!condition) {
      return <Tag color="green">成功时</Tag>;
    }
    
    return (
      <Tooltip title={condition}>
        <Tag color="orange">自定义条件</Tag>
      </Tooltip>
    );
  };

  const columns = [
    {
      title: '源阶段',
      dataIndex: 'fromStage',
      key: 'fromStage',
      render: (stageId: string) => (
        <Tag color="blue">{getStageDisplayName(stageId)}</Tag>
      ),
    },
    {
      title: '目标阶段',
      dataIndex: 'toStage',
      key: 'toStage',
      render: (stageId: string) => (
        <Tag color="green">{getStageDisplayName(stageId)}</Tag>
      ),
    },
    {
      title: '触发条件',
      dataIndex: 'condition',
      key: 'condition',
      render: (condition: string) => getConditionDisplay(condition),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {!readonly && (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditDependency(record)}
              />
              <Popconfirm
                title="确定要删除这个依赖关系吗？"
                onConfirm={() => handleDeleteDependency(record)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderValidationStatus = () => {
    if (validation.isValid) {
      return (
        <Alert
          type="success"
          message="依赖关系配置有效"
          description="所有依赖关系都正确配置，没有检测到问题。"
          showIcon
          className="mb-4"
        />
      );
    }

    return (
      <Alert
        type="error"
        message="依赖关系配置有问题"
        description={
          <div>
            {validation.errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="text-orange-600">⚠ {warning}</div>
            ))}
          </div>
        }
        showIcon
        className="mb-4"
      />
    );
  };

  const renderExecutionPlan = () => {
    return (
      <Card 
        size="small" 
        title={
          <Space>
            <ThunderboltOutlined />
            执行计划预览
          </Space>
        }
        className="mb-4"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Text type="secondary">总阶段数:</Text>
              <Text strong className="ml-2">{executionPlan.totalStages}</Text>
            </div>
            <div>
              <Text type="secondary">预估时长:</Text>
              <Text strong className="ml-2">{Math.floor(executionPlan.estimatedDuration / 1000)}秒</Text>
            </div>
            <div>
              <Text type="secondary">执行层级:</Text>
              <Text strong className="ml-2">{executionPlan.executionLevels.length}</Text>
            </div>
          </div>

          <div>
            <Text strong className="text-sm">执行层级详情:</Text>
            <div className="mt-2 space-y-2">
              {executionPlan.executionLevels.map((level, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Tag color="blue">L{level.level}</Tag>
                    <Space size="small">
                      {level.stages.map(stageId => (
                        <Tag key={stageId} size="small">
                          {getStageDisplayName(stageId)}
                        </Tag>
                      ))}
                    </Space>
                    {level.canRunInParallel && (
                      <Tag color="green" size="small">并行</Tag>
                    )}
                  </div>
                  <Text type="secondary" className="text-xs">
                    {Math.floor(level.estimatedDuration / 1000)}s
                  </Text>
                </div>
              ))}
            </div>
          </div>

          {executionPlan.criticalPath.length > 0 && (
            <div>
              <Text strong className="text-sm">关键路径:</Text>
              <div className="mt-1 flex items-center space-x-1">
                {executionPlan.criticalPath.map((stageId, index) => (
                  <span key={stageId} className="flex items-center">
                    <Tag color="red" size="small">
                      {getStageDisplayName(stageId)}
                    </Tag>
                    {index < executionPlan.criticalPath.length - 1 && (
                      <span className="mx-1 text-gray-400">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {executionPlan.warnings.length > 0 && (
            <Alert
              type="warning"
              message="执行计划建议"
              description={
                <ul className="mb-0">
                  {executionPlan.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              }
              showIcon
              size="small"
            />
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className={`dependency-editor ${className}`}>
      <Card
        title={
          <Space>
            <InfoCircleOutlined />
            依赖关系管理
          </Space>
        }
        extra={
          <Space>
            {!readonly && (
              <>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={handleOptimizeDependencies}
                  size="small"
                >
                  优化依赖
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddDependency}
                  size="small"
                >
                  添加依赖
                </Button>
              </>
            )}
          </Space>
        }
      >
        {renderValidationStatus()}
        {renderExecutionPlan()}

        <Table
          columns={columns}
          dataSource={dependencies}
          rowKey={(record) => `${record.fromStage}-${record.toStage}`}
          size="small"
          pagination={false}
          locale={{
            emptyText: '暂无依赖关系'
          }}
        />
      </Card>

      {/* Edit Dependency Modal */}
      <Modal
        title={editingDependency ? '编辑依赖关系' : '添加依赖关系'}
        open={editModalVisible}
        onOk={handleSaveDependency}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            conditionType: 'success'
          }}
        >
          <Form.Item
            name="fromStage"
            label="源阶段"
            rules={[{ required: true, message: '请选择源阶段' }]}
          >
            <Select placeholder="选择源阶段">
              {stages.map(stage => (
                <Option key={stage.id} value={stage.id}>
                  {stage.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="toStage"
            label="目标阶段"
            rules={[
              { required: true, message: '请选择目标阶段' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value !== getFieldValue('fromStage')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('目标阶段不能与源阶段相同'));
                },
              }),
            ]}
          >
            <Select placeholder="选择目标阶段">
              {stages.map(stage => (
                <Option key={stage.id} value={stage.id}>
                  {stage.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="conditionType"
            label="触发条件"
            rules={[{ required: true, message: '请选择触发条件' }]}
          >
            <Select>
              <Option value="success">成功时触发</Option>
              <Option value="failure">失败时触发</Option>
              <Option value="completion">完成时触发（无论成功失败）</Option>
              <Option value="custom">自定义条件</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="customExpression"
            label="自定义条件表达式"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue('conditionType') === 'custom' && !value) {
                    return Promise.reject(new Error('请输入自定义条件表达式'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            style={{
              display: form.getFieldValue('conditionType') === 'custom' ? 'block' : 'none'
            }}
          >
            <TextArea
              placeholder="例如: success && output.score > 0.8"
              rows={3}
            />
          </Form.Item>
        </Form>

        <Alert
          type="info"
          message="提示"
          description="依赖关系决定了阶段的执行顺序。源阶段满足条件后，目标阶段才会开始执行。"
          showIcon
          className="mt-4"
        />
      </Modal>
    </div>
  );
}
