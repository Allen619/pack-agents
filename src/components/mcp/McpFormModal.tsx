'use client';

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  InputNumber,
  Divider,
  Typography,
  Select,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { MCPServerDefinition, MCPServerInput, MCPServerStatus } from '@/lib/types';

const { TextArea } = Input;
const { Text } = Typography;

export interface McpFormModalProps {
  open: boolean;
  loading?: boolean;
  initialValues?: MCPServerDefinition;
  onSubmit: (values: MCPServerInput) => Promise<void>;
  onCancel: () => void;
}

interface EnvPair {
  key?: string;
  value?: string;
}

interface FormState {
  name: string;
  description?: string;
  command: string;
  args?: string[];
  envList?: EnvPair[];
  status: MCPServerStatus;
  timeout?: number;
}

function mapInitialValues(initial?: MCPServerDefinition): FormState {
  if (!initial) {
    return {
      name: '',
      description: '',
      command: '',
      args: [],
      envList: [],
      status: 'active',
      timeout: 300000,
    };
  }

  return {
    name: initial.name,
    description: initial.description,
    command: initial.command,
    args: initial.args || [],
    envList: Object.entries(initial.env || {}).map(([key, value]) => ({
      key,
      value,
    })),
    status: initial.status || 'active',
    timeout: initial.timeout,
  };
}

function normalizeFormValues(
  values: FormState,
  initial?: MCPServerDefinition
): MCPServerInput {
  const env: Record<string, string> = {};
  (values.envList || []).forEach((pair) => {
    if (pair.key && pair.key.trim().length > 0) {
      env[pair.key.trim()] = pair.value ?? '';
    }
  });

  const extras = initial
    ? {
        tags: initial.tags,
        providers: initial.providers,
        supportedModels: initial.supportedModels,
        tools: initial.tools,
      }
    : {
        tags: [],
        providers: [],
        supportedModels: [],
        tools: [],
      };

  return {
    name: values.name?.trim() ?? '',
    description: values.description?.trim() || undefined,
    command: values.command?.trim() ?? '',
    args: (values.args || [])
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0),
    env,
    status: values.status ?? 'active',
    timeout: values.timeout,
    ...extras,
  };
}

export function McpFormModal({
  open,
  loading = false,
  initialValues,
  onSubmit,
  onCancel,
}: McpFormModalProps) {
  const [form] = Form.useForm<FormState>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(mapInitialValues(initialValues));
    } else {
      form.resetFields();
    }
  }, [open, initialValues, form]);

  const handleFinish = async (values: FormState) => {
    const payload = normalizeFormValues(values, initialValues);
    await onSubmit(payload);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title={initialValues ? '编辑 MCP 服务' : '快速导入 MCP 服务'}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={640}
      destroyOnHidden
    >
      <Form<FormState>
        form={form}
        layout="vertical"
        initialValues={mapInitialValues(initialValues)}
        onFinish={handleFinish}
      >
        <Form.Item
          name="name"
          label="服务名称"
          rules={[{ required: true, message: '请输入 MCP 服务名称' }]}
        >
          <Input placeholder="例如 code-quality" allowClear />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="说明该 MCP 提供的主要能力" allowClear />
        </Form.Item>

        <Space size="large" className="w-full" align="start">
          <Form.Item
            name="command"
            label="启动命令"
            className="flex-1"
            rules={[{ required: true, message: '请输入可执行命令' }]}
          >
            <Input placeholder="例如 node" allowClear />
          </Form.Item>
          <Form.Item name="timeout" label="超时时间 (ms)" className="w-48">
            <InputNumber className="w-full" min={1000} step={1000} placeholder="可选" />
          </Form.Item>
          <Form.Item
            name="status"
            label="启用状态"
            className="w-44"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              options={[
                { value: 'active', label: '启用' },
                { value: 'disabled', label: '停用' },
              ]}
            />
          </Form.Item>
        </Space>

        <Form.Item label="启动参数">
          <Form.List name="args">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline">
                    <Form.Item
                      {...restField}
                      name={name}
                      rules={[{ required: true, message: '请输入参数值' }]}
                    >
                      <Input placeholder="例如 ./server.js" allowClear />
                    </Form.Item>
                    <Button
                      icon={<DeleteOutlined />}
                      type="text"
                      danger
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add('')}
                  block
                  icon={<PlusOutlined />}
                >
                  添加参数
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>

        <Divider orientation="left">环境变量</Divider>
        <Form.List name="envList">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              {fields.map(({ key, name, fieldKey, ...restField }) => (
                <Space key={key} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'key']}
                    fieldKey={[fieldKey, 'key']}
                    rules={[{ required: true, message: '请输入变量名' }]}
                  >
                    <Input placeholder="变量名" allowClear />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'value']}
                    fieldKey={[fieldKey, 'value']}
                  >
                    <Input placeholder="变量值" allowClear />
                  </Form.Item>
                  <Button
                    icon={<DeleteOutlined />}
                    type="text"
                    danger
                    onClick={() => remove(name)}
                  />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ key: '', value: '' })}
                block
                icon={<PlusOutlined />}
              >
                添加环境变量
              </Button>
            </div>
          )}
        </Form.List>

        {!initialValues && (
          <Text type="secondary" className="block">
            需要导入完整配置时，可使用 JSON 导入功能。
          </Text>
        )}
      </Form>
    </Modal>
  );
}

export default McpFormModal;
