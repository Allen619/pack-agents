'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Card,
  Space,
  Divider,
  Alert,
  Tag,
  Typography,
  Row,
  Col,
  Tooltip,
  message,
} from 'antd';
import {
  InfoCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { ClaudeAgentConfig, MCPServerConfig } from '@/lib/types';
import { generateId } from '@/lib/utils';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

export interface ClaudeAgentConfigFormProps {
  agent?: ClaudeAgentConfig;
  onSave: (config: ClaudeAgentConfig) => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Claude Agent 配置表单组件 - 基于新的 ClaudeAgentConfig 类型
 */
export const ClaudeAgentConfigForm: React.FC<ClaudeAgentConfigFormProps> = ({
  agent,
  onSave,
  onCancel,
  loading = false,
  className = '',
}) => {
  const [form] = Form.useForm();
  const [mcpServers, setMcpServers] = useState<Array<{ key: string; config: MCPServerConfig }>>([]);
  const [knowledgePaths, setKnowledgePaths] = useState<string[]>([]);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);

  // 可用的Claude模型
  const availableModels = [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (推荐)' },
    { value: 'claude-haiku-20250514', label: 'Claude Haiku (快速)' },
  ];

  // 可用的工具
  const availableTools = [
    { value: 'Read', label: 'Read - 读取文件' },
    { value: 'Edit', label: 'Edit - 编辑文件' },
    { value: 'Write', label: 'Write - 写入文件' },
    { value: 'Glob', label: 'Glob - 文件搜索' },
    { value: 'Grep', label: 'Grep - 文本搜索' },
    { value: 'Bash', label: 'Bash - 命令执行' },
  ];

  // Agent角色选项
  const roleOptions = [
    { value: 'main', label: '主要Agent', description: '负责整体规划与协调' },
    { value: 'sub', label: '执行Agent', description: '专注具体任务执行' },
    { value: 'synthesis', label: '综合Agent', description: '负责结果整合与复核' },
  ];

  // 初始化表单数据
  useEffect(() => {
    if (agent) {
      // 设置基本信息
      form.setFieldsValue({
        name: agent.name,
        description: agent.description,
        role: agent.role,
        claudeConfig: agent.claudeConfig,
        sessionConfig: agent.sessionConfig,
      });

      // 设置知识库路径
      setKnowledgePaths(agent.context.knowledgeBasePaths || []);

      // 设置环境变量
      const envVarArray = Object.entries(agent.context.environmentVariables || {})
        .map(([key, value]) => ({ key, value: String(value) }));
      setEnvVars(envVarArray);

      // 设置MCP服务器
      const mcpArray = Object.entries(agent.claudeConfig.mcpServers || {})
        .map(([key, config]) => ({ key, config }));
      setMcpServers(mcpArray);
    } else {
      // 设置默认值
      form.setFieldsValue({
        claudeConfig: {
          model: 'claude-sonnet-4-20250514',
          allowedTools: ['Read', 'Edit', 'Write'],
          maxTurns: 10,
          temperature: 0.7,
        },
        sessionConfig: {
          persistent: true,
          timeout: 1800000, // 30分钟
          resumable: true,
        },
      });
    }
  }, [agent, form]);

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      // 构建环境变量对象
      const environmentVariables: Record<string, string> = {};
      envVars.forEach(({ key, value }) => {
        if (key && value) {
          environmentVariables[key] = value;
        }
      });

      // 构建MCP服务器配置
      const mcpServersConfig: Record<string, MCPServerConfig> = {};
      mcpServers.forEach(({ key, config }) => {
        if (key && config.name) {
          mcpServersConfig[key] = config;
        }
      });

      // 构建完整的Agent配置
      const config: ClaudeAgentConfig = {
        id: agent?.id || generateId(),
        name: values.name,
        description: values.description,
        role: values.role,
        claudeConfig: {
          ...values.claudeConfig,
          mcpServers: Object.keys(mcpServersConfig).length > 0 ? mcpServersConfig : undefined,
        },
        context: {
          knowledgeBasePaths: knowledgePaths,
          workingDirectory: process.cwd(), // 默认为当前目录
          environmentVariables: Object.keys(environmentVariables).length > 0 ? environmentVariables : undefined,
        },
        sessionConfig: values.sessionConfig,
        metadata: {
          createdAt: agent?.metadata.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          tags: agent?.metadata.tags || [],
        },
      };

      await onSave(config);
      message.success('Agent配置保存成功');
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`);
    }
  };

  // 添加知识库路径
  const addKnowledgePath = () => {
    setKnowledgePaths([...knowledgePaths, '']);
  };

  // 移除知识库路径
  const removeKnowledgePath = (index: number) => {
    setKnowledgePaths(knowledgePaths.filter((_, i) => i !== index));
  };

  // 更新知识库路径
  const updateKnowledgePath = (index: number, value: string) => {
    const newPaths = [...knowledgePaths];
    newPaths[index] = value;
    setKnowledgePaths(newPaths);
  };

  // 添加环境变量
  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  // 移除环境变量
  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  // 更新环境变量
  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index][field] = value;
    setEnvVars(newVars);
  };

  // 添加MCP服务器
  const addMcpServer = () => {
    setMcpServers([...mcpServers, {
      key: '',
      config: { name: '', command: '', args: [], env: {} }
    }]);
  };

  // 移除MCP服务器
  const removeMcpServer = (index: number) => {
    setMcpServers(mcpServers.filter((_, i) => i !== index));
  };

  // 更新MCP服务器
  const updateMcpServer = (index: number, key: string, config: MCPServerConfig) => {
    const newServers = [...mcpServers];
    newServers[index] = { key, config };
    setMcpServers(newServers);
  };

  return (
    <div className={`claude-agent-config-form ${className}`}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          claudeConfig: {
            model: 'claude-sonnet-4-20250514',
            allowedTools: ['Read', 'Edit', 'Write'],
            maxTurns: 10,
            temperature: 0.7,
          },
          sessionConfig: {
            persistent: true,
            timeout: 1800000,
            resumable: true,
          },
        }}
      >
        {/* 基本信息 */}
        <Card title={<><RobotOutlined /> 基本信息</>} className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Agent名称"
                rules={[{ required: true, message: '请输入Agent名称' }]}
              >
                <Input placeholder="输入Agent名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Agent角色"
                rules={[{ required: true, message: '请选择Agent角色' }]}
              >
                <Select placeholder="选择Agent角色">
                  {roleOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <Text type="secondary" className="text-xs">
                          {option.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Agent描述"
            rules={[{ required: true, message: '请输入Agent描述' }]}
          >
            <TextArea rows={3} placeholder="描述Agent的功能和用途" />
          </Form.Item>
        </Card>

        {/* Claude Code SDK 配置 */}
        <Card title={<><SettingOutlined /> Claude Code SDK 配置</>} className="mb-4">
          <Alert
            message="Claude Code SDK 核心配置"
            description="这些配置直接影响Agent与Claude Code SDK的交互方式"
            type="info"
            showIcon
            className="mb-4"
          />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['claudeConfig', 'model']}
                label="Claude模型"
                rules={[{ required: true, message: '请选择Claude模型' }]}
              >
                <Select placeholder="选择Claude模型">
                  {availableModels.map(model => (
                    <Option key={model.value} value={model.value}>
                      {model.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['claudeConfig', 'maxTurns']}
                label={
                  <span>
                    最大轮次 
                    <Tooltip title="单次对话的最大轮次，影响执行深度">
                      <InfoCircleOutlined className="ml-1" />
                    </Tooltip>
                  </span>
                }
                rules={[{ required: true, message: '请输入最大轮次' }]}
              >
                <InputNumber min={1} max={50} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['claudeConfig', 'temperature']}
                label={
                  <span>
                    Temperature 
                    <Tooltip title="控制响应的随机性，0-1之间，越低越确定">
                      <InfoCircleOutlined className="ml-1" />
                    </Tooltip>
                  </span>
                }
              >
                <InputNumber 
                  min={0} 
                  max={1} 
                  step={0.1} 
                  className="w-full"
                  placeholder="0.7"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['claudeConfig', 'allowedTools']}
                label="允许的工具"
                rules={[{ required: true, message: '请选择至少一个工具' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择允许使用的工具"
                  allowClear
                >
                  {availableTools.map(tool => (
                    <Option key={tool.value} value={tool.value}>
                      {tool.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['claudeConfig', 'systemPrompt']}
            label="系统提示词"
            rules={[{ required: true, message: '请输入系统提示词' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="定义Agent的角色、行为和目标..."
              showCount
            />
          </Form.Item>
        </Card>

        {/* 执行上下文配置 */}
        <Card title="执行上下文" className="mb-4">
          {/* 知识库路径 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Text strong>知识库路径</Text>
              <Button 
                type="dashed" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={addKnowledgePath}
              >
                添加路径
              </Button>
            </div>
            {knowledgePaths.map((path, index) => (
              <div key={index} className="flex mb-2">
                <Input
                  value={path}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateKnowledgePath(index, e.target.value)}
                  placeholder="输入知识库目录路径"
                  className="flex-1"
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeKnowledgePath(index)}
                  className="ml-2"
                />
              </div>
            ))}
          </div>

          {/* 环境变量 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Text strong>环境变量</Text>
              <Button 
                type="dashed" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={addEnvVar}
              >
                添加变量
              </Button>
            </div>
            {envVars.map((envVar, index) => (
              <div key={index} className="flex mb-2">
                <Input
                  value={envVar.key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEnvVar(index, 'key', e.target.value)}
                  placeholder="变量名"
                  className="flex-1 mr-2"
                />
                <Input
                  value={envVar.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEnvVar(index, 'value', e.target.value)}
                  placeholder="变量值"
                  className="flex-1"
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeEnvVar(index)}
                  className="ml-2"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* MCP 服务器配置 */}
        <Card title="MCP 工具服务器" className="mb-4">
          <Alert
            message="Model Context Protocol (MCP) 集成"
            description="配置自定义工具服务器以扩展Agent能力"
            type="info"
            showIcon
            className="mb-4"
          />

          <div className="flex justify-between items-center mb-2">
            <Text strong>MCP 服务器配置</Text>
            <Button 
              type="dashed" 
              size="small" 
              icon={<PlusOutlined />}
              onClick={addMcpServer}
            >
              添加服务器
            </Button>
          </div>

          {mcpServers.map((server, index) => (
            <Card key={index} size="small" className="mb-3">
              <div className="flex justify-between items-start mb-2">
                <Text strong>服务器 {index + 1}</Text>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeMcpServer(index)}
                />
              </div>
              
              <Row gutter={8}>
                <Col span={8}>
                  <Input
                    value={server.key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMcpServer(index, e.target.value, server.config)}
                    placeholder="服务器键名"
                    size="small"
                  />
                </Col>
                <Col span={8}>
                  <Input
                    value={server.config.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMcpServer(index, server.key, { ...server.config, name: e.target.value })}
                    placeholder="服务器名称"
                    size="small"
                  />
                </Col>
                <Col span={8}>
                  <Input
                    value={server.config.command}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMcpServer(index, server.key, { ...server.config, command: e.target.value })}
                    placeholder="启动命令"
                    size="small"
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </Card>

        {/* 会话管理配置 */}
        <Card title="会话管理" className="mb-4">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['sessionConfig', 'persistent']}
                label="持久化会话"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['sessionConfig', 'resumable']}
                label="可恢复会话"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['sessionConfig', 'timeout']}
                label="会话超时(毫秒)"
              >
                <InputNumber min={60000} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
          >
            保存配置
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ClaudeAgentConfigForm;
