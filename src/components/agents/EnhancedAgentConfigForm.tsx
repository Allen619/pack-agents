'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Card,
  Space,
  Typography,
  message,
  Row,
  Col,
  Divider,
  InputNumber,
  Slider,
  Switch,
  Tag,
  Tooltip,
  Tabs,
  Alert,
} from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  SettingOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  BranchesOutlined,
  ToolOutlined,
  BookOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { AgentConfig } from '@/types';
import { generateId } from '@/utils';
import { 
  SystemPromptEditor, 
  KnowledgeBasePathSelector, 
  ToolBindingPanel 
} from '@/components/advanced-forms';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const MASKED_API_KEY = '********';

const LLM_CAPABILITY_OPTIONS = [
  { label: '语言模型', value: 'language' },
  { label: '视觉模型', value: 'vision' },
  { label: '联网模型', value: 'web' },
];

interface EnhancedAgentConfigFormProps {
  initialData?: AgentConfig;
  onSubmit: (data: Partial<AgentConfig>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showAdvancedFeatures?: boolean;
}

export const EnhancedAgentConfigForm: React.FC<EnhancedAgentConfigFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  disabled = false,
  showAdvancedFeatures = true,
}) => {
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [knowledgePaths, setKnowledgePaths] = useState<string[]>(
    initialData?.knowledgeBasePaths || []
  );
  const [toolConfigs, setToolConfigs] = useState<Record<string, any>>(
    initialData?.toolConfigs || {}
  );
  const [validationStatus, setValidationStatus] = useState({
    basic: false,
    prompt: false,
    knowledge: false,
    tools: false,
    llm: false,
  });

  // 表单验证状态更新
  useEffect(() => {
    const checkValidation = () => {
      const values = form.getFieldsValue();
      const capabilitySelections = Array.isArray(values.capabilities) ? values.capabilities : [];
      const hasBaseUrl = typeof values.baseUrl === 'string' && values.baseUrl.trim().length > 0;
      const hasApiKey = typeof values.apiKey === 'string' && values.apiKey.trim().length > 0;

      setValidationStatus({
        basic: !!(values.name && values.role),
        prompt: !!(values.systemPrompt && values.systemPrompt.length > 50),
        knowledge: knowledgePaths.length > 0,
        tools: Object.values(toolConfigs).some((config: any) => config.enabled),
        llm: capabilitySelections.length > 0 && hasBaseUrl && hasApiKey,
      });
    };

    checkValidation();
  }, [form, knowledgePaths, toolConfigs]);

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      const capabilities = initialData.llmConfig?.capabilities || {};
      const capabilitySelections: string[] = [];
      if (capabilities.language !== false) capabilitySelections.push('language');
      if (capabilities.vision) capabilitySelections.push('vision');
      if (capabilities.web) capabilitySelections.push('web');

      form.setFieldsValue({
        name: initialData.name,
        description: initialData.description,
        role: initialData.role,
        systemPrompt: initialData.systemPrompt,
        provider: initialData.llmConfig?.provider,
        model: initialData.llmConfig?.model,
        baseUrl: initialData.llmConfig?.baseUrl,
        capabilities: capabilitySelections.length ? capabilitySelections : ['language'],
        apiKey: initialData.llmConfig?.apiKey ? MASKED_API_KEY : '',
        temperature: initialData.llmConfig?.parameters?.temperature ?? 0.1,
        maxTokens: initialData.llmConfig?.parameters?.maxTokens ?? 4000,
        topP: initialData.llmConfig?.parameters?.topP ?? 0.9,
      });
      setKnowledgePaths(initialData.knowledgeBasePaths || []);
      setToolConfigs(initialData.toolConfigs || {});
    } else {
      form.setFieldsValue({
        provider: 'claude',
        model: '',
        baseUrl: 'https://api.anthropic.com',
        capabilities: ['language'],
        apiKey: '',
        temperature: 0.1,
        maxTokens: 4000,
        topP: 0.9,
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (values: any) => {
    try {
      setSubmitLoading(true);

      const rawApiKey = typeof values.apiKey === 'string' ? values.apiKey.trim() : '';
      const apiKey = rawApiKey === MASKED_API_KEY ? initialData?.llmConfig?.apiKey : rawApiKey;
      const capabilitySelections: string[] = Array.isArray(values.capabilities) ? values.capabilities : [];

      if (!values.baseUrl || !values.baseUrl.trim()) {
        message.error('请输入模型地址');
        setSubmitLoading(false);
        return;
      }

      if (!apiKey) {
        message.error('请输入密钥');
        setSubmitLoading(false);
        return;
      }

      const capabilities = {
        language: capabilitySelections.includes('language'),
        vision: capabilitySelections.includes('vision'),
        web: capabilitySelections.includes('web'),
      };

      const enabledTools = Object.entries(toolConfigs)
        .filter(([_, config]: [string, any]) => config.enabled)
        .map(([toolKey, _]) => toolKey);

      const agentData: Partial<AgentConfig> = {
        id: initialData?.id || generateId(),
        name: values.name,
        description: values.description || '',
        role: values.role,
        systemPrompt: values.systemPrompt,
        llmConfig: {
          provider: values.provider,
          model: values.model || undefined,
          baseUrl: values.baseUrl.trim(),
          apiKey,
          capabilities,
          parameters: {
            temperature: values.temperature,
            maxTokens: values.maxTokens,
            topP: values.topP,
          },
        },
        knowledgeBasePaths: knowledgePaths,
        enabledTools: enabledTools,
        toolConfigs: toolConfigs,
        metadata: {
          ...initialData?.metadata,
          version: '1.0.0',
          author: 'user',
          tags: [],
          updatedAt: new Date().toISOString(),
          createdAt: initialData?.metadata?.createdAt || new Date().toISOString(),
        },
      };

      await onSubmit(agentData);
      message.success(initialData ? 'Agent 更新成功' : 'Agent 创建成功');
    } catch (error) {
      message.error('操作失败: ' + (error as Error).message);
    } finally {
      setSubmitLoading(false);
    }
  };;

  const validateCurrentTab = () => {
    switch (activeTab) {
      case 'basic':
        return form.getFieldValue('name') && form.getFieldValue('role');
      case 'prompt':
        const prompt = form.getFieldValue('systemPrompt');
        return prompt && prompt.length > 50;
      case 'knowledge':
        return knowledgePaths.length > 0;
      case 'tools':
        return Object.values(toolConfigs).some((config: any) => config.enabled);
      case 'llm':
        return form.getFieldValue('provider') && form.getFieldValue('model');
      default:
        return false;
    }
  };

  const getTabStatus = (tabKey: string) => {
    return validationStatus[tabKey] ? 'success' : 'error';
  };

  const getCompletionPercentage = () => {
    const completedCount = Object.values(validationStatus).filter(Boolean).length;
    return Math.round((completedCount / Object.keys(validationStatus).length) * 100);
  };

  return (
    <div className="enhanced-agent-config-form">
      <Card>
        {/* 进度提示 */}
        <Alert
          message={`配置完成度: ${getCompletionPercentage()}%`}
          description={
            <div className="mt-2">
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(validationStatus).map(([key, completed]) => (
                  <div key={key} className="text-center">
                    <div className={`text-xs ${completed ? 'text-green-600' : 'text-gray-400'}`}>
                      {completed ? <CheckCircleOutlined /> : '○'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {key === 'basic' ? '基础' : 
                       key === 'prompt' ? '提示' : 
                       key === 'knowledge' ? '知识库' : 
                       key === 'tools' ? '工具' : 'LLM'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
          type={getCompletionPercentage() === 100 ? 'success' : 'info'}
          showIcon
          className="mb-6"
        />

        {/* 选项卡导航 */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
          className="mb-6"
        >
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                基础信息
                {validationStatus.basic && <CheckCircleOutlined className="ml-1 text-green-500" />}
              </span>
            } 
            key="basic"
          />
          <TabPane 
            tab={
              <span>
                <BranchesOutlined />
                系统提示
                {validationStatus.prompt && <CheckCircleOutlined className="ml-1 text-green-500" />}
              </span>
            } 
            key="prompt"
          />
          <TabPane 
            tab={
              <span>
                <BookOutlined />
                知识库
                {validationStatus.knowledge && <CheckCircleOutlined className="ml-1 text-green-500" />}
              </span>
            } 
            key="knowledge"
          />
          <TabPane 
            tab={
              <span>
                <ToolOutlined />
                工具配置
                {validationStatus.tools && <CheckCircleOutlined className="ml-1 text-green-500" />}
              </span>
            } 
            key="tools"
          />
          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                LLM 配置
                {validationStatus.llm && <CheckCircleOutlined className="ml-1 text-green-500" />}
              </span>
            } 
            key="llm"
          />
        </Tabs>

        {/* 表单内容 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            role: 'sub',
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.1,
            maxTokens: 4000,
            topP: 0.9,
          }}
          disabled={disabled}
        >
          {/* 基础信息标签页 */}
          {activeTab === 'basic' && (
            <div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Agent 名称"
                    name="name"
                    rules={[
                      { required: true, message: '请输入 Agent 名称' },
                      { min: 2, message: '名称至少需要2个字符' }
                    ]}
                  >
                    <Input placeholder="为你的 Agent 起一个名字" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Agent 角色"
                    name="role"
                    rules={[{ required: true, message: '请选择 Agent 角色' }]}
                  >
                    <Select placeholder="选择 Agent 角色" size="large">
                      <Option value="main">
                        <Space>
                          <Tag color="green">主 Agent</Tag>
                          负责总体规划和协调
                        </Space>
                      </Option>
                      <Option value="sub">
                        <Space>
                          <Tag color="blue">执行 Agent</Tag>
                          负责具体任务执行
                        </Space>
                      </Option>
                      <Option value="synthesis">
                        <Space>
                          <Tag color="purple">总结 Agent</Tag>
                          负责结果汇总和分析
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="描述"
                name="description"
              >
                <TextArea
                  rows={4}
                  placeholder="描述这个 Agent 的功能和用途"
                  size="large"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </div>
          )}

          {/* 系统提示标签页 */}
          {activeTab === 'prompt' && (
            <div>
              <Form.Item
                name="systemPrompt"
                rules={[
                  { required: true, message: '请输入系统提示词' },
                  { min: 50, message: '系统提示词至少需要50个字符' }
                ]}
              >
                <SystemPromptEditor
                  value={form.getFieldValue('systemPrompt')}
                  onChange={(value) => form.setFieldValue('systemPrompt', value)}
                  agentRole={form.getFieldValue('role')}
                  agentName={form.getFieldValue('name')}
                  showTemplates={true}
                  showPreview={true}
                  showRoleGuide={true}
                  disabled={disabled}
                />
              </Form.Item>
            </div>
          )}

          {/* 知识库标签页 */}
          {activeTab === 'knowledge' && (
            <div>
              <KnowledgeBasePathSelector
                value={knowledgePaths}
                onChange={setKnowledgePaths}
                maxPaths={10}
                showFileTree={true}
                showTemplates={true}
                showAdvancedOptions={showAdvancedFeatures}
                disabled={disabled}
              />
            </div>
          )}

          {/* 工具配置标签页 */}
          {activeTab === 'tools' && (
            <div>
              <ToolBindingPanel
                value={toolConfigs}
                onChange={setToolConfigs}
                agentRole={form.getFieldValue('role')}
                showAdvancedSettings={showAdvancedFeatures}
                showSecurityWarnings={true}
                disabled={disabled}
              />
            </div>
          )}

          {/* LLM 配置标签页 */}
          {activeTab === 'llm' && (
            <Card title="LLM 配置">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="LLM 提供者"
                    name="provider"
                    rules={[{ required: true, message: '请选择 LLM 提供者' }]}
                  >
                    <Select placeholder="选择提供者" size="large">
                      <Option value="claude">
                        <Space>
                          <Tag color="blue">Claude</Tag>
                          Anthropic Claude API
                        </Space>
                      </Option>
                      <Option value="openai">
                        <Space>
                          <Tag color="green">OpenAI</Tag>
                          OpenAI GPT 系列
                        </Space>
                      </Option>
                      <Option value="custom">
                        <Space>
                          <Tag color="default">Custom</Tag>
                          自定义 Provider
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="模型地址"
                    name="baseUrl"
                    rules={[{ required: true, message: '请输入模型地址' }]}
                  >
                    <Input placeholder="例如 https://api.anthropic.com" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="模型类型"
                name="capabilities"
                rules={[{ required: true, message: '请至少选择一种模型类型' }]}
              >
                <Checkbox.Group options={LLM_CAPABILITY_OPTIONS} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="模型名称"
                    name="model"
                  >
                    <Input placeholder="可选，例如 claude-sonnet-4" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        API Key
                        <Tooltip title="密钥仅在界面展示，保存时会写入配置">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    name="apiKey"
                    rules={[{ required: true, message: '请输入密钥' }]}
                  >
                    <Input.Password placeholder="请输入密钥" size="large" visibilityToggle />
                  </Form.Item>
                </Col>
              </Row>

            <Divider>模型参数</Divider>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label={
                      <Space>
                        Temperature
                        <Tooltip title="控制输出的随机性，值越小越确定">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    name="temperature"
                  >
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      marks={{
                        0: '确定',
                        0.5: '平衡',
                        1: '创造',
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="最大 Token 数"
                    name="maxTokens"
                  >
                    <InputNumber
                      min={100}
                      max={8000}
                      style={{ width: '100%' }}
                      placeholder="4000"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={
                      <Space>
                        Top P
                        <Tooltip title="控制输出的多样性">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    name="topP"
                  >
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.1}
                      marks={{
                        0.1: '0.1',
                        0.9: '0.9',
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

          {/* 操作按钮 */}
          <Form.Item className="mt-8">
            <Space size="large" className="flex justify-center">
              {onCancel && (
                <Button size="large" onClick={onCancel} disabled={submitLoading}>
                  取消
                </Button>
              )}
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={submitLoading || loading}
                icon={<SaveOutlined />}
                disabled={getCompletionPercentage() < 80} // 至少完成80%才能提交
              >
                {initialData ? '更新 Agent' : '创建 Agent'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
