import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, Tag, Typography, Space, Progress, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  TeamOutlined, 
  ThunderboltOutlined,
  SyncOutlined 
} from '@ant-design/icons';
import { ExecutionStage, AgentConfig } from '@/lib/types';

const { Text, Title } = Typography;

interface StageNodeData {
  stage: ExecutionStage;
  agents: AgentConfig[];
  progress?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export const StageNode = memo(({ data, selected }: NodeProps<StageNodeData>) => {
  const { stage, agents, progress = 0, status = 'pending' } = data;

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'green';
      case 'running': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <SyncOutlined spin />;
      case 'completed': return '✓';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  const getTypeIcon = () => {
    return stage.type === 'parallel' ? <ThunderboltOutlined /> : <ClockCircleOutlined />;
  };

  const getTypeText = () => {
    return stage.type === 'parallel' ? '并行执行' : '串行执行';
  };

  return (
    <div className="stage-node">
      <Handle type="target" position={Position.Top} />
      
      <Card
        size="small"
        className={`
          min-w-[220px] transition-all duration-200 
          ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md'}
          border-gray-200
        `}
        bodyStyle={{ padding: '12px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{getStatusIcon()}</span>
            <Title level={5} className="!mb-0 !text-sm">
              {stage.name}
            </Title>
          </div>
          <Tag 
            color={getStatusColor()} 
            size="small"
            className="text-xs"
          >
            {status}
          </Tag>
        </div>

        {/* Progress */}
        {status === 'running' && progress > 0 && (
          <Progress 
            percent={progress} 
            size="small" 
            status="active"
            className="mb-2"
          />
        )}

        {/* Stage Info */}
        <Space direction="vertical" size="small" className="w-full">
          <div className="flex items-center justify-between text-xs">
            <Space size="small">
              {getTypeIcon()}
              <Text type="secondary">{getTypeText()}</Text>
            </Space>
            <Tooltip title={`超时时间: ${Math.floor(stage.timeoutMs / 1000)}秒`}>
              <Text type="secondary" className="text-xs">
                {Math.floor(stage.timeoutMs / 1000)}s
              </Text>
            </Tooltip>
          </div>

          <div className="flex items-center justify-between text-xs">
            <Space size="small">
              <TeamOutlined />
              <Text type="secondary">
                {stage.tasks.length} 个任务
              </Text>
            </Space>
            <Text type="secondary">
              重试 {stage.retryPolicy.maxRetries} 次
            </Text>
          </div>
        </Space>

        {/* Agent List */}
        {agents.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">参与 Agent:</div>
            <div className="flex flex-wrap gap-1">
              {agents.slice(0, 3).map((agent) => (
                <Tag 
                  key={agent.id} 
                  size="small" 
                  className="text-xs"
                  color="blue"
                >
                  {agent.name}
                </Tag>
              ))}
              {agents.length > 3 && (
                <Tag size="small" className="text-xs">
                  +{agents.length - 3}
                </Tag>
              )}
            </div>
          </div>
        )}

        {/* Tasks Preview */}
        {stage.tasks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">任务类型:</div>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(stage.tasks.map(task => task.taskType))).map((taskType) => (
                <Tag 
                  key={taskType} 
                  size="small" 
                  className="text-xs"
                  color={
                    taskType === 'main_planning' ? 'gold' :
                    taskType === 'sub_execution' ? 'green' : 'purple'
                  }
                >
                  {taskType === 'main_planning' ? '规划' :
                   taskType === 'sub_execution' ? '执行' : '综合'}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
