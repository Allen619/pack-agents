// Agent 模板选择组件
import { useState } from 'react';
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Tag, 
  Typography, 
  Space,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import { 
  RobotOutlined, 
  PlusOutlined,
  EditOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { AgentTemplate, AgentConfig } from '@/types';
import { getAgentRoleColor } from '@/utils';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface AgentTemplateSelectorProps {
  templates: AgentTemplate[];
  onSelectTemplate: (templateId: string, overrides?: Partial<AgentConfig>) => Promise<void>;
  loading?: boolean;
}

interface CustomizeModalProps {
  template: AgentTemplate | null;
  visible: boolean;
  onOk: (overrides: Partial<AgentConfig>) => void;
  onCancel: () => void;
}

function CustomizeModal({ template, visible, onOk, onCancel }: CustomizeModalProps) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'main':
        return '主管理';
      case 'sub':
        return '子执行';
      case 'synthesis':
        return '总结';
      default:
        return role;
    }
  };

  return (
    <Modal
      title={template ? `自定义 "${template.name}"` : '自定义模板'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      okText="创建 Agent"
      cancelText="取消"
    >
      {template && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <RobotOutlined className="text-blue-500" />
            <Text strong>{template.name}</Text>
            <Tag className={getAgentRoleColor(template.role)}>
              {getRoleText(template.role)}
            </Tag>
          </div>
          <Text type="secondary" className="block mb-3">
            {template.description}
          </Text>
          <div className="space-y-2">
            <div>
              <Text strong className="text-sm">启用工具: </Text>
              <Space wrap>
                {template.enabledTools.map(tool => (
                  <Tag key={tool} size="small">{tool}</Tag>
                ))}
              </Space>
            </div>
            <div>
              <Text strong className="text-sm">标签: </Text>
              <Space wrap>
                {template.tags.map(tag => (
                  <Tag key={tag} size="small" color="processing">{tag}</Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Agent 名称"
          rules={[{ required: true, message: '请输入 Agent 名称' }]}
          initialValue={template?.name.replace('模板', '')}
        >
          <Input placeholder="自定义 Agent 名称" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
          initialValue={template?.description}
        >
          <TextArea 
            placeholder="自定义描述（可选）"
            rows={3}
          />
        </Form.Item>

        <Form.Item
          name="systemPrompt"
          label="系统提示词"
          initialValue={template?.systemPrompt}
        >
          <TextArea 
            placeholder="自定义系统提示词（可选）"
            rows={4}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function AgentTemplateSelector({ 
  templates, 
  onSelectTemplate, 
  loading = false 
}: AgentTemplateSelectorProps) {
  const [customizeModal, setCustomizeModal] = useState<{
    visible: boolean;
    template: AgentTemplate | null;
  }>({
    visible: false,
    template: null,
  });

  const handleQuickCreate = async (template: AgentTemplate) => {
    try {
      await onSelectTemplate(template.id, {
        name: template.name.replace('模板', ''),
      });
      message.success(`已从模板创建 Agent "${template.name.replace('模板', '')}"`);
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleCustomize = (template: AgentTemplate) => {
    setCustomizeModal({
      visible: true,
      template,
    });
  };

  const handleCustomizeOk = async (overrides: Partial<AgentConfig>) => {
    if (!customizeModal.template) return;

    try {
      await onSelectTemplate(customizeModal.template.id, overrides);
      message.success(`已创建自定义 Agent "${overrides.name}"`);
      setCustomizeModal({ visible: false, template: null });
    } catch (error) {
      message.error('创建失败');
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'main':
        return '主管理';
      case 'sub':
        return '子执行';
      case 'synthesis':
        return '总结';
      default:
        return role;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'development':
        return 'blue';
      case 'management':
        return 'green';
      case 'analysis':
        return 'purple';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        {templates.map(template => (
          <Col key={template.id} xs={24} sm={12} lg={8}>
            <Card
              className="h-full hover:shadow-md transition-shadow duration-200"
              actions={[
                <Button
                  key="quick"
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => handleQuickCreate(template)}
                  loading={loading}
                >
                  快速创建
                </Button>,
                <Button
                  key="customize"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleCustomize(template)}
                >
                  自定义
                </Button>,
              ]}
            >
              <div className="space-y-3">
                {/* 头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <RobotOutlined className="text-blue-500 text-lg" />
                    <Text strong className="text-base">
                      {template.name}
                    </Text>
                  </div>
                  <Tag className={getAgentRoleColor(template.role)}>
                    {getRoleText(template.role)}
                  </Tag>
                </div>

                {/* 分类标签 */}
                <div>
                  <Tag 
                    color={getCategoryColor(template.category)} 
                    icon={<TagsOutlined />}
                  >
                    {template.category}
                  </Tag>
                </div>

                {/* 描述 */}
                <Paragraph 
                  ellipsis={{ rows: 3, expandable: false }}
                  className="text-sm text-gray-600 mb-3"
                >
                  {template.description}
                </Paragraph>

                {/* 系统提示词预览 */}
                <div className="bg-gray-50 p-2 rounded">
                  <Text type="secondary" className="text-xs block mb-1">
                    系统提示词:
                  </Text>
                  <Paragraph 
                    ellipsis={{ rows: 2, expandable: false }}
                    className="text-xs mb-0"
                  >
                    {template.systemPrompt}
                  </Paragraph>
                </div>

                {/* 工具列表 */}
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    工具 ({template.enabledTools.length}):
                  </Text>
                  <div className="flex flex-wrap gap-1">
                    {template.enabledTools.slice(0, 3).map(tool => (
                      <Tag key={tool} size="small">
                        {tool}
                      </Tag>
                    ))}
                    {template.enabledTools.length > 3 && (
                      <Tag size="small" color="default">
                        +{template.enabledTools.length - 3}
                      </Tag>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    标签:
                  </Text>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map(tag => (
                      <Tag key={tag} size="small" color="processing">
                        {tag}
                      </Tag>
                    ))}
                    {template.tags.length > 3 && (
                      <Tag size="small" color="default">
                        +{template.tags.length - 3}
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <CustomizeModal
        template={customizeModal.template}
        visible={customizeModal.visible}
        onOk={handleCustomizeOk}
        onCancel={() => setCustomizeModal({ visible: false, template: null })}
      />
    </>
  );
}
