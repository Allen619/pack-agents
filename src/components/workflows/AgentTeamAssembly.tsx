import { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Select, 
  Tag, 
  List, 
  Avatar, 
  Tooltip, 
  Badge,
  Empty,
  Divider,
  Alert,
  Modal
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CrownOutlined, 
  TeamOutlined,
  InfoCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { AgentConfig, WorkflowConfig } from '@/lib/types';
import { useAgents } from '@/hooks/useAgents';
import { getAgentRoleColor, cn } from '@/lib/utils';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface AgentTeamAssemblyProps {
  workflow: WorkflowConfig;
  onUpdate: (updates: Partial<WorkflowConfig>) => void;
  className?: string;
}

export function AgentTeamAssembly({ workflow, onUpdate, className }: AgentTeamAssemblyProps) {
  const { agents, isLoading } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);

  // Get available agents (not already in workflow)
  const availableAgents = agents.filter(agent => !workflow.agentIds.includes(agent.id));
  
  // Get workflow agents
  const workflowAgents = agents.filter(agent => workflow.agentIds.includes(agent.id));

  const handleAddAgent = () => {
    if (!selectedAgentId) return;
    
    const newAgentIds = [...workflow.agentIds, selectedAgentId];
    const updates: Partial<WorkflowConfig> = {
      agentIds: newAgentIds
    };

    // If this is the first agent, make it the main agent
    if (workflow.agentIds.length === 0) {
      updates.mainAgentId = selectedAgentId;
    }

    onUpdate(updates);
    setSelectedAgentId('');
  };

  const handleRemoveAgent = (agentId: string) => {
    const newAgentIds = workflow.agentIds.filter(id => id !== agentId);
    const updates: Partial<WorkflowConfig> = {
      agentIds: newAgentIds
    };

    // If removing the main agent, clear main agent or set to first remaining agent
    if (workflow.mainAgentId === agentId) {
      updates.mainAgentId = newAgentIds.length > 0 ? newAgentIds[0] : '';
    }

    onUpdate(updates);
    setShowRemoveModal(null);
  };

  const handleSetMainAgent = (agentId: string) => {
    onUpdate({ mainAgentId: agentId });
  };

  const getAgentById = (id: string) => {
    return agents.find(agent => agent.id === id);
  };

  return (
    <div className={cn('agent-team-assembly', className)}>
      <Card>
        <div className="mb-6">
          <Title level={4} className="!mb-2">
            <TeamOutlined className="mr-2" />
            Agent 团队组装
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            为工作流选择和配置 Agent 团队。每个工作流需要至少一个 Agent，其中一个将被指定为主 Agent。
          </Paragraph>
        </div>

        {/* Add Agent Section */}
        <Card size="small" className="mb-6" title="添加 Agent">
          <Space.Compact className="w-full">
            <Select
              placeholder="选择要添加的 Agent"
              value={selectedAgentId}
              onChange={setSelectedAgentId}
              className="flex-1"
              loading={isLoading}
              disabled={availableAgents.length === 0}
              showSearch
              filterOption={(input, option) => 
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableAgents.map(agent => (
                <Option key={agent.id} value={agent.id}>
                  <Space>
                    <Tag color={getAgentRoleColor(agent.role)} size="small">
                      {agent.role}
                    </Tag>
                    {agent.name}
                  </Space>
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddAgent}
              disabled={!selectedAgentId}
            >
              添加
            </Button>
          </Space.Compact>
          
          {availableAgents.length === 0 && (
            <Alert
              type="info"
              message="没有可用的 Agent"
              description="所有已创建的 Agent 都已添加到工作流中，或者您还没有创建任何 Agent。"
              className="mt-3"
              showIcon
            />
          )}
        </Card>

        {/* Current Team */}
        <Card size="small" title={
          <Space>
            <span>当前团队</span>
            <Badge count={workflowAgents.length} showZero color="blue" />
          </Space>
        }>
          {workflowAgents.length === 0 ? (
            <Empty 
              description="还没有添加任何 Agent"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={workflowAgents}
              renderItem={(agent) => {
                const isMainAgent = workflow.mainAgentId === agent.id;
                
                return (
                  <List.Item
                    className={cn(
                      "transition-all duration-200 rounded-lg p-3 -m-3",
                      isMainAgent && "bg-blue-50 border border-blue-200"
                    )}
                    actions={[
                      <Tooltip key="main" title={isMainAgent ? "当前主 Agent" : "设为主 Agent"}>
                        <Button
                          type={isMainAgent ? "primary" : "text"}
                          icon={<CrownOutlined />}
                          size="small"
                          onClick={() => handleSetMainAgent(agent.id)}
                          disabled={isMainAgent}
                        />
                      </Tooltip>,
                      <Tooltip key="remove" title="移除 Agent">
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          onClick={() => setShowRemoveModal(agent.id)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className="relative">
                          <Avatar 
                            icon={<UserOutlined />} 
                            style={{ backgroundColor: getAgentRoleColor(agent.role) }}
                          />
                          {isMainAgent && (
                            <Badge
                              count={<CrownOutlined className="text-yellow-500" />}
                              offset={[-5, 5]}
                            />
                          )}
                        </div>
                      }
                      title={
                        <Space>
                          <span className="font-medium">{agent.name}</span>
                          <Tag color={getAgentRoleColor(agent.role)} size="small">
                            {agent.role}
                          </Tag>
                          {isMainAgent && (
                            <Tag color="gold" size="small">
                              <CrownOutlined className="mr-1" />
                              主 Agent
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary" className="text-sm">
                            {agent.description}
                          </Text>
                          <br />
                          <Space className="mt-1" size="small">
                            <Text type="secondary" className="text-xs">
                              工具: {agent.enabledTools.length} 个
                            </Text>
                            <Text type="secondary" className="text-xs">
                              知识库: {agent.knowledgeBasePaths.length} 个路径
                            </Text>
                          </Space>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}

          {workflowAgents.length > 0 && (
            <>
              <Divider />
              <Alert
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                message="团队配置说明"
                description={
                  <ul className="mt-2 text-sm space-y-1">
                    <li>• 主 Agent 负责整体任务规划和结果聚合</li>
                    <li>• 其他 Agent 作为子任务执行者协助完成工作</li>
                    <li>• 可以随时调整团队成员和主 Agent 设置</li>
                    <li>• 建议根据任务复杂度合理配置团队规模</li>
                  </ul>
                }
              />
            </>
          )}
        </Card>

        {/* Remove Agent Modal */}
        <Modal
          title="确认移除 Agent"
          open={!!showRemoveModal}
          onOk={() => showRemoveModal && handleRemoveAgent(showRemoveModal)}
          onCancel={() => setShowRemoveModal(null)}
          okText="确认移除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <p>
            确定要从工作流中移除这个 Agent 吗？
            {workflow.mainAgentId === showRemoveModal && (
              <Alert
                type="warning"
                message="注意：您正在移除主 Agent"
                description="移除后将自动指定其他 Agent 为主 Agent（如果有）。"
                className="mt-3"
                showIcon
              />
            )}
          </p>
        </Modal>
      </Card>
    </div>
  );
}
