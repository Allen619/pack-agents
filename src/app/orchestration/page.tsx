// UTF-8
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Card,
  Typography,
  Space,
  Form,
  Input,
  Select,
  Button,
  Switch,
  Tag,
  Divider,
  Row,
  Col,
  Tooltip,
  message,
  Table,
  Modal,
  Popconfirm,
  Collapse,
} from 'antd';
import { QuestionCircleOutlined, PlayCircleOutlined, HistoryOutlined, DeleteOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useAgents } from '@/hooks/useAgents';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';

const { Title, Paragraph, Text } = Typography;

type Flags = { enabled?: boolean; shadowMode?: boolean; agentAllowlist?: string[]; taskTypeAllowlist?: string[] };

export default function OrchestrationPage() {
  const { agents, agentsLoading } = useAgents();
  const agentOptions = useMemo(() => agents.map(a => ({ label: a.name, value: a.id })), [agents]);

  // 表单状态
  const [prompt, setPrompt] = useState('请以“规划 → 执行（可并行）→ 总结”的方式完成任务。');
  const [planAgentId, setPlanAgentId] = useState<string>('');
  const [executeAgentIds, setExecuteAgentIds] = useState<string[]>([]);
  const [summarizeAgentId, setSummarizeAgentId] = useState<string>('');
  const [flags, setFlags] = useState<Flags>({ enabled: false, shadowMode: true, agentAllowlist: [], taskTypeAllowlist: ['plan', 'execute', 'summarize'] });

  useEffect(() => {
    if (!agentsLoading && agents.length > 0) {
      setPlanAgentId((s) => s || agents[0]?.id);
      setExecuteAgentIds((s) => (s.length ? s : [agents[1]?.id || agents[0]?.id].filter(Boolean) as string[]));
      setSummarizeAgentId((s) => s || agents[2]?.id || agents[0]?.id);
    }
  }, [agentsLoading, agents]);

  // 实时输出
  const [runId, setRunId] = useState<string>('');
  const [log, setLog] = useState<any[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  const start = async () => {
    if (!prompt || !planAgentId || !summarizeAgentId || executeAgentIds.length === 0) {
      message.warning('请完善提示词与三个阶段的代理设置');
      return;
    }
    try {
      const res = await fetch('/api/orchestration/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags, prompt, planAgentId, executeAgentIds, summarizeAgentId })
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || '启动失败');
      const id = data.data.runId as string;
      setRunId(id);
      setLog([]);
      if (evtRef.current) { evtRef.current.close(); evtRef.current = null; }
      const ev = new EventSource(`/api/orchestration/stream?runId=${encodeURIComponent(id)}`);
      ev.onmessage = (e) => {
        try { const line = JSON.parse(e.data); setLog(prev => [...prev, line]); } catch {}
      };
      ev.onerror = () => { ev.close(); };
      evtRef.current = ev;
      message.success('已启动：实时输出已连接');
    } catch (e: any) {
      message.error(e.message || '启动失败');
    }
  };

  // 历史记录
  const [list, setList] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const loadList = async () => {
    const res = await fetch('/api/orchestration/history');
    const data = await res.json();
    if (data?.success) setList(data.data || []);
  };
  useEffect(() => { loadList(); }, []);

  const columns = [
    { title: '序号', key: 'index', width: 80, align: 'center' as const, render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1 },
    { title: '状态', dataIndex: 'status', render: (v: string) => {
        const zh = v === 'completed' ? '已完成' : v === 'failed' ? '失败' : '进行中';
        const color = v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'blue';
        return <Tag color={color}>{zh}</Tag>;
      }
    },
    { title: '开始时间', dataIndex: 'startedAt', render: (v: number) => v ? new Date(v).toLocaleString() : '-' },
    { title: '结束时间', dataIndex: 'finishedAt', render: (v: number) => v ? new Date(v).toLocaleString() : '-' },
    { title: '操作', key: 'op', render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<FileSearchOutlined />} onClick={async ()=>{ const res=await fetch(`/api/orchestration/history/${r.runId}`); const d=await res.json(); if(d?.success) setDetail(d.data); }}>查看</Button>
        <Popconfirm title="确认删除？" onConfirm={async ()=>{ await fetch(`/api/orchestration/history/${r.runId}`,{method:'DELETE'}); loadList(); }}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  const mapStatus = (s: string) => {
    switch (s) {
      case 'completed': return '已完成';
      case 'running': return '进行中';
      case 'failed': return '失败';
      default: return s || '进行中';
    }
  };

  // Markdown 渲染（带语法高亮 + 过滤 (no content)）
  const md = markdownit({
    html: true,
    breaks: true,
    highlight: (code: string, lang: string) => {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return `<pre><code class=\"hljs ${lang}\">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
        }
        return `<pre><code class=\"hljs\">${hljs.highlightAuto(code).value}</code></pre>`;
      } catch {
        return `<pre><code class=\"hljs\">${markdownit().utils.escapeHtml(code)}</code></pre>`;
      }
    },
  });
  const renderMarkdown = (content?: string) => {
    const normalized = (content || '').trim();
    const safe = normalized.replace(/\(no content\)/g, '').trim();
    return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: md.render(safe) }} />;
  };

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={2}>智能体编排</Title>
        <Paragraph>通过“规划 → 执行（可并行）→ 总结”的方式，组织多个代理完成复杂任务。支持影子模式开关、历史留存与实时输出。</Paragraph>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="启动编排">
            <Row gutter={16}>
              <Col span={12}>
                <Form layout="vertical">
                  <Form.Item label="任务描述">
                    <Input.TextArea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="请输入要完成的任务" />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="规划代理"><Select loading={agentsLoading} options={agentOptions} value={planAgentId} onChange={setPlanAgentId} placeholder="选择规划代理" /></Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="执行代理（可多选）"><Select mode="multiple" loading={agentsLoading} options={agentOptions} value={executeAgentIds} onChange={setExecuteAgentIds} placeholder="选择执行代理" /></Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="总结代理"><Select loading={agentsLoading} options={agentOptions} value={summarizeAgentId} onChange={setSummarizeAgentId} placeholder="选择总结代理" /></Form.Item>
                    </Col>
                  </Row>
                  <Space>
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={start}>开始执行</Button>
                  </Space>
                  <Divider />
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label={<><span>启用新调度</span><Tooltip title="命中白名单才会走新内核；关闭则只做影子对账"><QuestionCircleOutlined style={{ marginLeft: 6 }} /></Tooltip></>}>
                        <Switch checked={!!flags.enabled} onChange={(v)=>setFlags({ ...flags, enabled: v })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label={<><span>影子模式</span><Tooltip title="只观察现有事件，不发出指派决策"><QuestionCircleOutlined style={{ marginLeft: 6 }} /></Tooltip></>}>
                        <Switch checked={!!flags.shadowMode} onChange={(v)=>setFlags({ ...flags, shadowMode: v })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label={<><span>任务类型白名单</span><Tooltip title="只有这些类型才会使用新调度"><QuestionCircleOutlined style={{ marginLeft: 6 }} /></Tooltip></>}>
                        <Select mode="multiple" value={flags.taskTypeAllowlist} onChange={(v)=>setFlags({ ...flags, taskTypeAllowlist: v })} options={[{label:'规划',value:'plan'},{label:'执行',value:'execute'},{label:'总结',value:'summarize'}]} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Col>
              <Col span={12}>
                <Card size="small" title="实时输出">
                  <div style={{ height: 320, overflow: 'auto', background: '#0b1020', color: '#cde1ff', padding: 12, borderRadius: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                    {log.map((l, idx)=> (
                      <div key={idx} style={{ marginBottom: 6 }}>
                        <Text style={{ color: '#8fb3ff' }}>[{new Date(l.at||Date.now()).toLocaleTimeString()}]</Text>
                        <Text style={{ marginLeft: 8, color: '#fff' }}>{l.type}</Text>
                        {l.stage && <Tag color="blue" style={{ marginLeft: 8 }}>{l.stage}</Tag>}
                        {l.taskId && <Text code style={{ marginLeft: 8 }}>{l.taskId}</Text>}
                        {l.text && <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{l.text}</div>}
                      </div>
                    ))}
                    {log.length === 0 && <Text type="secondary">等待启动或输出中...</Text>}
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>

          <Card title={<>
            历史记录
            <Tooltip title="保存在 data/coordination-runs 下，可查看事件与结果"><QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} /></Tooltip>
          </>} extra={<Button icon={<HistoryOutlined />} onClick={loadList}>刷新</Button>}>
            <Table
              rowKey="runId"
              columns={columns as any}
              dataSource={list}
              pagination={{ pageSize, onChange: (p, ps) => { setCurrentPage(p); setPageSize(ps || 10); } }}
              size="middle"
            />
          </Card>
        </Space>

        <Modal
          open={!!detail}
          title="运行详情"
          width={920}
          onCancel={()=>setDetail(null)}
          footer={null}
          bodyStyle={{ maxHeight: '72vh', overflowY: 'auto' }}
        >
          {detail ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>序号：{(list.findIndex(i=>i.runId===detail.runId) + 1) || '-'}</Text>
              <Text>状态：<Tag color={detail.status==='completed'?'green':detail.status==='failed'?'red':'blue'}>{mapStatus(detail.status||'running')}</Tag></Text>
              <Text>开始时间：{detail.startedAt? new Date(detail.startedAt).toLocaleString() : '-'}</Text>
              <Text>结束时间：{detail.finishedAt? new Date(detail.finishedAt).toLocaleString() : '-'}</Text>
              <Divider/>
              <Collapse defaultActiveKey={["summary"]}>
                <Collapse.Panel header="规划输出" key="plan">
                  <div style={{ maxHeight: 280, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                    {detail.planText ? renderMarkdown(detail.planText) : <Text type="secondary">暂无</Text>}
                  </div>
                </Collapse.Panel>
                <Collapse.Panel header="执行输出（并行）" key="exec">
                  <div>
                    {(detail.execResults||[]).map((r:any, idx:number)=> (
                      <Card key={idx} size="small" style={{ marginBottom: 8 }} title={`执行 ${idx+1}`}>
                        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                          {r?.text ? renderMarkdown(r.text) : <Text type="secondary">暂无</Text>}
                        </div>
                      </Card>
                    ))}
                    {(!detail.execResults || detail.execResults.length===0) && <Text type="secondary">暂无</Text>}
                  </div>
                </Collapse.Panel>
                <Collapse.Panel header="总结输出" key="summary">
                  <div style={{ maxHeight: 280, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                    {detail.sumText ? renderMarkdown(detail.sumText) : <Text type="secondary">暂无</Text>}
                  </div>
                </Collapse.Panel>
              </Collapse>
            </Space>
          ) : null}
        </Modal>
      </div>
    </AppLayout>
  );
}

