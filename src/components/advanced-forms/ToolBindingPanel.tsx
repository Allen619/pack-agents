'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Switch,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Tooltip,
  Collapse,
  Alert,
  Select,
  Input,
  Slider,
  Divider,
  Progress,
  Badge,
  Table,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ToolOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  PlayCircleOutlined,
  StopOutlined,
  WarningOutlined,
  BugOutlined,
  CodeOutlined,
  FileTextOutlined,
  SearchOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { cn, formatBytes } from '@/utils';

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

// 工具定义
const AVAILABLE_TOOLS = {
  read: {
    name: '文件读取',
    description: '读取文件内容，支持多种文件格式',
    category: 'file',
    riskLevel: 'low',
    permissions: ['read'],
    icon: <FileTextOutlined />,
    color: 'blue',
    capabilities: [
      '读取文本文件内容',
      '支持 UTF-8 编码',
      '自动检测文件类型',
      '大文件分片读取',
    ],
    limitations: [
      '不能读取二进制文件',
      '单文件大小限制 10MB',
      '同时读取文件数限制 100',
    ],
    examples: [
      'read ./src/index.ts',
      'read ./docs/README.md',
    ],
  },
  write: {
    name: '文件写入',
    description: '创建或修改文件内容',
    category: 'file',
    riskLevel: 'high',
    permissions: ['write'],
    icon: <EditOutlined />,
    color: 'orange',
    capabilities: [
      '创建新文件',
      '修改现有文件',
      '自动创建目录',
      '支持多种编码',
    ],
    limitations: [
      '不能覆盖重要系统文件',
      '需要写入权限',
      '受目录权限限制',
    ],
    examples: [
      'write ./output/result.js "console.log(\'Hello\')"',
      'write ./docs/new-doc.md "# Title"',
    ],
  },
  list: {
    name: '目录列表',
    description: '列出目录中的文件和子目录',
    category: 'file',
    riskLevel: 'low',
    permissions: ['read'],
    icon: <SearchOutlined />,
    color: 'green',
    capabilities: [
      '递归列出目录结构',
      '过滤特定文件类型',
      '显示文件元信息',
      '支持模式匹配',
    ],
    limitations: [
      '深度限制 10 层',
      '单次最多 1000 文件',
      '不显示隐藏文件',
    ],
    examples: [
      'list ./src',
      'list ./docs --type=md',
    ],
  },
  grep: {
    name: '文本搜索',
    description: '在文件中搜索指定的文本模式',
    category: 'search',
    riskLevel: 'low',
    permissions: ['read'],
    icon: <SearchOutlined />,
    color: 'purple',
    capabilities: [
      '正则表达式搜索',
      '多文件并行搜索',
      '上下文行显示',
      '大小写敏感/不敏感',
    ],
    limitations: [
      '单次搜索文件数限制 500',
      '正则表达式复杂度限制',
      '超时时间 30 秒',
    ],
    examples: [
      'grep "function.*export" ./src',
      'grep -i "todo" ./src --context=3',
    ],
  },
  bash: {
    name: '命令执行',
    description: '执行 shell 命令',
    category: 'system',
    riskLevel: 'high',
    permissions: ['execute'],
    icon: <PlayCircleOutlined />,
    color: 'red',
    capabilities: [
      '执行系统命令',
      '脚本运行',
      '环境变量访问',
      '管道操作',
    ],
    limitations: [
      '沙箱环境执行',
      '禁止危险命令',
      '超时时间 60 秒',
      '输出大小限制 1MB',
    ],
    examples: [
      'bash "npm --version"',
      'bash "find . -name \'*.ts\' | head -10"',
    ],
  },
  search: {
    name: '智能搜索',
    description: '基于语义的智能搜索',
    category: 'ai',
    riskLevel: 'medium',
    permissions: ['read', 'ai'],
    icon: <BugOutlined />,
    color: 'cyan',
    capabilities: [
      '语义相似度搜索',
      '智能关键词提取',
      '多语言支持',
      '上下文理解',
    ],
    limitations: [
      'AI 服务依赖',
      '网络连接要求',
      '每日调用次数限制',
    ],
    examples: [
      'search "error handling in React components"',
      'search "authentication implementation"',
    ],
  },
};

// 工具分类
const TOOL_CATEGORIES = {
  file: { name: '文件操作', color: 'blue', icon: <FileTextOutlined /> },
  search: { name: '搜索分析', color: 'purple', icon: <SearchOutlined /> },
  system: { name: '系统命令', color: 'red', icon: <PlayCircleOutlined /> },
  ai: { name: 'AI 功能', color: 'cyan', icon: <BugOutlined /> },
};

// 风险级别配置
const RISK_LEVELS = {
  low: { name: '低风险', color: 'green', icon: <CheckCircleOutlined /> },
  medium: { name: '中风险', color: 'orange', icon: <ExclamationCircleOutlined /> },
  high: { name: '高风险', color: 'red', icon: <WarningOutlined /> },
};

interface ToolConfig {
  enabled: boolean;
  permissions: string[];
  settings: Record<string, any>;
}

interface ToolBindingPanelProps {
  value?: Record<string, ToolConfig>;
  onChange?: (config: Record<string, ToolConfig>) => void;
  agentRole?: 'main' | 'sub' | 'synthesis';
  allowedTools?: string[];
  className?: string;
  disabled?: boolean;
  showAdvancedSettings?: boolean;
  showSecurityWarnings?: boolean;
}

export const ToolBindingPanel: React.FC<ToolBindingPanelProps> = ({
  value = {},
  onChange,
  agentRole = 'sub',
  allowedTools,
  className,
  disabled = false,
  showAdvancedSettings = true,
  showSecurityWarnings = true,
}) => {
  const [toolConfigs, setToolConfigs] = useState<Record<string, ToolConfig>>(value);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdvancedModalVisible, setIsAdvancedModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [securityScore, setSecurityScore] = useState(0);

  // 处理值变化
  useEffect(() => {
    setToolConfigs(value);
  }, [value]);

  // 计算安全分数
  useEffect(() => {
    calculateSecurityScore();
  }, [toolConfigs]);

  const handleConfigChange = (newConfigs: Record<string, ToolConfig>) => {
    setToolConfigs(newConfigs);
    onChange?.(newConfigs);
  };

  const toggleTool = (toolKey: string) => {
    const tool = AVAILABLE_TOOLS[toolKey];
    if (!tool) return;

    const currentConfig = toolConfigs[toolKey] || {
      enabled: false,
      permissions: [],
      settings: {},
    };

    const newConfigs = {
      ...toolConfigs,
      [toolKey]: {
        ...currentConfig,
        enabled: !currentConfig.enabled,
        permissions: !currentConfig.enabled ? tool.permissions : [],
      },
    };

    handleConfigChange(newConfigs);
  };

  const updateToolSettings = (toolKey: string, settings: Record<string, any>) => {
    const currentConfig = toolConfigs[toolKey] || {
      enabled: false,
      permissions: [],
      settings: {},
    };

    const newConfigs = {
      ...toolConfigs,
      [toolKey]: {
        ...currentConfig,
        settings: { ...currentConfig.settings, ...settings },
      },
    };

    handleConfigChange(newConfigs);
  };

  const calculateSecurityScore = () => {
    let score = 100;
    let enabledHighRisk = 0;
    let enabledMediumRisk = 0;

    Object.entries(toolConfigs).forEach(([toolKey, config]) => {
      if (config.enabled) {
        const tool = AVAILABLE_TOOLS[toolKey];
        if (tool) {
          switch (tool.riskLevel) {
            case 'high':
              enabledHighRisk++;
              score -= 25;
              break;
            case 'medium':
              enabledMediumRisk++;
              score -= 10;
              break;
            case 'low':
              score -= 2;
              break;
          }
        }
      }
    });

    setSecurityScore(Math.max(0, score));
  };

  const getEnabledToolsCount = () => {
    return Object.values(toolConfigs).filter(config => config.enabled).length;
  };

  const getRiskDistribution = () => {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    Object.entries(toolConfigs).forEach(([toolKey, config]) => {
      if (config.enabled) {
        const tool = AVAILABLE_TOOLS[toolKey];
        if (tool) {
          distribution[tool.riskLevel]++;
        }
      }
    });

    return distribution;
  };

  const isToolAllowed = (toolKey: string) => {
    if (!allowedTools) return true;
    return allowedTools.includes(toolKey);
  };

  const filteredTools = Object.entries(AVAILABLE_TOOLS).filter(([toolKey, tool]) => {
    if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
      return false;
    }
    return isToolAllowed(toolKey);
  });

  const riskDistribution = getRiskDistribution();
  const enabledCount = getEnabledToolsCount();

  // 表格列配置
  const columns: ColumnsType<any> = [
    {
      title: '工具',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center space-x-2">
          {record.icon}
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-gray-500">{record.description}</div>
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const categoryConfig = TOOL_CATEGORIES[category];
        return (
          <Tag color={categoryConfig.color} icon={categoryConfig.icon}>
            {categoryConfig.name}
          </Tag>
        );
      },
    },
    {
      title: '风险级别',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (riskLevel) => {
        const risk = RISK_LEVELS[riskLevel];
        return (
          <Tag color={risk.color} icon={risk.icon}>
            {risk.name}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const config = toolConfigs[record.key];
        const enabled = config?.enabled || false;
        
        return (
          <Switch
            checked={enabled}
            onChange={() => toggleTool(record.key)}
            disabled={disabled || !isToolAllowed(record.key)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => {
              setSelectedTool(record.key);
              setIsAdvancedModalVisible(true);
            }}
          >
            详情
          </Button>
          {showAdvancedSettings && (
            <Button
              size="small"
              icon={<SettingOutlined />}
              disabled={!toolConfigs[record.key]?.enabled}
              onClick={() => {
                setSelectedTool(record.key);
                setIsAdvancedModalVisible(true);
              }}
            >
              设置
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tableData = filteredTools.map(([key, tool]) => ({
    key,
    ...tool,
  }));

  return (
    <div className={cn('tool-binding-panel', className)}>
      <Card>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Title level={4} className="mb-0">
              <ToolOutlined className="mr-2" />
              工具绑定配置
            </Title>
            <Badge count={enabledCount} showZero color="blue">
              <Button icon={<SettingOutlined />}>
                已启用工具
              </Button>
            </Badge>
          </div>

          {showSecurityWarnings && (
            <Alert
              message={
                <div className="flex items-center justify-between">
                  <span>安全评分</span>
                  <div className="flex items-center space-x-2">
                    <Progress
                      percent={securityScore}
                      size="small"
                      status={securityScore >= 80 ? 'success' : securityScore >= 60 ? 'normal' : 'exception'}
                      className="w-32"
                    />
                    <Text strong className={
                      securityScore >= 80 ? 'text-green-600' : 
                      securityScore >= 60 ? 'text-orange-600' : 'text-red-600'
                    }>
                      {securityScore}/100
                    </Text>
                  </div>
                </div>
              }
              description={
                <div className="mt-2">
                  <Text className="text-sm">
                    风险分布: 
                    <Tag color="green" className="ml-2">低风险 {riskDistribution.low}</Tag>
                    <Tag color="orange">中风险 {riskDistribution.medium}</Tag>
                    <Tag color="red">高风险 {riskDistribution.high}</Tag>
                  </Text>
                </div>
              }
              type={securityScore >= 80 ? 'success' : securityScore >= 60 ? 'warning' : 'error'}
              showIcon
              className="mb-4"
            />
          )}
        </div>

        {/* 工具分类过滤 */}
        <div className="mb-4">
          <Space>
            <Text strong>分类筛选:</Text>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 160 }}
            >
              <Option value="all">全部工具</Option>
              {Object.entries(TOOL_CATEGORIES).map(([key, category]) => (
                <Option key={key} value={key}>
                  <Space>
                    {category.icon}
                    {category.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        {/* 工具列表表格 */}
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          size="small"
          className="mb-4"
        />

        {/* 角色建议 */}
        {agentRole && (
          <Card size="small" className="mt-4">
            <Title level={5}>
              {agentRole === 'main' ? '主 Agent' : 
               agentRole === 'sub' ? '执行 Agent' : 
               '总结 Agent'} 工具推荐
            </Title>
            <div className="text-sm text-gray-600">
              {agentRole === 'main' && (
                <div>
                  建议启用: <Tag>list</Tag><Tag>read</Tag><Tag>search</Tag><br/>
                  主 Agent 负责任务规划，建议优先启用低风险的信息获取工具。
                </div>
              )}
              {agentRole === 'sub' && (
                <div>
                  建议启用: <Tag>read</Tag><Tag>write</Tag><Tag>grep</Tag><Tag>bash</Tag><br/>
                  执行 Agent 需要具体操作能力，可以根据任务需要启用高风险工具。
                </div>
              )}
              {agentRole === 'synthesis' && (
                <div>
                  建议启用: <Tag>read</Tag><Tag>list</Tag><Tag>search</Tag><br/>
                  总结 Agent 主要进行信息整合，建议使用安全的只读工具。
                </div>
              )}
            </div>
          </Card>
        )}
      </Card>

      {/* 工具详情和设置弹窗 */}
      <Modal
        title={selectedTool ? `${AVAILABLE_TOOLS[selectedTool]?.name} - 详细配置` : '工具详情'}
        open={isAdvancedModalVisible}
        onCancel={() => {
          setIsAdvancedModalVisible(false);
          setSelectedTool(null);
        }}
        footer={null}
        width={700}
      >
        {selectedTool && (
          <div className="space-y-4">
            {(() => {
              const tool = AVAILABLE_TOOLS[selectedTool];
              const config = toolConfigs[selectedTool];
              
              return (
                <>
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{tool.icon}</div>
                    <div className="flex-1">
                      <Title level={4} className="mb-1">{tool.name}</Title>
                      <Text type="secondary">{tool.description}</Text>
                      <div className="mt-2 space-x-2">
                        <Tag color={TOOL_CATEGORIES[tool.category].color}>
                          {TOOL_CATEGORIES[tool.category].name}
                        </Tag>
                        <Tag color={RISK_LEVELS[tool.riskLevel].color}>
                          {RISK_LEVELS[tool.riskLevel].name}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <Collapse defaultActiveKey={['capabilities']}>
                    <Panel header="功能特性" key="capabilities">
                      <ul className="text-sm">
                        {tool.capabilities.map((capability, index) => (
                          <li key={index} className="mb-1">• {capability}</li>
                        ))}
                      </ul>
                    </Panel>

                    <Panel header="使用限制" key="limitations">
                      <ul className="text-sm">
                        {tool.limitations.map((limitation, index) => (
                          <li key={index} className="mb-1">• {limitation}</li>
                        ))}
                      </ul>
                    </Panel>

                    <Panel header="使用示例" key="examples">
                      <div className="space-y-2">
                        {tool.examples.map((example, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded font-mono text-sm">
                            {example}
                          </div>
                        ))}
                      </div>
                    </Panel>

                    {config?.enabled && showAdvancedSettings && (
                      <Panel header="高级设置" key="settings">
                        <div className="space-y-4">
                          {selectedTool === 'bash' && (
                            <>
                              <div>
                                <Text strong>超时时间 (秒)</Text>
                                <Slider
                                  min={1}
                                  max={300}
                                  value={config.settings?.timeout || 60}
                                  onChange={(value) => updateToolSettings(selectedTool, { timeout: value })}
                                  marks={{ 1: '1s', 60: '60s', 300: '300s' }}
                                />
                              </div>
                              <div>
                                <Text strong>输出大小限制</Text>
                                <Select
                                  value={config.settings?.maxOutputSize || '1MB'}
                                  onChange={(value) => updateToolSettings(selectedTool, { maxOutputSize: value })}
                                  style={{ width: '100%' }}
                                >
                                  <Option value="256KB">256KB</Option>
                                  <Option value="1MB">1MB</Option>
                                  <Option value="5MB">5MB</Option>
                                </Select>
                              </div>
                            </>
                          )}

                          {selectedTool === 'read' && (
                            <>
                              <div>
                                <Text strong>单文件大小限制</Text>
                                <Select
                                  value={config.settings?.maxFileSize || '10MB'}
                                  onChange={(value) => updateToolSettings(selectedTool, { maxFileSize: value })}
                                  style={{ width: '100%' }}
                                >
                                  <Option value="1MB">1MB</Option>
                                  <Option value="5MB">5MB</Option>
                                  <Option value="10MB">10MB</Option>
                                  <Option value="50MB">50MB</Option>
                                </Select>
                              </div>
                            </>
                          )}

                          {selectedTool === 'search' && (
                            <>
                              <div>
                                <Text strong>搜索深度</Text>
                                <Slider
                                  min={1}
                                  max={10}
                                  value={config.settings?.searchDepth || 5}
                                  onChange={(value) => updateToolSettings(selectedTool, { searchDepth: value })}
                                  marks={{ 1: '浅层', 5: '中等', 10: '深度' }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </Panel>
                    )}
                  </Collapse>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};
