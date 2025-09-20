// Agent 配置表单组件
import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  message,
  Row,
  Col,
  InputNumber,
  Switch,
  Tag,
  Divider,
  Typography,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { AgentConfig, LLMConfig } from '@/types';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface AgentConfigFormProps {
  agent?: AgentConfig;
  onSubmit: (values: Partial<AgentConfig>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  apiKey: '',
  parameters: {
    temperature: 0.1,
    maxTokens: 4000,
  },
};

const AVAILABLE_TOOLS = [
  'Read',
  'Write', 
  'Edit',
  'List',
  'Grep',
  'Search',
  'Bash',
  'Git',
];

const LLM_PROVIDERS = [
  {
    value: 'claude',
    label: 'Anthropic Claude',
    models: [
      'claude-sonnet-4-20250514',
      'claude-haiku-20250514',
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI GPT',
    models: [
      'gpt-4',
      'gpt-3.5-turbo',
    ],
  },
];

export function AgentConfigForm({ 
  agent, 
  onSubmit, 
  onCancel, 
  loading = false 
}: AgentConfigFormProps) {
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState<string>(
    agent?.llmConfig.provider || 'claude'
  );

  useEffect(() => {
    if (agent) {
      form.setFieldsValue({
        ...agent,
        llmConfig: {
          ...agent.llmConfig,
          // 不显示实际的 API Key，使用占位符
          apiKey: agent.llmConfig.apiKey ? '••••••••••••••••' : '',
        },
      });
      setSelectedProvider(agent.llmConfig.provider);
    } else {
      form.setFieldsValue({
        role: 'sub',
        llmConfig: DEFAULT_LLM_CONFIG,
        knowledgeBasePaths: ['./src', './docs'],
        enabledTools: ['Read', 'List'],
        metadata: {
          tags: [],
        },
      });
    }
  }, [agent, form]);

  const handleSubmit = async (values: any) => {
    try {
      // 处理 API Key - 如果是占位符则保持原值
      const apiKey = values.llmConfig.apiKey === '••••••••••••••••' 
        ? agent?.llmConfig.apiKey || ''
        : values.llmConfig.apiKey;

      const submitData = {
        ...values,
        llmConfig: {
          ...values.llmConfig,
          apiKey,
        },
        metadata: {
          ...values.metadata,
          tags: values.metadata?.tags || [],
        },
      };

      await onSubmit(submitData);
      message.success(agent ? 'Agent 更新成功' : 'Agent 创建成功');
    } catch (error) {
      message.error(agent ? '更新失败' : '创建失败');
    }
  };

  const getCurrentModels = () => {
    const provider = LLM_PROVIDERS.find(p => p.value === selectedProvider);
    return provider?.models || [];
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="agent-config-form"
    >
      <Row gutter={24}>
        <Col span={24}>
          <Card title="基本信息" className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Agent 名称"
                  rules={[{ required: true, message: '请输入 Agent 名称' }]}
                >
                  <Input placeholder="例如: 代码分析师" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="role"
                  label="Agent 角色"
                  rules={[{ required: true, message: '请选择 Agent 角色' }]}
                >
                  <Select placeholder="选择角色">
                    <Option value="main">主管理 Agent</Option>
                    <Option value="sub">子执行 Agent</Option>
                    <Option value="synthesis">总结 Agent</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="描述"
            >
              <TextArea 
                placeholder="描述这个 Agent 的功能和用途"
                rows={3}
              />
            </Form.Item>

            <Form.Item
              name="systemPrompt"
              label="系统提示词"
              rules={[
                { required: true, message: '请输入系统提示词' },
                { min: 10, message: '系统提示词至少需要10个字符' },
              ]}
            >
              <TextArea 
                placeholder="定义 Agent 的行为和职责..."
                rows={6}
                showCount
              />
            </Form.Item>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="LLM 配置" className="mb-4">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['llmConfig', 'provider']}
                  label="LLM 提供商"
                  rules={[{ required: true, message: '请选择 LLM 提供商' }]}
                >
                  <Select
                    placeholder="选择提供商"
                    onChange={setSelectedProvider}
                  >
                    {LLM_PROVIDERS.map(provider => (
                      <Option key={provider.value} value={provider.value}>
                        {provider.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['llmConfig', 'model']}
                  label="模型"
                  rules={[{ required: true, message: '请选择模型' }]}
                >
                  <Select placeholder="选择模型">
                    {getCurrentModels().map(model => (
                      <Option key={model} value={model}>
                        {model}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['llmConfig', 'apiKey']}
                  label="API Key"
                  rules={[{ required: true, message: '请输入 API Key' }]}
                >
                  <Input.Password 
                    placeholder="输入 API Key"
                    visibilityToggle
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" orientationMargin="0">
              <Text type="secondary">模型参数</Text>
            </Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['llmConfig', 'parameters', 'temperature']}
                  label="Temperature"
                  tooltip="控制输出的随机性，0-1之间"
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    placeholder="0.1"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['llmConfig', 'parameters', 'maxTokens']}
                  label="Max Tokens"
                  tooltip="最大输出令牌数"
                >
                  <InputNumber
                    min={1}
                    max={8000}
                    placeholder="4000"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['llmConfig', 'parameters', 'topP']}
                  label="Top P"
                  tooltip="核心采样参数，0-1之间"
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    placeholder="0.9"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="工具配置" className="mb-4">
            <Form.Item
              name="enabledTools"
              label="启用的工具"
            >
              <Select
                mode="multiple"
                placeholder="选择工具"
                style={{ width: '100%' }}
              >
                {AVAILABLE_TOOLS.map(tool => (
                  <Option key={tool} value={tool}>
                    {tool}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="知识库配置" className="mb-4">
            <Form.List name="knowledgeBasePaths">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(field => (
                    <Space key={field.key} align="baseline">
                      <Form.Item
                        {...field}
                        rules={[{ required: true, message: '请输入路径' }]}
                      >
                        <Input placeholder="例如: ./src" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加知识库路径
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="元数据" className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['metadata', 'author']}
                  label="作者"
                >
                  <Input placeholder="Agent 创建者" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['metadata', 'tags']}
                  label="标签"
                >
                  <Select
                    mode="tags"
                    placeholder="添加标签，回车确认"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button onClick={onCancel}>
            取消
          </Button>
        )}
        <Button type="primary" htmlType="submit" loading={loading}>
          {agent ? '更新 Agent' : '创建 Agent'}
        </Button>
      </div>
    </Form>
  );
}
