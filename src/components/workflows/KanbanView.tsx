import { useState } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Tag, 
  Avatar, 
  Dropdown, 
  Menu,
  Empty,
  Badge,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  MoreOutlined, 
  UserOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { WorkflowConfig, AgentConfig, ExecutionStage } from '@/lib/types';
import { getAgentRoleColor } from '@/lib/utils';

const { Title, Text } = Typography;

interface KanbanViewProps {
  workflow: WorkflowConfig;
  agents: AgentConfig[];
  onEditStage?: (stage: ExecutionStage) => void;
  onDeleteStage?: (stageId: string) => void;
  onAddStage?: () => void;
  readonly?: boolean;
  className?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  stages: ExecutionStage[];
}

export function KanbanView({ 
  workflow, 
  agents, 
  onEditStage, 
  onDeleteStage, 
  onAddStage, 
  readonly = false, 
  className 
}: KanbanViewProps) {
  const [draggedStage, setDraggedStage] = useState<ExecutionStage | null>(null);

  const getAgentById = (id: string) => {
    return agents.find(agent => agent.id === id);
  };

  // Organize stages into kanban columns
  const getColumns = (): KanbanColumn[] => {
    const stages = workflow.executionFlow.stages;
    
    return [
      {
        id: 'planning',
        title: '规划阶段',
        icon: <ExclamationCircleOutlined />,
        color: 'blue',
        stages: stages.filter(stage => 
          stage.tasks.some(task => task.taskType === 'main_planning')
        ),
      },
      {
        id: 'execution',
        title: '执行阶段',
        icon: <PlayCircleOutlined />,
        color: 'green',
        stages: stages.filter(stage => 
          stage.tasks.some(task => task.taskType === 'sub_execution') &&
          !stage.tasks.some(task => task.taskType === 'main_planning')
        ),
      },
      {
        id: 'synthesis',
        title: '综合阶段',
        icon: <CheckCircleOutlined />,
        color: 'purple',
        stages: stages.filter(stage => 
          stage.tasks.some(task => task.taskType === 'synthesis')
        ),
      },
      {
        id: 'other',
        title: '其他阶段',
        icon: <ClockCircleOutlined />,
        color: 'orange',
        stages: stages.filter(stage => 
          !stage.tasks.some(task => 
            ['main_planning', 'sub_execution', 'synthesis'].includes(task.taskType)
          )
        ),
      },
    ];
  };

  const renderStageCard = (stage: ExecutionStage) => {
    const stageAgents = stage.tasks
      .map(task => getAgentById(task.agentId))
      .filter(Boolean) as AgentConfig[];

    const taskTypeCounts = stage.tasks.reduce((acc, task) => {
      acc[task.taskType] = (acc[task.taskType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const getMenu = () => (
      <Menu
        items={[
          {
            key: 'edit',
            label: '编辑阶段',
            icon: <EditOutlined />,
            onClick: () => onEditStage?.(stage),
          },
          {
            key: 'delete',
            label: '删除阶段',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => onDeleteStage?.(stage.id),
          },
        ]}
      />
    );

    return (
      <Card
        key={stage.id}
        size="small"
        className="mb-3 cursor-move transition-all duration-200 hover:shadow-md"
        title={
          <div className="flex items-center justify-between">
            <Space>
              <span className="text-sm font-medium">{stage.name}</span>
              <Tag color={stage.type === 'parallel' ? 'blue' : 'orange'} size="small">
                {stage.type === 'parallel' ? '并行' : '串行'}
              </Tag>
            </Space>
            {!readonly && (
              <Dropdown overlay={getMenu()} trigger={['click']}>
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </div>
        }
        bodyStyle={{ padding: '12px' }}
        draggable={!readonly}
        onDragStart={() => setDraggedStage(stage)}
        onDragEnd={() => setDraggedStage(null)}
      >
        <div className="space-y-3">
          {/* Stage Statistics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <Text type="secondary">任务:</Text>
              <Text>{stage.tasks.length} 个</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">超时:</Text>
              <Text>{Math.floor(stage.timeoutMs / 1000)}s</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">重试:</Text>
              <Text>{stage.retryPolicy.maxRetries} 次</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">Agent:</Text>
              <Text>{stageAgents.length} 个</Text>
            </div>
          </div>

          {/* Task Type Distribution */}
          {Object.keys(taskTypeCounts).length > 0 && (
            <div>
              <Text type="secondary" className="text-xs block mb-1">
                任务类型:
              </Text>
              <div className="flex flex-wrap gap-1">
                {Object.entries(taskTypeCounts).map(([taskType, count]) => (
                  <Tag
                    key={taskType}
                    size="small"
                    color={
                      taskType === 'main_planning' ? 'gold' :
                      taskType === 'sub_execution' ? 'green' : 'purple'
                    }
                  >
                    {taskType === 'main_planning' ? '规划' :
                     taskType === 'sub_execution' ? '执行' : '综合'} {count}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Participating Agents */}
          {stageAgents.length > 0 && (
            <div>
              <Text type="secondary" className="text-xs block mb-1">
                参与 Agent:
              </Text>
              <div className="flex items-center space-x-1">
                <Avatar.Group maxCount={3} size="small">
                  {stageAgents.map((agent) => (
                    <Tooltip key={agent.id} title={agent.name}>
                      <Avatar
                        size="small"
                        style={{ backgroundColor: getAgentRoleColor(agent.role) }}
                        icon={<UserOutlined />}
                      />
                    </Tooltip>
                  ))}
                </Avatar.Group>
                {stageAgents.length > 3 && (
                  <Text type="secondary" className="text-xs">
                    +{stageAgents.length - 3}
                  </Text>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderColumn = (column: KanbanColumn) => {
    return (
      <div key={column.id} className="flex-1 min-w-0">
        <Card
          size="small"
          className="h-full"
          title={
            <Space>
              {column.icon}
              <span>{column.title}</span>
              <Badge 
                count={column.stages.length} 
                showZero 
                color={column.color}
              />
            </Space>
          }
          bodyStyle={{ padding: '12px', height: 'calc(100% - 60px)', overflowY: 'auto' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            // TODO: Handle stage reordering
          }}
        >
          {column.stages.length === 0 ? (
            <Empty 
              description={`没有${column.title}`}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {column.stages.map(renderStageCard)}
            </div>
          )}
          
          {!readonly && column.id === 'planning' && (
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={onAddStage}
              className="mt-3"
            >
              添加阶段
            </Button>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className={`kanban-view ${className}`}>
      <div className="mb-4">
        <Title level={4}>看板视图</Title>
        <Text type="secondary">
          按任务类型分组展示工作流阶段，支持拖拽调整顺序
        </Text>
      </div>

      <div className="flex space-x-4 h-96">
        {getColumns().map(renderColumn)}
      </div>

      {workflow.executionFlow.stages.length === 0 && (
        <div className="text-center py-12">
          <Empty 
            description="还没有创建任何执行阶段"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!readonly && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onAddStage}>
                创建第一个阶段
              </Button>
            )}
          </Empty>
        </div>
      )}
    </div>
  );
}
