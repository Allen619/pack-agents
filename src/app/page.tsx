'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Space, Typography, Spin, Alert, Statistic, Row, Col } from 'antd';
import { 
  RobotOutlined, 
  ShareAltOutlined, 
  PlayCircleOutlined,
  PlusOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiResponse, AgentConfig, WorkflowConfig, ExecutionRecord } from '@/types';

const { Title, Text } = Typography;

interface DashboardData {
  agents: AgentConfig[];
  workflows: WorkflowConfig[];
  activeExecutions: ExecutionRecord[];
  stats: {
    totalAgents: number;
    totalWorkflows: number;
    activeExecutions: number;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/config');
      const result: ApiResponse<DashboardData> = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error?.message || '加载失败');
      }
    } catch (err) {
      setError('网络请求失败');
      console.error('Load dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeConfig = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });

      const result = await response.json();
      if (result.success) {
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Initialize config error:', err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <Spin size="large" tip="加载中..." />
        </div>
      </AppLayout>
    );
  }

  if (error && !data) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Alert
              message="初始化失败"
              description={error}
              type="error"
              showIcon
              className="mb-4"
            />
            <Button type="primary" onClick={initializeConfig}>
              初始化配置系统
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Title level={2} className="mb-2">
              欢迎使用 Pack Agents
            </Title>
            <Text type="secondary">
              基于 Claude Code SDK 的多 Agent 工作流管理平台
            </Text>
          </div>

          {/* 统计卡片 */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic
                  title="Agent 总数"
                  value={data?.stats.totalAgents || 0}
                  prefix={<RobotOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic
                  title="工作流总数"
                  value={data?.stats.totalWorkflows || 0}
                  prefix={<ShareAltOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic
                  title="活跃执行"
                  value={data?.stats.activeExecutions || 0}
                  prefix={<PlayCircleOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic
                  title="今日任务"
                  value={0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 快速操作 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card 
                title="快速开始" 
                className="h-full"
                extra={<Link href="/agents">查看全部</Link>}
              >
                <Space direction="vertical" className="w-full">
                  <Button 
                    type="dashed" 
                    block 
                    icon={<RobotOutlined />}
                    onClick={() => router.push('/agents/create')}
                  >
                    创建新 Agent
                  </Button>
                  <Button 
                    type="dashed" 
                    block 
                    icon={<ShareAltOutlined />}
                    onClick={() => router.push('/workflows/create')}
                  >
                    创建工作流
                  </Button>
                  <Button 
                    type="dashed" 
                    block 
                    icon={<FileTextOutlined />}
                    onClick={() => router.push('/agents/templates')}
                  >
                    使用模板
                  </Button>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card 
                title="最近活动" 
                className="h-full"
                extra={<Link href="/executions">查看全部</Link>}
              >
                {data?.activeExecutions && data.activeExecutions.length > 0 ? (
                  <div className="space-y-3">
                    {data.activeExecutions.slice(0, 5).map((execution) => (
                      <div key={execution.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <div className="font-medium">{execution.workflowId}</div>
                          <div className="text-sm text-gray-500">
                            {execution.status} • {new Date(execution.metadata.startedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <PlayCircleOutlined className="text-4xl mb-2" />
                    <div>暂无活跃执行</div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </AppLayout>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'running':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
