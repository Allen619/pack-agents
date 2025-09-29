'use client';

import { useState } from 'react';
import { 
  Button, 
  Input, 
  Select, 
  Row, 
  Col, 
  Space,
  Alert,
  Empty,
  Spin,
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { AgentCardMemo } from '@/components/agents/AgentCard';
import { useAgents } from '@/hooks/useAgents';
import { AgentConfig } from '@/types';

const { Search } = Input;
const { Option } = Select;

export default function AgentsPage() {
  const {
    agents,
    agentsLoading,
    templatesLoading,
    error,
    deleteAgent,
    refreshAgents
  } = useAgents();

  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // 过滤 agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = searchText === '' || 
      agent.name.toLowerCase().includes(searchText.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchText.toLowerCase()) ||
      agent.metadata.tags.some(tag => 
        tag.toLowerCase().includes(searchText.toLowerCase())
      );

    const matchesRole = roleFilter === 'all' || agent.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleEdit = (agent: AgentConfig) => {
    window.location.href = `/agents/${agent.id}/edit`;
  };

  const handleChat = (agent: AgentConfig) => {
    window.location.href = `/agents/${agent.id}/chat`;
  };

  const handleDelete = async (agent: AgentConfig) => {
    return await deleteAgent(agent.id);
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
        return '全部';
    }
  };

  const getAgentStats = () => {
    const total = agents.length;
    const byRole = agents.reduce((acc, agent) => {
      acc[agent.role] = (acc[agent.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byRole };
  };

  const stats = getAgentStats();

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader
          title="Agent 工厂"
          description="创建和管理您的 AI Agent"
          extra={
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={refreshAgents}
                loading={agentsLoading}
              >
                刷新
              </Button>
              <Link href="/agents/templates">
                <Button>
                  从模板创建
                </Button>
              </Link>
              <Link href="/agents/create">
                <Button type="primary" icon={<PlusOutlined />}>
                  创建 Agent
                </Button>
              </Link>
            </Space>
          }
        >
          {/* 统计信息 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">总 Agent 数</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{stats.byRole.main || 0}</div>
              <div className="text-sm text-gray-500">主管理 Agent</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats.byRole.sub || 0}</div>
              <div className="text-sm text-gray-500">子执行 Agent</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">{stats.byRole.synthesis || 0}</div>
              <div className="text-sm text-gray-500">总结 Agent</div>
            </div>
          </div>

          {/* 搜索和过滤 */}
          <div className="bg-white p-4 rounded-lg border mb-6">
            <Row gutter={16} align="middle">
              <Col span={12}>
                <Search
                  placeholder="搜索 Agent 名称、描述或标签..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={setSearchText}
                />
              </Col>
              <Col span={6}>
                <Select
                  value={roleFilter}
                  onChange={setRoleFilter}
                  size="large"
                  style={{ width: '100%' }}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">全部角色</Option>
                  <Option value="main">主管理</Option>
                  <Option value="sub">子执行</Option>
                  <Option value="synthesis">总结</Option>
                </Select>
              </Col>
              <Col span={6}>
                <div className="text-sm text-gray-500">
                  找到 {filteredAgents.length} 个 Agent
                </div>
              </Col>
            </Row>
          </div>
        </PageHeader>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="加载失败"
            description={error}
            type="error"
            action={
              <Button size="small" onClick={refreshAgents}>
                重试
              </Button>
            }
            className="mb-4"
            closable
          />
        )}

        {/* Agent 列表 */}
        <LoadingState loading={agentsLoading}>
          {filteredAgents.length === 0 ? (
            <div className="bg-white rounded-lg border p-8">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  agents.length === 0 
                    ? "还没有创建任何 Agent" 
                    : "没有找到匹配的 Agent"
                }
              >
                {agents.length === 0 && (
                  <Space>
                    <Link href="/agents/templates">
                      <Button>从模板创建</Button>
                    </Link>
                    <Link href="/agents/create">
                      <Button type="primary">创建 Agent</Button>
                    </Link>
                  </Space>
                )}
              </Empty>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredAgents.map(agent => (
                <Col key={agent.id} xs={24} sm={12} lg={8} xl={6}>
                  <AgentCardMemo
                    agent={agent}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onChat={handleChat}
                  />
                </Col>
              ))}
            </Row>
          )}
        </LoadingState>
      </div>
    </AppLayout>
  );
}
