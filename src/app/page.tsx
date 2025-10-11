'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Space, Typography, Alert, Statistic, Row, Col } from 'antd';
import { RobotOutlined, ShareAltOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';
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
    const cachedData = getCachedDashboardData();
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    }
    loadDashboardData();
  }, []);

  const CACHE_KEY = 'dashboard_data';
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

  function getCachedDashboardData(): DashboardData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function setCachedDashboardData(value: DashboardData) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: value, timestamp: Date.now() }));
    } catch {}
  }

  async function loadDashboardData() {
    try {
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('/api/config', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result: ApiResponse<DashboardData> = await response.json();
      if (result.success) {
        setData(result.data);
        setCachedDashboardData(result.data);
      } else {
        setError(result.error?.message || '加载失败');
      }
    } catch (err: any) {
      setError(err?.name === 'AbortError' ? '请求超时，请重试' : '网络请求失败');
      console.error('Load dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function initializeConfig() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      if (result.success) {
        await loadDashboardData();
      } else {
        setError(result.error?.message || '初始化失败');
      }
    } catch (err: any) {
      setError(err?.name === 'AbortError' ? '初始化超时，请重试' : '初始化失败');
      console.error('Initialize config error:', err);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Text type="secondary">加载中...</Text>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {error && (
          <Alert
            type="error"
            message="加载失败"
            description={
              <div>
                <div className="mb-2">{error}</div>
                <Button onClick={initializeConfig} type="primary" size="small">
                  初始化配置后重试
                </Button>
              </div>
            }
            showIcon
          />
        )}

        {/* 概览统计 */}
        <div className="space-y-4">
          <Title level={3}>系统概览</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic title="模型助手总数" value={data?.stats.totalAgents || 0} prefix={<RobotOutlined />} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic title="工作流总数" value={data?.stats.totalWorkflows || 0} prefix={<ShareAltOutlined />} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic title="活跃执行" value={data?.stats.activeExecutions || 0} prefix={<PlayCircleOutlined />} valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center">
                <Statistic title="今日任务" value={0} prefix={<FileTextOutlined />} valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
          </Row>

          {/* 快速开始 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="快速开始" className="h-full" extra={<Link href="/agents">查看全部</Link>}>
                <Space direction="vertical" className="w-full">
                  <Button type="dashed" block icon={<RobotOutlined />} onClick={() => router.push('/agents/create')}>
                    创建新的模型助手
                  </Button>
                  <Button type="dashed" block icon={<FileTextOutlined />} onClick={() => router.push('/agents/templates')}>
                    使用模板
                  </Button>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="最近活动" className="h-full">
                {data?.activeExecutions && data.activeExecutions.length > 0 ? (
                  <div className="space-y-3">
                    {data.activeExecutions.slice(0, 5).map((execution) => (
                      <div key={execution.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                        <div>
                          <div className="font-medium">{execution.workflowId}</div>
                          <div className="text-sm text-gray-500">{execution.status} · {new Date(execution.metadata.startedAt).toLocaleString()}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(execution.status)}`}>{execution.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <PlayCircleOutlined className="mb-2 text-4xl" />
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
