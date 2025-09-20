import { useState } from 'react';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Button, 
  Tag, 
  Input, 
  Select, 
  Space, 
  Modal,
  Rate,
  Badge,
  Tooltip,
  Tabs,
  Empty,
  Avatar,
  Progress,
  Alert,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  StarOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { WorkflowTemplate, WorkflowTemplateManager, TemplateCategory } from '@/lib/workflow/templates';
import { useAgents } from '@/hooks/useAgents';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Search } = Input;

interface WorkflowTemplateGalleryProps {
  onApplyTemplate: (template: WorkflowTemplate, options: any) => void;
  onCreateFromTemplate?: (template: WorkflowTemplate) => void;
  className?: string;
}

export function WorkflowTemplateGallery({ 
  onApplyTemplate, 
  onCreateFromTemplate,
  className 
}: WorkflowTemplateGalleryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [agentMappings, setAgentMappings] = useState<Record<string, string>>({});
  
  const { agents } = useAgents();
  const categories = WorkflowTemplateManager.getTemplateCategories();
  const allTemplates = categories.flatMap(cat => cat.templates);

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = !searchValue || 
      template.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      template.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchValue.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    const matchesComplexity = complexityFilter === 'all' || template.metadata.complexity === complexityFilter;
    
    return matchesSearch && matchesCategory && matchesComplexity;
  });

  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setPreviewModalVisible(true);
  };

  const handleApplyTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setAgentMappings({});
    setApplyModalVisible(true);
  };

  const handleConfirmApply = () => {
    if (!selectedTemplate) return;
    
    onApplyTemplate(selectedTemplate, {
      agentMappings,
      name: `${selectedTemplate.name} - 副本`,
      description: selectedTemplate.description
    });
    
    setApplyModalVisible(false);
    setSelectedTemplate(null);
    setAgentMappings({});
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'green';
      case 'medium': return 'orange';
      case 'complex': return 'red';
      default: return 'gray';
    }
  };

  const getComplexityText = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '简单';
      case 'medium': return '中等';
      case 'complex': return '复杂';
      default: return '未知';
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    }
    return `${minutes}分钟`;
  };

  const renderTemplateCard = (template: WorkflowTemplate) => {
    return (
      <Card
        key={template.id}
        size="small"
        className="template-card hover:shadow-lg transition-all duration-200"
        cover={
          <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-4xl">
              {categories.find(cat => cat.id === template.category)?.icon || '📋'}
            </div>
          </div>
        }
        actions={[
          <Button
            key="preview"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewTemplate(template)}
          >
            预览
          </Button>,
          <Button
            key="apply"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => handleApplyTemplate(template)}
          >
            应用
          </Button>
        ]}
      >
        <div className="space-y-3">
          <div>
            <Title level={5} className="!mb-1 line-clamp-1">
              {template.name}
            </Title>
            <Text type="secondary" className="text-xs">
              v{template.version} • by {template.author}
            </Text>
          </div>

          <Paragraph 
            ellipsis={{ rows: 2 }} 
            className="text-sm !mb-2"
          >
            {template.description}
          </Paragraph>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Space size="small">
                <TeamOutlined />
                <Text>{template.metadata.requiredAgentCount} Agent</Text>
              </Space>
              <Space size="small">
                <ClockCircleOutlined />
                <Text>{formatDuration(template.metadata.estimatedDuration)}</Text>
              </Space>
            </div>

            <div className="flex items-center justify-between">
              <Tag 
                color={getComplexityColor(template.metadata.complexity)}
                size="small"
              >
                {getComplexityText(template.metadata.complexity)}
              </Tag>
              
              <div className="flex items-center space-x-2">
                {template.metadata.rating && (
                  <div className="flex items-center space-x-1">
                    <StarOutlined className="text-yellow-500 text-xs" />
                    <Text className="text-xs">{template.metadata.rating}</Text>
                  </div>
                )}
                <Badge count={template.metadata.usageCount} showZero={false}>
                  <Text className="text-xs text-gray-500">使用</Text>
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <Tag key={tag} size="small" color="blue">
                {tag}
              </Tag>
            ))}
            {template.tags.length > 3 && (
              <Tag size="small">+{template.tags.length - 3}</Tag>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderPreviewModal = () => {
    if (!selectedTemplate) return null;

    return (
      <Modal
        title={`模板预览: ${selectedTemplate.name}`}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="apply" 
            type="primary" 
            onClick={() => {
              setPreviewModalVisible(false);
              handleApplyTemplate(selectedTemplate);
            }}
          >
            应用模板
          </Button>
        ]}
      >
        <div className="space-y-4">
          {/* Template Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text strong>复杂度:</Text>
              <Tag 
                color={getComplexityColor(selectedTemplate.metadata.complexity)}
                className="ml-2"
              >
                {getComplexityText(selectedTemplate.metadata.complexity)}
              </Tag>
            </div>
            <div>
              <Text strong>预估时长:</Text>
              <Text className="ml-2">
                {formatDuration(selectedTemplate.metadata.estimatedDuration)}
              </Text>
            </div>
            <div>
              <Text strong>需要 Agent:</Text>
              <Text className="ml-2">{selectedTemplate.metadata.requiredAgentCount} 个</Text>
            </div>
            <div>
              <Text strong>成功率:</Text>
              <Text className="ml-2">
                {selectedTemplate.metadata.successRate 
                  ? `${(selectedTemplate.metadata.successRate * 100).toFixed(1)}%` 
                  : '未知'}
              </Text>
            </div>
          </div>

          <Divider />

          {/* Agent Roles */}
          <div>
            <Title level={5}>
              <TeamOutlined className="mr-2" />
              Agent 角色配置
            </Title>
            <div className="space-y-2">
              {selectedTemplate.agentRoles.map(role => (
                <Card key={role.role} size="small">
                  <div className="flex items-start space-x-3">
                    <Avatar style={{ backgroundColor: '#1890ff' }}>
                      {role.name.charAt(0)}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Text strong>{role.name}</Text>
                        {role.required && <Tag size="small" color="red">必需</Tag>}
                      </div>
                      <Text type="secondary" className="text-sm">
                        {role.description}
                      </Text>
                      {role.enabledTools && (
                        <div className="mt-2">
                          <Text className="text-xs text-gray-500">工具: </Text>
                          {role.enabledTools.map(tool => (
                            <Tag key={tool} size="small">{tool}</Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Divider />

          {/* Execution Flow */}
          <div>
            <Title level={5}>
              <ThunderboltOutlined className="mr-2" />
              执行流程
            </Title>
            <div className="space-y-2">
              {selectedTemplate.executionFlow.stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Text strong>{stage.name}</Text>
                      <Tag color={stage.type === 'parallel' ? 'green' : 'orange'} size="small">
                        {stage.type === 'parallel' ? '并行' : '串行'}
                      </Tag>
                    </div>
                    <Text type="secondary" className="text-sm">
                      {stage.description || `执行 ${stage.agentRoles.length} 个角色的任务`}
                    </Text>
                  </div>
                  <Text type="secondary" className="text-xs">
                    {formatDuration(stage.timeoutMs)}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  const renderApplyModal = () => {
    if (!selectedTemplate) return null;

    return (
      <Modal
        title={`应用模板: ${selectedTemplate.name}`}
        open={applyModalVisible}
        onOk={handleConfirmApply}
        onCancel={() => setApplyModalVisible(false)}
        width={600}
        okText="创建工作流"
        cancelText="取消"
      >
        <div className="space-y-4">
          <Alert
            type="info"
            message="Agent 角色映射"
            description="请为每个模板角色选择对应的 Agent，或稍后在工作流编辑页面进行配置。"
            showIcon
          />

          <div className="space-y-3">
            {selectedTemplate.agentRoles.map(role => {
              const compatibleAgents = agents.filter(agent => 
                agent.role === role.role || 
                agent.name.toLowerCase().includes(role.role.toLowerCase())
              );

              return (
                <div key={role.role} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Text strong>{role.name}</Text>
                      {role.required && <Tag size="small" color="red" className="ml-2">必需</Tag>}
                    </div>
                  </div>
                  
                  <Text type="secondary" className="text-sm block mb-2">
                    {role.description}
                  </Text>
                  
                  <Select
                    placeholder="选择 Agent 或稍后配置"
                    style={{ width: '100%' }}
                    value={agentMappings[role.role]}
                    onChange={(value) => setAgentMappings(prev => ({
                      ...prev,
                      [role.role]: value
                    }))}
                    allowClear
                  >
                    {compatibleAgents.map(agent => (
                      <Option key={agent.id} value={agent.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                            {agent.name.charAt(0)}
                          </Avatar>
                          <span>{agent.name}</span>
                          <Tag size="small">{agent.role}</Tag>
                        </div>
                      </Option>
                    ))}
                  </Select>
                  
                  {compatibleAgents.length === 0 && (
                    <Text type="secondary" className="text-xs mt-1 block">
                      没有找到兼容的 Agent，您可以稍后创建或分配合适的 Agent
                    </Text>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <Text strong className="block mb-2">创建后可以:</Text>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 调整 Agent 团队配置</li>
              <li>• 修改执行流程和依赖关系</li>
              <li>• 自定义超时和重试策略</li>
              <li>• 添加或移除执行阶段</li>
            </ul>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className={`workflow-template-gallery ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <Title level={3}>工作流模板库</Title>
        <Text type="secondary">
          选择预设模板快速创建工作流，或浏览最佳实践获取灵感
        </Text>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col span={8}>
            <Search
              placeholder="搜索模板名称、描述或标签"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择分类"
              style={{ width: '100%' }}
              value={selectedCategory}
              onChange={setSelectedCategory}
            >
              <Option value="all">全部分类</Option>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="复杂度"
              style={{ width: '100%' }}
              value={complexityFilter}
              onChange={setComplexityFilter}
            >
              <Option value="all">全部复杂度</Option>
              <Option value="simple">简单</Option>
              <Option value="medium">中等</Option>
              <Option value="complex">复杂</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Text type="secondary">
              共 {filteredTemplates.length} 个模板
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Empty 
          description="没有找到匹配的模板"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Row gutter={[24, 24]}>
          {filteredTemplates.map(template => (
            <Col key={template.id} xs={24} sm={12} lg={8} xl={6}>
              {renderTemplateCard(template)}
            </Col>
          ))}
        </Row>
      )}

      {/* Modals */}
      {renderPreviewModal()}
      {renderApplyModal()}
    </div>
  );
}
