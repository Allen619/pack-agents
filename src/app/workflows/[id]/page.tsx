'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { 
  Card, 
  Descriptions, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Divider,
  Spin,
  Alert,
  Badge
} from 'antd';
import { 
  EditOutlined, 
  PlayCircleOutlined, 
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useWorkflow } from '@/hooks/useWorkflows';
import { useAgents } from '@/hooks/useAgents';
import { PageHeader, ErrorBoundary } from '@/components';
import { formatDistanceToNow, getAgentRoleColor } from '@/lib/utils';

const { Title, Text, Paragraph } = Typography;

export default function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { workflow, isLoading, error } = useWorkflow(params.id);
  const { agents } = useAgents();

  const handleEdit = () => {
    router.push(`/workflows/${params.id}/edit`);
  };

  const handleExecute = () => {
    if (!workflow || workflow.agentIds.length === 0) {
      Alert.warning({
        title: '无法执行工作流',
        content: '请先为工作流添加 Agent 团队'
      });
      return;
    }
    router.push(`/workflows/${params.id}/execute`);
  };

  if (error) {
    return (
      <div className="workflow-detail-page min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <PageHeader
            title="工作流详情"
            description="工作流不存在或加载失败"
            onBack={() => router.back()}
          />
          <Card className="mt-6">
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">无法加载工作流信息</p>
              <p className="text-gray-500">请检查工作流 ID 是否正确，或返回工作流列表。</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || !workflow) {
    return (
      <div className="workflow-detail-page min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <PageHeader
            title="工作流详情"
            description="加载工作流信息中..."
            onBack={() => router.back()}
          />
          <Card className="mt-6">
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Get workflow agents
  const workflowAgents = agents.filter(agent => workflow.agentIds.includes(agent.id));
  const mainAgent = agents.find(agent => agent.id === workflow.mainAgentId);

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
    <ErrorBoundary>
      <div className="workflow-detail-page min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <PageHeader
            title={workflow.name}
            description={workflow.description || '暂无描述'}
            onBack={() => router.back()}
            extra={
              <Space>
                <Button 
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  编辑工作流
                </Button>
                <Button 
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecute}
                  disabled={workflow.agentIds.length === 0}
                >
                  执行工作流
                </Button>
              </Space>
            }
          />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2">
              <Card title="基本信息" className="mb-6">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="工作流 ID">
                    <Text code>{workflow.id}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="版本">
                    v{workflow.metadata.version}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {formatDistanceToNow(workflow.metadata.createdAt)}前
                  </Descriptions.Item>
                  <Descriptions.Item label="最后更新">
                    {formatDistanceToNow(workflow.metadata.updatedAt)}前
                  </Descriptions.Item>
                  <Descriptions.Item label="执行状态">
                    <Badge
                      status={getStatusColor() as any}
                      text={getStatusText()}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="执行次数">
                    {workflow.metadata.executionCount} 次
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Agent Team */}
              <Card 
                title={
                  <Space>
                    <TeamOutlined />
                    Agent 团队
                    <Badge count={workflowAgents.length} showZero color="blue" />
                  </Space>
                }
                extra={
                  <Button size="small" onClick={() => router.push(`/workflows/${params.id}/edit?tab=team`)}>
                    管理团队
                  </Button>
                }
                className="mb-6"
              >
                {workflowAgents.length === 0 ? (
                  <Alert
                    type="warning"
                    message="还没有添加 Agent"
                    description="请先为工作流添加 Agent 团队才能执行工作流。"
                    action={
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => router.push(`/workflows/${params.id}/edit?tab=team`)}
                      >
                        添加 Agent
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {mainAgent && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <Space>
                            <Tag color="gold">主 Agent</Tag>
                            <Tag color={getAgentRoleColor(mainAgent.role)}>{mainAgent.role}</Tag>
                            <Text strong>{mainAgent.name}</Text>
                          </Space>
                        </div>
                        <Text type="secondary" className="text-sm">
                          {mainAgent.description}
                        </Text>
                      </div>
                    )}
                    
                    {workflowAgents.filter(agent => agent.id !== workflow.mainAgentId).map(agent => (
                      <div key={agent.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Space>
                            <Tag color={getAgentRoleColor(agent.role)}>{agent.role}</Tag>
                            <Text>{agent.name}</Text>
                          </Space>
                        </div>
                        <Text type="secondary" className="text-sm">
                          {agent.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Execution Flow */}
              <Card 
                title="执行流程" 
                extra={
                  <Button size="small" disabled>
                    编辑流程
                  </Button>
                }
              >
                {workflow.executionFlow.stages.length === 0 ? (
                  <Alert
                    type="info"
                    message="还没有配置执行流程"
                    description="执行流程将在 Week 6 的可视化编排器中进行配置。"
                    icon={<InfoCircleOutlined />}
                  />
                ) : (
                  <div>
                    <Text>已配置 {workflow.executionFlow.stages.length} 个执行阶段</Text>
                  </div>
                )}
              </Card>
            </div>

            {/* Configuration */}
            <div>
              <Card title="执行配置" className="mb-6">
                <Space direction="vertical" className="w-full">
                  <div className="flex justify-between">
                    <Text type="secondary">最大执行时间</Text>
                    <Text>
                      <ClockCircleOutlined className="mr-1" />
                      {Math.floor(workflow.configuration.maxExecutionTime / 1000)}s
                    </Text>
                  </div>
                  
                  <div className="flex justify-between">
                    <Text type="secondary">自动重试</Text>
                    <Text>
                      {workflow.configuration.autoRetry ? (
                        <CheckCircleOutlined className="text-green-500" />
                      ) : (
                        <span className="text-gray-400">未启用</span>
                      )}
                    </Text>
                  </div>
                  
                  <div className="flex justify-between">
                    <Text type="secondary">通知提醒</Text>
                    <Text>
                      {workflow.configuration.notifications ? (
                        <CheckCircleOutlined className="text-green-500" />
                      ) : (
                        <span className="text-gray-400">未启用</span>
                      )}
                    </Text>
                  </div>
                </Space>
              </Card>

              {/* Quick Actions */}
              <Card title="快速操作">
                <Space direction="vertical" className="w-full">
                  <Button 
                    block 
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    编辑工作流
                  </Button>
                  <Button 
                    block 
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleExecute}
                    disabled={workflow.agentIds.length === 0}
                  >
                    执行工作流
                  </Button>
                </Space>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
