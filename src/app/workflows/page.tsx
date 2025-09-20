'use client';

import { useState } from 'react';
import { 
  Button, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Modal, 
  message 
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined 
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useWorkflows } from '@/hooks/useWorkflows';
import { WorkflowCard } from '@/components/workflows/WorkflowCard';
import { PageHeader, LoadingState, ErrorBoundary } from '@/components';
import { WorkflowConfig } from '@/lib/types';

const { Title } = Typography;
const { Option } = Select;

export default function WorkflowsPage() {
  const router = useRouter();
  const { 
    workflows, 
    isLoading, 
    error, 
    deleteWorkflow, 
    isDeleting 
  } = useWorkflows();
  
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowConfig | null>(null);

  // Filter workflows based on search and status
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchValue || 
      workflow.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchValue.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = !!workflow.metadata.lastExecuted;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !workflow.metadata.lastExecuted;
    }
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateWorkflow = () => {
    router.push('/workflows/create');
  };

  const handleEditWorkflow = (workflow: WorkflowConfig) => {
    router.push(`/workflows/${workflow.id}/edit`);
  };

  const handleDeleteWorkflow = (workflow: WorkflowConfig) => {
    setWorkflowToDelete(workflow);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!workflowToDelete) return;

    try {
      await deleteWorkflow(workflowToDelete.id);
      setDeleteModalVisible(false);
      setWorkflowToDelete(null);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleExecuteWorkflow = (workflow: WorkflowConfig) => {
    if (workflow.agentIds.length === 0) {
      message.warning('请先为工作流添加 Agent');
      router.push(`/workflows/${workflow.id}/edit`);
      return;
    }
    
    router.push(`/workflows/${workflow.id}/execute`);
  };

  if (error) {
    return (
      <div className="p-6">
        <PageHeader 
          title="工作流管理" 
          description="无法加载工作流列表"
        />
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">加载工作流时出现错误</p>
          <Button onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        <div className="workflow-list-page p-6">
        <PageHeader
          title="工作流管理"
          description="创建和管理多 Agent 协作工作流"
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateWorkflow}
              size="large"
            >
              创建工作流
            </Button>
          }
        />

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <Space size="large" wrap>
            <div>
              <Input
                placeholder="搜索工作流名称或描述"
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
            </div>
            <div>
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="all">全部</Option>
                <Option value="active">已执行</Option>
                <Option value="inactive">未执行</Option>
              </Select>
            </div>
          </Space>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <LoadingState message="加载工作流中..." />
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              {workflows.length === 0 ? (
                <div>
                  <Title level={4} type="secondary">
                    还没有创建任何工作流
                  </Title>
                  <p className="text-gray-500 mb-6">
                    创建您的第一个工作流，开始多 Agent 协作之旅
                  </p>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleCreateWorkflow}
                    size="large"
                  >
                    创建第一个工作流
                  </Button>
                </div>
              ) : (
                <div>
                  <Title level={4} type="secondary">
                    没有找到匹配的工作流
                  </Title>
                  <p className="text-gray-500">
                    尝试调整搜索条件或创建新的工作流
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <Row gutter={[24, 24]}>
                {filteredWorkflows.map((workflow) => (
                  <Col 
                    key={workflow.id} 
                    xs={24} 
                    sm={12} 
                    lg={8} 
                    xl={6}
                  >
                    <WorkflowCard
                      workflow={workflow}
                      onEdit={handleEditWorkflow}
                      onDelete={handleDeleteWorkflow}
                      onExecute={handleExecuteWorkflow}
                    />
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          title="确认删除工作流"
          open={deleteModalVisible}
          onOk={confirmDelete}
          onCancel={() => {
            setDeleteModalVisible(false);
            setWorkflowToDelete(null);
          }}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ 
            danger: true, 
            loading: isDeleting 
          }}
        >
          {workflowToDelete && (
            <div>
              <p>确定要删除工作流 <strong>"{workflowToDelete.name}"</strong> 吗？</p>
              <p className="text-gray-500 text-sm mt-2">
                此操作不可撤销，工作流的所有配置和历史记录都将被永久删除。
              </p>
            </div>
          )}
        </Modal>
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
