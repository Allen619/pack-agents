import { Card, Button, Tag, Typography, Space, Tooltip, Badge } from 'antd';
import { EditOutlined, DeleteOutlined, PlayCircleOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { WorkflowConfig } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const { Text, Paragraph } = Typography;

interface WorkflowCardProps {
  workflow: WorkflowConfig;
  onEdit?: (workflow: WorkflowConfig) => void;
  onDelete?: (workflow: WorkflowConfig) => void;
  onExecute?: (workflow: WorkflowConfig) => void;
}

export function WorkflowCard({ workflow, onEdit, onDelete, onExecute }: WorkflowCardProps) {
  const router = useRouter();

  const handleEdit = () => {
    if (onEdit) {
      onEdit(workflow);
    } else {
      router.push(`/workflows/${workflow.id}/edit`);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(workflow);
    }
  };

  const handleExecute = () => {
    if (onExecute) {
      onExecute(workflow);
    } else {
      router.push(`/workflows/${workflow.id}/execute`);
    }
  };

  const handleViewDetail = () => {
    router.push(`/workflows/${workflow.id}`);
  };

  const getStatusColor = () => {
    if (workflow.metadata.lastExecuted) {
      const lastExecuted = new Date(workflow.metadata.lastExecuted);
      const now = new Date();
      const daysSinceExecution = (now.getTime() - lastExecuted.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceExecution < 1) return 'green';
      if (daysSinceExecution < 7) return 'orange';
      return 'red';
    }
    return 'gray';
  };

  const getStatusText = () => {
    if (workflow.metadata.lastExecuted) {
      return `${formatDistanceToNow(workflow.metadata.lastExecuted)}前执行`;
    }
    return '未执行';
  };

  return (
    <Card
      hoverable
      className="workflow-card h-full"
      actions={[
        <Tooltip key="edit" title="编辑工作流">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleEdit}
          />
        </Tooltip>,
        <Tooltip key="execute" title="执行工作流">
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={handleExecute}
            className="text-green-600 hover:text-green-700"
          />
        </Tooltip>,
        <Tooltip key="delete" title="删除工作流">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          />
        </Tooltip>
      ]}
    >
      <div onClick={handleViewDetail} className="cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <Typography.Title level={5} className="!mb-1 line-clamp-1">
              {workflow.name}
            </Typography.Title>
            <Space className="mb-2">
              <Badge
                status={getStatusColor() as any}
                text={
                  <Text type="secondary" className="text-xs">
                    {getStatusText()}
                  </Text>
                }
              />
            </Space>
          </div>
        </div>

        <Paragraph 
          type="secondary" 
          className="text-sm !mb-3 line-clamp-2"
          ellipsis={{ rows: 2 }}
        >
          {workflow.description || '暂无描述'}
        </Paragraph>

        <Space direction="vertical" className="w-full" size="small">
          {/* Agent 信息 */}
          <div className="flex justify-between items-center">
            <Space>
              <TeamOutlined />
              <Text className="text-sm">
                <strong>{workflow.agentIds.length}</strong> 个 Agent
              </Text>
            </Space>
            {workflow.mainAgentId && (
              <Space>
                <UserOutlined />
                <Text className="text-xs text-gray-500">
                  主 Agent
                </Text>
              </Space>
            )}
          </div>

          {/* 执行流程信息 */}
          <div className="flex justify-between items-center">
            <Space>
              <Text className="text-sm">
                <strong>{workflow.executionFlow.stages.length}</strong> 个阶段
              </Text>
            </Space>
            {workflow.metadata.executionCount > 0 && (
              <Text className="text-xs text-gray-500">
                执行 {workflow.metadata.executionCount} 次
              </Text>
            )}
          </div>

          {/* 配置标签 */}
          <div className="flex flex-wrap gap-1">
            {workflow.configuration.autoRetry && (
              <Tag size="small" color="blue">自动重试</Tag>
            )}
            {workflow.configuration.notifications && (
              <Tag size="small" color="green">通知提醒</Tag>
            )}
            {workflow.configuration.maxExecutionTime && (
              <Tag size="small" color="orange">
                超时 {Math.floor(workflow.configuration.maxExecutionTime / 1000)}s
              </Tag>
            )}
          </div>
        </Space>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <Space className="w-full justify-between">
            <Text type="secondary" className="text-xs">
              创建于 {formatDistanceToNow(workflow.metadata.createdAt)}前
            </Text>
            <Text type="secondary" className="text-xs">
              v{workflow.metadata.version}
            </Text>
          </Space>
        </div>
      </div>
    </Card>
  );
}
