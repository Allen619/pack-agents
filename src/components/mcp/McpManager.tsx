'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Tooltip,
  Empty,
  Modal,
  Divider,
  message,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ApiOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ColumnsType } from 'antd/es/table';
import { useMcp } from '@/hooks/useMcp';
import {
  MCPServerDefinition,
  MCPServerInput,
} from '@/lib/types';
import McpFormModal from './McpFormModal';
import McpJsonImportModal from './McpJsonImportModal';

const { Text, Title } = Typography;

const STATUS_COLOR: Record<'active' | 'disabled', string> = {
  active: 'blue',
  disabled: 'default',
};

export function McpManager() {
  const { servers, loading, error, createServer, updateServer, deleteServer, refresh } = useMcp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MCPServerDefinition | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonSubmitting, setJsonSubmitting] = useState(false);

  const handleCreate = useCallback(() => {
    setEditing(undefined);
    setModalOpen(true);
  }, []);

  const handleOpenJsonImport = useCallback(() => {
    setJsonModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: MCPServerDefinition) => {
    setEditing(record);
    setModalOpen(true);
  }, []);

  const handleRemove = useCallback(
    (record: MCPServerDefinition) => {
      Modal.confirm({
        title: `确认删除 MCP “${record.name}” 吗？`,
        content: '删除后将无法在 LLM 会话中使用该 MCP。',
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: async () => {
          await deleteServer(record.id);
        },
      });
    },
    [deleteServer]
  );

  const handleSubmit = useCallback(
    async (values: MCPServerInput) => {
      setSubmitting(true);
      try {
        if (editing) {
          await updateServer(editing.id, values);
        } else {
          await createServer(values);
        }
        setModalOpen(false);
        setEditing(undefined);
      } finally {
        setSubmitting(false);
      }
    },
    [createServer, editing, updateServer]
  );

  const handleJsonImport = useCallback(
    async (jsonText: string) => {
      setJsonSubmitting(true);
      try {
        const parsed = JSON.parse(jsonText);
        const entries = Array.isArray(parsed) ? parsed : [parsed];
        if (!entries.length) {
          throw new Error('JSON 未包含任何 MCP 配置');
        }

        let created = 0;
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') {
            throw new Error('JSON 结构必须为对象或对象数组');
          }

          const input: MCPServerInput = {
            name: typeof entry.name === 'string' ? entry.name.trim() : '',
            description:
              typeof entry.description === 'string'
                ? entry.description.trim()
                : undefined,
            command: typeof entry.command === 'string' ? entry.command.trim() : '',
            args: Array.isArray(entry.args) ? entry.args : [],
            env:
              entry.env && typeof entry.env === 'object'
                ? (entry.env as Record<string, string>)
                : {},
            status:
              entry.status === 'disabled' || entry.status === 'active'
                ? entry.status
                : 'active',
            timeout:
              typeof entry.timeout === 'number' ? entry.timeout : undefined,
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            providers: Array.isArray(entry.providers) ? entry.providers : [],
            supportedModels: Array.isArray(entry.supportedModels)
              ? entry.supportedModels
              : [],
            tools: Array.isArray(entry.tools) ? entry.tools : [],
          };

          if (!input.name || !input.command) {
            throw new Error('每个 MCP 对象必须包含 name 和 command 字段');
          }

          await createServer(input);
          created += 1;
        }

        message.success(`成功导入 ${created} 个 MCP 服务`);
        setJsonModalOpen(false);
      } catch (error: any) {
        message.error(error?.message || 'JSON 导入失败');
      } finally {
        setJsonSubmitting(false);
      }
    },
    [createServer]
  );

  const columns: ColumnsType<MCPServerDefinition> = useMemo(
    () => [
      {
        title: '服务名称',
        dataIndex: 'name',
        key: 'name',
        render: (_, record) => (
          <Space align="start" size={4} direction="vertical">
            <Space align="center">
              <ApiOutlined className="text-blue-500" />
              <Text strong>{record.name}</Text>
              <Tag color={STATUS_COLOR[record.status || 'active']}>
                {record.status === 'active' ? '启用' : '停用'}
              </Tag>
            </Space>
            {record.description && (
              <Text type="secondary" className="text-xs">
                {record.description}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: '适用提供商',
        dataIndex: 'providers',
        key: 'providers',
        render: (providers: string[] = []) =>
          providers.length ? (
            <Space wrap>
              {providers.map((provider) => (
                <Tag key={provider}>{provider}</Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">未指定</Text>
          ),
      },
      {
        title: '包含工具',
        dataIndex: 'tools',
        key: 'tools',
        render: (tools: { name: string }[] = []) =>
          tools.length ? (
            <Space wrap>
              {tools.map((tool) => (
                <Tag key={tool.name}>{tool.name}</Tag>
              ))}
            </Space>
          ) : (
            <Tag color="default">无</Tag>
          ),
      },
      {
        title: '最近更新',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 170,
        render: (value: string) => (
          <Text>{dayjs(value).format('YYYY-MM-DD HH:mm')}</Text>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemove(record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [handleEdit, handleRemove]
  );

  return (
    <Card
      title={
        <Space align="center">
          <Title level={4} style={{ margin: 0 }}>
            MCP 服务管理
          </Title>
          <Tooltip title="参阅 docs/claude-code-docs 了解 MCP 使用规范">
            <InfoCircleOutlined />
          </Tooltip>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={loading}>
            刷新
          </Button>
          <Button onClick={handleOpenJsonImport}>JSON 导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            快速导入
          </Button>
        </Space>
      }
    >
      {error && (
        <Text type="danger" className="block mb-4">
          {error}
        </Text>
      )}

      <Table<MCPServerDefinition>
        rowKey="id"
        loading={loading}
        dataSource={servers}
        columns={columns}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Empty description="尚未配置 MCP 服务">
              <Button type="link" onClick={handleCreate}>
                立即创建
              </Button>
            </Empty>
          ),
        }}
        expandable={{
          expandedRowRender: (record) => (
            <div className="space-y-2">
              <Divider dashed className="my-2" />
              <Text strong>启动命令</Text>
              <div className="font-mono text-sm bg-gray-50 px-3 py-1 rounded">
                {record.command} {record.args?.join(' ')}
              </div>
              {record.env && Object.keys(record.env).length > 0 && (
                <div>
                  <Text strong>环境变量</Text>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {Object.entries(record.env).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1 text-sm">
                        <span className="font-medium">{key}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {record.supportedModels && record.supportedModels.length > 0 && (
                <div>
                  <Text strong>推荐模型</Text>
                  <Space wrap className="mt-2">
                    {record.supportedModels.map((model) => (
                      <Tag key={model}>{model}</Tag>
                    ))}
                  </Space>
                </div>
              )}
              {record.tags && record.tags.length > 0 && (
                <div>
                  <Text strong>标签</Text>
                  <Space wrap className="mt-2">
                    {record.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          ),
        }}
      />

      <McpFormModal
        open={modalOpen}
        loading={submitting}
        initialValues={editing}
        onSubmit={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
      />
      <McpJsonImportModal
        open={jsonModalOpen}
        loading={jsonSubmitting}
        onSubmit={handleJsonImport}
        onCancel={() => setJsonModalOpen(false)}
      />
    </Card>
  );
}

export default McpManager;
