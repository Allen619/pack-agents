import { Form, Input, InputNumber, Switch, Button, Space, Typography, Divider, Card } from 'antd';
import { WorkflowConfig } from '@/lib/types';
import { generateId } from '@/lib/utils';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface WorkflowConfigFormProps {
  initialValues?: Partial<WorkflowConfig>;
  onSubmit: (values: WorkflowConfig) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function WorkflowConfigForm({ 
  initialValues, 
  onSubmit, 
  onCancel, 
  loading = false 
}: WorkflowConfigFormProps) {
  const [form] = Form.useForm();
  const isEdit = !!initialValues?.id;

  const handleSubmit = (values: any) => {
    const workflowData: WorkflowConfig = {
      id: initialValues?.id || generateId('workflow'),
      name: values.name,
      description: values.description || '',
      agentIds: initialValues?.agentIds || [],
      mainAgentId: initialValues?.mainAgentId || '',
      executionFlow: initialValues?.executionFlow || {
        stages: [],
        dependencies: []
      },
      configuration: {
        maxExecutionTime: values.maxExecutionTime || 300000, // 5 minutes default
        autoRetry: values.autoRetry || false,
        notifications: values.notifications || false
      },
      metadata: {
        version: initialValues?.metadata?.version || '1.0.0',
        createdAt: initialValues?.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastExecuted: initialValues?.metadata?.lastExecuted,
        executionCount: initialValues?.metadata?.executionCount || 0
      }
    };

    onSubmit(workflowData);
  };

  return (
    <div className="workflow-config-form max-w-2xl mx-auto">
      <Card className="mb-6">
        <Title level={3} className="!mb-2">
          {isEdit ? '编辑工作流' : '创建新工作流'}
        </Title>
        <Text type="secondary">
          {isEdit 
            ? '修改工作流的基本信息和配置，Agent 团队配置需要在详情页面进行。'
            : '创建一个新的工作流，稍后可以添加 Agent 并配置执行流程。'
          }
        </Text>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: initialValues?.name || '',
          description: initialValues?.description || '',
          maxExecutionTime: initialValues?.configuration?.maxExecutionTime 
            ? Math.floor(initialValues.configuration.maxExecutionTime / 1000)
            : 300,
          autoRetry: initialValues?.configuration?.autoRetry || false,
          notifications: initialValues?.configuration?.notifications || false
        }}
        onFinish={handleSubmit}
        className="space-y-6"
      >
        <Card title="基本信息" className="mb-6">
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[
              { required: true, message: '请输入工作流名称' },
              { min: 2, message: '名称至少需要2个字符' },
              { max: 50, message: '名称不能超过50个字符' }
            ]}
          >
            <Input 
              placeholder="例如：代码审查工作流"
              className="text-base"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="工作流描述"
            rules={[
              { max: 500, message: '描述不能超过500个字符' }
            ]}
          >
            <TextArea
              placeholder="描述这个工作流的目的和用途..."
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Card>

        <Card title="执行配置" className="mb-6">
          <Form.Item
            name="maxExecutionTime"
            label="最大执行时间"
            tooltip="工作流的最大执行时间，超过此时间将被强制停止"
            rules={[
              { required: true, message: '请设置最大执行时间' },
              { type: 'number', min: 30, message: '最小执行时间为30秒' },
              { type: 'number', max: 7200, message: '最大执行时间为2小时' }
            ]}
          >
            <InputNumber
              placeholder="300"
              addonAfter="秒"
              className="w-full"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="autoRetry"
            label="自动重试"
            tooltip="当任务失败时是否自动重试"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="开启" 
              unCheckedChildren="关闭" 
            />
          </Form.Item>

          <Form.Item
            name="notifications"
            label="通知提醒"
            tooltip="工作流完成或失败时是否发送通知"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="开启" 
              unCheckedChildren="关闭" 
            />
          </Form.Item>
        </Card>

        <Divider />

        <Form.Item className="mb-0">
          <Space className="w-full justify-end">
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
              size="large"
            >
              {isEdit ? '保存更改' : '创建工作流'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
