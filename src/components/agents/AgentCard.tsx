// Agent 卡片组件
import { Card, Tag, Button, Space, Typography, Popconfirm, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { AgentConfig } from '@/types';
import { formatDate, getAgentRoleColor } from '@/utils';
import { memo, useMemo } from 'react';

const { Text, Paragraph } = Typography;

interface AgentCardProps {
  agent: AgentConfig;
  onEdit?: (agent: AgentConfig) => void;
  onDelete?: (agent: AgentConfig) => void;
  onChat?: (agent: AgentConfig) => void;
  loading?: boolean;
}

export function AgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onChat, 
  loading = false 
}: AgentCardProps) {
  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete(agent);
        message.success(`Agent "${agent.name}" 已删除`);
      } catch (error) {
        message.error('删除失败');
      }
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

  const getProviderText = (provider: string) => {
    switch (provider) {
      case 'claude':
        return 'Claude';
      case 'openai':
        return 'OpenAI';
      default:
        return provider;
    }
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow duration-200"
      loading={loading}
      actions={[
        <Button
          key="chat"
          type="text"
          icon={<MessageOutlined />}
          onClick={() => onChat?.(agent)}
        >
          对话
        </Button>,
        <Button
          key="edit"
          type="text"
          icon={<EditOutlined />}
          onClick={() => onEdit?.(agent)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description={`确定要删除 Agent "${agent.name}" 吗？`}
          onConfirm={handleDelete}
          okText="删除"
          cancelText="取消"
          okType="danger"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <div className="space-y-3">
        {/* 头部信息 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <RobotOutlined className="text-blue-500 text-lg" />
            <div>
              <Text strong className="text-lg">
                {agent.name}
              </Text>
              <div className="flex items-center space-x-2 mt-1">
                <Tag className={getAgentRoleColor(agent.role)}>
                  {getRoleText(agent.role)}
                </Tag>
                <Tag color="blue">
                  {getProviderText(agent.llmConfig.provider)}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        {/* 描述 */}
        {agent.description && (
          <Paragraph 
            ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
            type="secondary"
            className="text-sm mb-3"
          >
            {agent.description}
          </Paragraph>
        )}

        {/* 系统提示词预览 */}
        <div className="bg-gray-50 p-3 rounded">
          <Text type="secondary" className="text-xs mb-1 block">
            系统提示词：
          </Text>
          <Paragraph 
            ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
            className="text-sm mb-0"
          >
            {agent.systemPrompt}
          </Paragraph>
        </div>

        {/* 工具和知识库 */}
        <div className="space-y-2">
          {agent.enabledTools.length > 0 && (
            <div>
              <Text type="secondary" className="text-xs block mb-1">
                启用工具 ({agent.enabledTools.length}):
              </Text>
              <div className="flex flex-wrap gap-1">
                {agent.enabledTools.slice(0, 3).map(tool => (
                  <Tag key={tool} size="small">
                    {tool}
                  </Tag>
                ))}
                {agent.enabledTools.length > 3 && (
                  <Tag size="small" color="default">
                    +{agent.enabledTools.length - 3}
                  </Tag>
                )}
              </div>
            </div>
          )}

          {agent.knowledgeBasePaths.length > 0 && (
            <div>
              <Text type="secondary" className="text-xs block mb-1">
                知识库路径 ({agent.knowledgeBasePaths.length}):
              </Text>
              <div className="flex flex-wrap gap-1">
                {agent.knowledgeBasePaths.slice(0, 2).map(path => (
                  <Tag key={path} size="small" color="green">
                    {path}
                  </Tag>
                ))}
                {agent.knowledgeBasePaths.length > 2 && (
                  <Tag size="small" color="default">
                    +{agent.knowledgeBasePaths.length - 2}
                  </Tag>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 标签 */}
        {agent.metadata.tags.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs block mb-1">
              标签:
            </Text>
            <div className="flex flex-wrap gap-1">
              {agent.metadata.tags.map(tag => (
                <Tag key={tag} size="small" color="processing">
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <UserOutlined />
            <Text type="secondary" className="text-xs">
              {agent.metadata.author}
            </Text>
          </div>
          <div className="flex items-center space-x-1">
            <ClockCircleOutlined />
            <Text type="secondary" className="text-xs">
              {formatDate(agent.metadata.updatedAt)}
            </Text>
          </div>
        </div>

        {/* 使用统计 */}
        {agent.metadata.usage.totalExecutions > 0 && (
          <div className="bg-blue-50 p-2 rounded text-xs">
            <div className="flex justify-between">
              <span>执行次数: {agent.metadata.usage.totalExecutions}</span>
              <span>成功率: {(agent.metadata.usage.successRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export const AgentCardMemo = memo(AgentCard, (prevProps, nextProps) => {
  return (
    prevProps.agent.id === nextProps.agent.id &&
    prevProps.agent.name === nextProps.agent.name &&
    prevProps.agent.description === nextProps.agent.description &&
    prevProps.agent.role === nextProps.agent.role &&
    prevProps.agent.llmConfig.provider === nextProps.agent.llmConfig.provider &&
    prevProps.agent.metadata.updatedAt === nextProps.agent.metadata.updatedAt &&
    prevProps.agent.metadata.usage.totalExecutions === nextProps.agent.metadata.usage.totalExecutions &&
    prevProps.agent.metadata.usage.successRate === nextProps.agent.metadata.usage.successRate &&
    prevProps.loading === nextProps.loading
  );
});
