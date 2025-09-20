import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, Avatar, Tag, Typography, Space, Badge } from 'antd';
import { UserOutlined, CrownOutlined, RobotOutlined } from '@ant-design/icons';
import { AgentConfig, WorkflowConfig } from '@/lib/types';
import { getAgentRoleColor } from '@/lib/utils';

const { Text } = Typography;

interface AgentNodeData {
  agent: AgentConfig;
  isMain: boolean;
  workflow: WorkflowConfig;
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const { agent, isMain } = data;

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} />
      
      <Card
        size="small"
        className={`
          min-w-[200px] transition-all duration-200 
          ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md'}
          ${isMain ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
        `}
        bodyStyle={{ padding: '12px' }}
      >
        <div className="flex items-start space-x-3">
          <div className="relative">
            <Avatar
              icon={<RobotOutlined />}
              style={{ 
                backgroundColor: getAgentRoleColor(agent.role),
                color: 'white'
              }}
              size="default"
            />
            {isMain && (
              <Badge
                count={<CrownOutlined className="text-yellow-500 text-xs" />}
                offset={[-5, 5]}
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Text strong className="text-sm truncate">
                {agent.name}
              </Text>
              {isMain && (
                <Tag color="gold" size="small" className="text-xs">
                  主
                </Tag>
              )}
            </div>
            
            <div className="space-y-1">
              <Tag 
                color={getAgentRoleColor(agent.role)} 
                size="small"
                className="text-xs"
              >
                {agent.role}
              </Tag>
              
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>工具: {agent.enabledTools.length} 个</div>
                <div>知识库: {agent.knowledgeBasePaths.length} 个</div>
              </div>
            </div>
          </div>
        </div>
        
        {agent.description && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <Text 
              type="secondary" 
              className="text-xs line-clamp-2"
              title={agent.description}
            >
              {agent.description}
            </Text>
          </div>
        )}
      </Card>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
