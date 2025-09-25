// Agent 配置表单组件
import { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Card,
  Space,
  message,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { AgentConfig, LLMConfig } from '@/types';

const { TextArea } = Input;
const { Option } = Select;

interface AgentConfigFormProps {
  agent?: AgentConfig;
  onSubmit: (values: Partial<AgentConfig>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const MASKED_API_KEY = '********';

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'others',
  model: '',
  baseUrl: 'https://api.anthropic.com',
  apiKey: '',
  capabilities: {
    language: true,
    vision: false,
    web: false,
  },
  parameters: {},
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

const LLM_CAPABILITY_OPTIONS = [
  { label: '语言模型', value: 'language' },
  { label: '视觉模型', value: 'vision' },
  { label: '联网模型', value: 'web' },
];

export function AgentConfigForm({
  agent,
  onSubmit,
  onCancel,
  loading = false,
}: AgentConfigFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (agent) {
      const capabilities = agent.llmConfig?.capabilities || {
        language: true,
        vision: false,
        web: false,
      };
      const capabilitySelections: string[] = [];
      if (capabilities.language) capabilitySelections.push('language');
      if (capabilities.vision) capabilitySelections.push('vision');
      if (capabilities.web) capabilitySelections.push('web');

      form.setFieldsValue({
        ...agent,
        llmConfig: {
          provider: agent.llmConfig?.provider || DEFAULT_LLM_CONFIG.provider,
          model: agent.llmConfig?.model || '',
          baseUrl: agent.llmConfig?.baseUrl || DEFAULT_LLM_CONFIG.baseUrl,
          apiKey: agent.llmConfig?.apiKey ? MASKED_API_KEY : '',
          capabilities: capabilitySelections.length ? capabilitySelections : ['language'],
        },
      });
    } else {
      form.setFieldsValue({
        role: 'sub',
        llmConfig: {
          provider: DEFAULT_LLM_CONFIG.provider,
          model: DEFAULT_LLM_CONFIG.model,
          baseUrl: DEFAULT_LLM_CONFIG.baseUrl,
          apiKey: '',
          capabilities: ['language'],
        },
        knowledgeBasePaths: [],
        enabledTools: ['Read', 'List'],
        metadata: {
          author: '',
          tags: [],
        },
      });
    }
  }, [agent, form]);

  const handleSubmit = async (values: any) => {
    try {
      const llmConfig = values.llmConfig || {};
      const rawApiKey = typeof llmConfig.apiKey === 'string' ? llmConfig.apiKey.trim() : '';
      const apiKey = rawApiKey === MASKED_API_KEY ? agent?.llmConfig?.apiKey : rawApiKey;
      const capabilitySelections: string[] = llmConfig.capabilities || [];

      if (!llmConfig.baseUrl || !llmConfig.baseUrl.trim()) {
        message.error('请输入模型地址');
        return;
      }

      if (!apiKey) {
        message.error('请输入密钥');
        return;
      }

      const capabilities = {
        language: capabilitySelections.includes('language'),
        vision: capabilitySelections.includes('vision'),
        web: capabilitySelections.includes('web'),
      };

      const submitData = {
        ...values,
        llmConfig: {
          provider: llmConfig.provider || DEFAULT_LLM_CONFIG.provider,
          model: llmConfig.model || undefined,
          baseUrl: llmConfig.baseUrl.trim(),
          apiKey,
          capabilities,
          parameters: llmConfig.parameters || {},
        },
        knowledgeBasePaths:
          values.knowledgeBasePaths?.filter((item: string) => item?.trim()) || [],
        enabledTools: values.enabledTools || [],
        metadata: {
          ...values.metadata,
          tags: values.metadata?.tags || [],
        },
      };

      await onSubmit(submitData);
    } catch (error) {
      message.error('提交失败，请稍后重试');
    }
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
                  <Input placeholder="例如: 代码分析助手" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="role"
                  label="Agent 角色"
                  rules={[{ required: true, message: '请选择 Agent 角色' }]}
                >
                  <Select placeholder="选择角色">
                    <Option value="main">主管 Agent</Option>
                    <Option value="sub">子执行 Agent</Option>
                    <Option value="synthesis">总结 Agent</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="描述">
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
                { min: 10, message: '系统提示词至少需要 10 个字符' },
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
              <Col span={12}>
                <Form.Item
                  name={['llmConfig', 'capabilities']}
                  label="模型类型"
                  rules={[{ required: true, message: '请至少选择一种模型类型' }]}
                >
                  <Checkbox.Group options={LLM_CAPABILITY_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['llmConfig', 'baseUrl']}
                  label="模型地址"
                  rules={[{ required: true, message: '请输入模型地址' }]}
                >
                  <Input placeholder="例如 https://api.anthropic.com" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name={['llmConfig', 'model']}
                  label="模型名称"
                >
                  <Input placeholder="可选，例如 claude-sonnet-4" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name={['llmConfig', 'apiKey']}
                  label="API Key"
                  rules={[{ required: true, message: '请输入密钥' }]}
                >
                  <Input.Password
                    placeholder="请输入密钥"
                    visibilityToggle
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
                {AVAILABLE_TOOLS.map((tool) => (
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
                  {fields.map((field) => (
                    <Space
                      key={field.key}
                      align="baseline"
                      style={{ display: 'flex', width: '100%' }}
                    >
                      <Form.Item
                        {...field}
                        style={{ flex: 1 }}
                        rules={[{ required: true, message: '请输入路径' }]}
                      >
                        <Input placeholder="例如: ./src" style={{ width: '100%' }} />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add('')}
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
          <Button onClick={onCancel}>取消</Button>
        )}
        <Button type="primary" htmlType="submit" loading={loading}>
          {agent ? '更新 Agent' : '创建 Agent'}
        </Button>
      </div>
    </Form>
  );
}
