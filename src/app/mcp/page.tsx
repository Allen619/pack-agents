'use client';

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import McpManager from '@/components/mcp/McpManager';
import { Alert } from 'antd';

export default function McpPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="MCP 服务中心"
          description="集中管理所有 Model Context Protocol 服务，配置后可在 LLM 对话中直接调用。"
        />

        <Alert
          type="info"
          showIcon
          message="提示"
          description="MCP 配置会写入 config/settings/mcp-servers.json，更多细节可参考 docs/claude-code-docs 中的 MCP 章节。"
        />

        <McpManager />
      </div>
    </AppLayout>
  );
}
