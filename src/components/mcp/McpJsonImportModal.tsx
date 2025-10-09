'use client';

import { useEffect } from 'react';
import { Modal, Form, Input, Alert } from 'antd';

const { TextArea } = Input;

export interface McpJsonImportModalProps {
  open: boolean;
  loading?: boolean;
  initialJson?: string;
  onSubmit: (jsonText: string) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  jsonText: string;
}

export function McpJsonImportModal({
  open,
  loading = false,
  initialJson = `[
  {
    "id": "example-id",
    "name": "example",
    "command": "node",
    "args": ["./mcp/index.js"]
  }
]`,
  onSubmit,
  onCancel,
}: McpJsonImportModalProps) {
  const [form] = Form.useForm<FormState>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ jsonText: initialJson });
    } else {
      form.resetFields();
    }
  }, [open, initialJson, form]);

  const handleFinish = async (values: FormState) => {
    await onSubmit(values.jsonText);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title="JSON 导入 MCP 服务"
      width={720}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="格式说明"
        description="支持导入单个对象或对象数组，字段需符合 MCPServerInput 结构。"
      />
      <Form<FormState>
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          name="jsonText"
          label="JSON 配置"
          rules={[
            { required: true, message: '请输入 JSON 配置' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                try {
                  JSON.parse(value);
                  return Promise.resolve();
                } catch (error) {
                  return Promise.reject(new Error('JSON 语法错误'));
                }
              },
            },
          ]}
        >
          <TextArea rows={14} placeholder="粘贴 MCP 配置 JSON" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default McpJsonImportModal;
