import { useState } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Timeline, 
  Tag, 
  Avatar, 
  Collapse,
  Tooltip,
  Empty,
  Alert
} from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined
} from '@ant-design/icons';
import { WorkflowConfig, AgentConfig, ExecutionStage } from '@/lib/types';
import { getAgentRoleColor } from '@/lib/utils';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface SwimlaneViewProps {
  workflow: WorkflowConfig;
  agents: AgentConfig[];
  onEditStage?: (stage: ExecutionStage) => void;
  onAddStage?: () => void;
  readonly?: boolean;
  className?: string;
}

export function SwimlaneView({ 
  workflow, 
  agents, 
  onEditStage, 
  onAddStage, 
  readonly = false, 
  className 
}: SwimlaneViewProps) {
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['stages']);

  const getAgentById = (id: string) => {
    return agents.find(agent => agent.id === id);
  };

  const renderAgentLane = () => {
    const workflowAgents = agents.filter(agent => workflow.agentIds.includes(agent.id));
    
    return (
      <Card 
        title={
          <Space>
            <UserOutlined />
            <span>Agent 泳道</span>
            <Tag color="blue">{workflowAgents.length} 个</Tag>
          </Space>
        }
        size="small"
        className="mb-4"
      >
        {workflowAgents.length === 0 ? (
          <Empty 
            description="没有配置 Agent"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflowAgents.map((agent) => {
              const isMain = workflow.mainAgentId === agent.id;
              
              return (
                <div
                  key={agent.id}
                  className={`
                    p-3 border rounded-lg transition-all duration-200
                    ${isMain ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}
                    hover:shadow-md
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      icon={<UserOutlined />}
                      style={{ backgroundColor: getAgentRoleColor(agent.role) }}
                      size="small"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Text strong className="text-sm truncate">
                          {agent.name}
                        </Text>
                        {isMain && (
                          <Tag color="gold" size="small">主</Tag>
                        )}
                      </div>
                      <Tag color={getAgentRoleColor(agent.role)} size="small">
                        {agent.role}
                      </Tag>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    工具: {agent.enabledTools.length} | 知识库: {agent.knowledgeBasePaths.length}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  const renderStageLane = () => {
    const stages = workflow.executionFlow.stages;
    
    return (
      <Card 
        title={
          <Space>
            <ClockCircleOutlined />
            <span>执行阶段泳道</span>
            <Tag color="green">{stages.length} 个</Tag>
          </Space>
        }
        size="small"
        extra={
          !readonly && (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddStage}
            >
              添加阶段
            </Button>
          )
        }
        className="mb-4"
      >
        {stages.length === 0 ? (
          <Empty 
            description="没有配置执行阶段"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="py-8"
          >
            {!readonly && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onAddStage}>
                创建第一个阶段
              </Button>
            )}
          </Empty>
        ) : (
          <div className="space-y-4">
            <Timeline>
              {stages.map((stage, index) => {
                const stageAgents = stage.tasks
                  .map(task => getAgentById(task.agentId))
                  .filter(Boolean) as AgentConfig[];

                return (
                  <Timeline.Item
                    key={stage.id}
                    dot={
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full">
                        {index + 1}
                      </div>
                    }
                  >
                    <Card
                      size="small"
                      className="ml-4"
                      title={
                        <Space>
                          <span>{stage.name}</span>
                          <Tag color={stage.type === 'parallel' ? 'blue' : 'orange'}>
                            {stage.type === 'parallel' ? '并行' : '串行'}
                          </Tag>
                        </Space>
                      }
                      extra={
                        !readonly && onEditStage && (
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onEditStage(stage)}
                          />
                        )
                      }
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Text type="secondary">任务数量: </Text>
                            <Text>{stage.tasks.length} 个</Text>
                          </div>
                          <div>
                            <Text type="secondary">超时时间: </Text>
                            <Text>{Math.floor(stage.timeoutMs / 1000)}s</Text>
                          </div>
                          <div>
                            <Text type="secondary">重试次数: </Text>
                            <Text>{stage.retryPolicy.maxRetries} 次</Text>
                          </div>
                          <div>
                            <Text type="secondary">参与 Agent: </Text>
                            <Text>{stageAgents.length} 个</Text>
                          </div>
                        </div>

                        {stageAgents.length > 0 && (
                          <div>
                            <Text type="secondary" className="text-xs block mb-2">
                              参与的 Agent:
                            </Text>
                            <div className="flex flex-wrap gap-1">
                              {stageAgents.map((agent) => (
                                <Tooltip key={agent.id} title={agent.description}>
                                  <Tag
                                    color={getAgentRoleColor(agent.role)}
                                    size="small"
                                  >
                                    {agent.name}
                                  </Tag>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        )}

                        {stage.tasks.length > 0 && (
                          <Collapse size="small" ghost>
                            <Panel header="任务详情" key="tasks">
                              <div className="space-y-2">
                                {stage.tasks.map((task, taskIndex) => {
                                  const taskAgent = getAgentById(task.agentId);
                                  
                                  return (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">
                                          #{taskIndex + 1}
                                        </span>
                                        {taskAgent && (
                                          <Tag size="small" color={getAgentRoleColor(taskAgent.role)}>
                                            {taskAgent.name}
                                          </Tag>
                                        )}
                                        <Tag
                                          size="small"
                                          color={
                                            task.taskType === 'main_planning' ? 'gold' :
                                            task.taskType === 'sub_execution' ? 'green' : 'purple'
                                          }
                                        >
                                          {task.taskType === 'main_planning' ? '规划' :
                                           task.taskType === 'sub_execution' ? '执行' : '综合'}
                                        </Tag>
                                      </div>
                                      
                                      <div className="text-xs text-gray-500">
                                        超时: {Math.floor(task.timeout / 1000)}s
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </Panel>
                          </Collapse>
                        )}
                      </div>
                    </Card>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </div>
        )}
      </Card>
    );
  };

  const renderDependencyLane = () => {
    const dependencies = workflow.executionFlow.dependencies || [];
    
    return (
      <Card 
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>依赖关系泳道</span>
            <Tag color="purple">{dependencies.length} 个</Tag>
          </Space>
        }
        size="small"
      >
        {dependencies.length === 0 ? (
          <Empty 
            description="没有配置依赖关系"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep, index) => (
              <div
                key={`${dep.fromStage}-${dep.toStage}`}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                  <Tag>{dep.fromStage}</Tag>
                  <span className="text-gray-400">→</span>
                  <Tag>{dep.toStage}</Tag>
                </div>

                {dep.condition && (
                  <Tag color="orange">
                    {dep.condition}
                  </Tag>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className={`swimlane-view ${className}`}>
      <div className="mb-4">
        <Title level={4}>泳道视图</Title>
        <Text type="secondary">
          按功能模块分层展示工作流的组成要素和执行流程
        </Text>
      </div>

      <div className="space-y-4">
        {renderAgentLane()}
        {renderStageLane()}
        {renderDependencyLane()}
      </div>

      {workflow.agentIds.length === 0 && (
        <Alert
          type="info"
          message="配置提示"
          description="请先在 Agent 团队页面添加 Agent，然后配置执行阶段和依赖关系。"
          showIcon
          className="mt-4"
        />
      )}
    </div>
  );
}
