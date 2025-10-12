// UTF-8
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Typography, Space, Form, Input, Select, Button, Switch, Tag, Divider, Row, Col, Tooltip, message, Table, Modal, Popconfirm, Tabs } from 'antd';
import { QuestionCircleOutlined, PlayCircleOutlined, HistoryOutlined, DeleteOutlined, FileSearchOutlined, StopOutlined, FullscreenOutlined } from '@ant-design/icons';
import { useAgents } from '@/hooks/useAgents';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';

const { Title, Paragraph, Text } = Typography;

type Flags = { enabled?: boolean; shadowMode?: boolean; agentAllowlist?: string[]; taskTypeAllowlist?: string[] };

export default function OrchestrationPage() {
  const { agents, agentsLoading } = useAgents();
  const agentOptions = useMemo(() => agents.map(a => ({ label: a.name, value: a.id })), [agents]);

  // 表单状态
  const [prompt, setPrompt] = useState('');
  const [planAgentId, setPlanAgentId] = useState<string>('');
  const [executeAgentIds, setExecuteAgentIds] = useState<string[]>([]);
  const [summarizeAgentId, setSummarizeAgentId] = useState<string>('');
  const [flags, setFlags] = useState<Flags>({ enabled: false, shadowMode: false, agentAllowlist: [], taskTypeAllowlist: [] });

  // 实时输出
  const [runId, setRunId] = useState<string>('');
  const [log, setLog] = useState<any[]>([]);
  const evtRef = useRef<EventSource | null>(null);
  const [starting, setStarting] = useState(false);
  const canStart = !!prompt && !!planAgentId && executeAgentIds.length > 0 && !!summarizeAgentId;
  const idToName = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a.name])), [agents]);

  // 规划阶段交互：等待确认/修改
  const [awaitingPlan, setAwaitingPlan] = useState<boolean>(false);
  const [planCountdown, setPlanCountdown] = useState<number>(0);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const latestPlanTextRef = useRef<string>('');
  const [planPaused, setPlanPaused] = useState<boolean>(false);
  const [logFullscreen, setLogFullscreen] = useState<boolean>(false);

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

  const start = async () => {
    if (!canStart) {
      message.warning('请完善提示词与三个阶段的代理设置');
      return;
    }
    try {
      setStarting(true);
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
        try {
          const line = JSON.parse(e.data);
          setLog(prev => [...prev, line]);
          // 记录规划内容，供“修改”默认值
          if (line?.type === 'delta' && line?.stage === 'plan' && typeof line.text === 'string') {
            latestPlanTextRef.current = line.text;
          }
          // 等待确认事件
          if (line?.type === 'await' && line?.stage === 'plan') {
            setAwaitingPlan(true);
            const dl = typeof line.deadline === 'number' ? line.deadline : (Date.now() + 60_000);
            const remain = Math.max(0, Math.ceil((dl - Date.now()) / 1000));
            setPlanCountdown(remain);
            setPlanPaused(false);
          }
          if (line && line.type === 'result') {
            setStarting(false);
            setAwaitingPlan(false);
            try { loadList(); } catch {}
          }
        } catch {}
      };
      ev.onerror = () => { ev.close(); setStarting(false); };
      evtRef.current = ev;
      message.success('已启动：实时输出已连接');
    } catch (e: any) {
      message.error(e.message || '启动失败');
    }
  };

  // 编辑状态与计时暂停同步到后端
  useEffect(() => {
    if (!runId) return;
    fetch(`/api/orchestration/plan-edit/${encodeURIComponent(runId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editing: planPaused })
    }).catch(()=>{});
  }, [planPaused, runId]);

  const columns = [
    { title: '序号', key: 'index', width: 80, align: 'center' as const, render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1 },
    { title: '用户问题', dataIndex: 'prompt', ellipsis: true, render: (v: string) => v ? <Text title={v} className="text-xs">{v.length > 60 ? v.slice(0, 60) + '…' : v}</Text> : '-' },
    { title: '状态', dataIndex: 'status', render: (v: string) => {
        const zh = v === 'completed' ? '已完成' : v === 'failed' ? '失败' : v === 'terminated' ? '已终止' : '进行中';
        const color = v === 'completed' ? 'green' : v === 'failed' ? 'red' : v === 'terminated' ? 'orange' : 'blue';
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
      case 'terminated': return '已终止';
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
          return `<pre><code class="hljs ${lang}">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
        }
        return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`;
      } catch {
        return `<pre><code class="hljs">${markdownit().utils.escapeHtml(code)}</code></pre>`;
      }
    },
  });
  const renderMarkdown = (content?: string) => {
    const normalized = (content || '').trim();
    const safe = normalized.replace(/\(no content\)/g, '').trim();
    return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: md.render(safe) }} />;
  };

  // 倒计时与自动确认（规划阶段）
  useEffect(() => {
    if (!awaitingPlan || planPaused || planCountdown <= 0) return;
    const timer = setInterval(() => {
      setPlanCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (runId) {
            fetch(`/api/orchestration/confirm/${encodeURIComponent(runId)}`, { method: 'POST' }).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [awaitingPlan, planPaused, planCountdown, runId]);

  // 按钮处理：确认与修改
  const handleConfirmPlan = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/orchestration/confirm/${encodeURIComponent(runId)}`, { method: 'POST' });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || '确认失败');
      setLog(prev => [...prev, { type: 'info', stage: 'plan', at: Date.now(), text: '已确认计划' }]);
      setAwaitingPlan(false);
      message.success('已确认规划，进入执行阶段');
    } catch (e: any) {
      message.error(e?.message || '确认失败');
    }
  };

  const handleOpenEdit = () => {
    setEditText(latestPlanTextRef.current || '');
    setEditOpen(true);
    setPlanPaused(true);
  };

  const handleSubmitEdit = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/orchestration/submit-plan/${encodeURIComponent(runId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planText: editText })
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || '提交失败');
      setEditOpen(false);
      setLog(prev => [...prev, { type: 'info', stage: 'plan', at: Date.now(), text: '已确认计划（已采用用户修改）' }]);
      setAwaitingPlan(false);
      setPlanPaused(false);
      message.success('已提交修改后的规划，将进入执行阶段');
    } catch (e: any) {
      message.error(e?.message || '提交失败');
    }
  };

  const handleCancelEdit = async () => {
    setEditOpen(false);
    setPlanPaused(false);
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
                  <Divider />
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label={<><span>启用新调度</span><Tooltip title="命中白名单才会走新内核；关闭则只做影子对照"><QuestionCircleOutlined style={{ marginLeft: 6 }} /></Tooltip></>}>
                        <Switch
                          checked={!!flags.enabled}
                          onChange={(v)=>
                            setFlags(prev => (
                              v
                                ? { ...prev, enabled: true }
                                : { ...prev, enabled: false, shadowMode: false, taskTypeAllowlist: [] }
                            ))
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label={<><span>影子模式</span><Tooltip title="启用新调度关闭时，该项不可用"><QuestionCircleOutlined style={{ marginLeft: 6 }} /></Tooltip></>}>
                        <Switch
                          checked={!!flags.shadowMode}
                          onChange={(v)=>setFlags({ ...flags, shadowMode: v })}
                          disabled={!flags.enabled}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label={<><span>任务类型白名单</span><Tooltip title="仅在启用新调度时生效，用于限定新调度影响的阶段"><QuestionCircleOutlined style={{ marginLeft: 6 }} /></Tooltip></>}>
                        <Select
                          mode="multiple"
                          value={flags.taskTypeAllowlist}
                          onChange={(v)=>setFlags({ ...flags, taskTypeAllowlist: v })}
                          options={[{label:'规划',value:'plan'},{label:'执行',value:'execute'},{label:'总结',value:'summarize'}]}
                          disabled={!flags.enabled}
                          placeholder={flags.enabled ? '选择受新调度影响的任务类型' : '启用新调度后可选择'}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={start}
                      loading={starting}
                      disabled={!canStart || starting}
                    >
                      开始执行
                    </Button>
                  </Space>
                </Form>
              </Col>
              <Col span={12}>
                <Card size="small" title="实时输出"
                  extra={
                    <Space size={4}>
                      <Tooltip title="全屏显示">
                        <Button size="small" type="text" icon={<FullscreenOutlined />} onClick={()=>setLogFullscreen(true)} />
                      </Tooltip>
                      <Tooltip title={runId ? '终止当前运行' : '暂无运行'}>
                        <Button size="small" danger type="text" icon={<StopOutlined />}
                          disabled={!runId || starting}
                          onClick={async ()=>{
                            if(!runId) return;
                            try{
                              const res = await fetch(`/api/orchestration/cancel/${encodeURIComponent(runId)}`,{ method:'POST' });
                              const data = await res.json();
                              if(!data?.success) throw new Error(data?.error?.message||'终止失败');
                              message.success('已终止当前运行');
                              try { loadList(); } catch {}
                            }catch(e:any){
                              message.error(e?.message||'终止失败');
                            }
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                >
                  <div style={{ height: 320, overflow: 'auto', background: '#0b1020', color: '#cde1ff', padding: 12, borderRadius: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                    {log.map((l, idx)=> {
                      const at = new Date(l.at || Date.now()).toLocaleTimeString();
                      let label = '信息';
                      let actor = '';
                      let text = l.text || '';
                      if (l.type === 'stage') {
                        if (l.stage === 'plan') {
                          label = '规划';
                          actor = idToName[planAgentId] ? `（${idToName[planAgentId]}）` : '';
                        } else if (typeof l.stage === 'string' && l.stage.startsWith('execute-')) {
                          label = '执行';
                          const n = Number(l.stage.split('-')[1]);
                          const name = executeAgentIds[n-1] ? idToName[executeAgentIds[n-1]] : undefined;
                          actor = name ? `（通道${n} · ${name}）` : `（通道${n}）`;
                        } else if (l.stage === 'summarize') {
                          label = '总结';
                          actor = idToName[summarizeAgentId] ? `（${idToName[summarizeAgentId]}）` : '';
                        }
                      } else if (l.type === 'result') {
                        label = '结果';
                      } else if (l.type === 'info') {
                        label = '信息';
                        actor = idToName[planAgentId] ? `（${idToName[planAgentId]}）` : '';
                        if (typeof text === 'string') {
                          text = text.replace(/运行\s+run_[^\s]+\s*/g, '').trim();
                        }
                      }
                      return (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <Text style={{ color: '#8fb3ff' }}>[{at}]</Text>
                          <Tag color={l.type === 'result' ? 'green' : (l.type === 'stage' ? 'blue' : 'default')} style={{ marginLeft: 8 }}>{label}</Tag>
                          {actor && <Text style={{ marginLeft: 4, color: '#cde1ff' }}>{actor}</Text>}
                          {text && <div style={{ whiteSpace: 'pre-wrap', marginTop: 4, color: '#fff' }}>{text}</div>}
                        </div>
                      );
                    })}
                    {log.length === 0 && <Text type="secondary">等待启动或输出中...</Text>}

                    {awaitingPlan && (
                      <div style={{ marginTop: 12, padding: 12, border: '1px dashed #2b5cff', borderRadius: 6, background: '#0f1730' }}>
                        <Space>
                          <Text style={{ color: '#fff' }}>规划已生成，请确认是否继续执行</Text>
                          <Tag color="blue">{planPaused ? '倒计时 暂停' : `倒计时 ${planCountdown}s`}</Tag>
                          <Button size="small" onClick={handleOpenEdit}>修改</Button>
                          <Button size="small" type="primary" onClick={handleConfirmPlan}>确认</Button>
                        </Space>
                      </div>
                    )}
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
              pagination={{ pageSize, onChange: (p, ps) => { setCurrentPage(p); setPageSize(ps || 10); }, showTotal: (total) => `共 ${total} 条` }}
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
              <Text>状态：<Tag color={detail.status==='completed'?'green':detail.status==='failed'?'red':detail.status==='terminated'?'orange':'blue'}>{mapStatus(detail.status||'running')}</Tag></Text>
              <Text>开始时间：{detail.startedAt? new Date(detail.startedAt).toLocaleString() : '-'}</Text>
              <Text>结束时间：{detail.finishedAt? new Date(detail.finishedAt).toLocaleString() : '-'}</Text>
              <Text>用户问题：{detail.prompt || '-'}</Text>
              <Divider/>
              <Tabs
                defaultActiveKey="plan"
                items={[
                  {
                    key: 'plan',
                    label: '规划代理',
                    children: (
                      <div style={{ maxHeight: 320, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                        {detail.planText ? renderMarkdown(detail.planText) : <Text type="secondary">暂无</Text>}
                      </div>
                    )
                  },
                  {
                    key: 'execute',
                    label: '执行代理',
                    children: (
                      <div style={{ background: '#fafafa', padding: 8, borderRadius: 6 }}>
                        {(detail.execResults && detail.execResults.length > 0) ? (
                          <Tabs
                            size="小"
                            items={(detail.execResults as any[]).map((r, idx) => ({
                              key: String(idx + 1),
                              label: `通道 ${idx + 1}`,
                              children: (
                                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                  {r?.text ? renderMarkdown(r.text) : <Text type="secondary">暂无</Text>}
                                </div>
                              )
                            }))}
                          />
                        ) : (
                          <Text type="secondary">暂无</Text>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'summary',
                    label: '总结代理',
                    children: (
                      <div style={{ maxHeight: 320, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                        {detail.sumText ? renderMarkdown(detail.sumText) : <Text type="secondary">暂无</Text>}
                      </div>
                    )
                  }
                ]}
              />
            </Space>
          ) : null}
        </Modal>
      </div>

      {/* 修改规划内容弹窗 */}
      <Modal
        open={editOpen}
        title="修改规划内容"
        width={920}
        onCancel={handleCancelEdit}
        onOk={handleSubmitEdit}
        okText="提交并继续"
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form layout="vertical">
              <Form.Item label="编辑（Markdown）">
                <Input.TextArea rows={16} value={editText} onChange={(e)=>setEditText(e.target.value)} placeholder="在此编辑规划内容（Markdown）" />
              </Form.Item>
            </Form>
          </Col>
          <Col span={12}>
            <div style={{ background: '#fafafa', padding: 8, height: '100%', borderRadius: 6, overflowY: 'auto' }}>
              {editText ? renderMarkdown(editText) : <Text type="secondary">输入内容后预览效果</Text>}
            </div>
          </Col>
        </Row>
      </Modal>

      {/* 实时输出全屏显示 */}
      <Modal
        open={logFullscreen}
        title="实时输出"
        width={1200}
        footer={null}
        onCancel={()=>setLogFullscreen(false)}
        bodyStyle={{ maxHeight: '72vh', overflowY: 'auto', background: '#0b1020' }}
      >
        <div style={{ color: '#cde1ff', padding: 12, borderRadius: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
          {log.map((l, idx)=> {
            const at = new Date(l.at || Date.now()).toLocaleTimeString();
            let label = '信息';
            let actor = '';
            let text = l.text || '';
            if (l.type === 'stage') {
              if (l.stage === 'plan') {
                label = '规划';
                actor = idToName[planAgentId] ? `（${idToName[planAgentId]}）` : '';
              } else if (typeof l.stage === 'string' && l.stage.startsWith('execute-')) {
                label = '执行';
                const n = Number(l.stage.split('-')[1]);
                const name = executeAgentIds[n-1] ? idToName[executeAgentIds[n-1]] : undefined;
                actor = name ? `（通道${n} · ${name}）` : `（通道${n}）`;
              } else if (l.stage === 'summarize') {
                label = '总结';
                actor = idToName[summarizeAgentId] ? `（${idToName[summarizeAgentId]}）` : '';
              }
            } else if (l.type === 'result') {
              label = '结果';
            } else if (l.type === 'info') {
              label = '信息';
              actor = idToName[planAgentId] ? `（${idToName[planAgentId]}）` : '';
              if (typeof text === 'string') {
                text = text.replace(/运行\s+run_[^\s]+\s*/g, '').trim();
              }
            }
            return (
              <div key={idx} style={{ marginBottom: 8 }}>
                <Text style={{ color: '#8fb3ff' }}>[{at}]</Text>
                <Tag color={l.type === 'result' ? 'green' : (l.type === 'stage' ? 'blue' : 'default')} style={{ marginLeft: 8 }}>{label}</Tag>
                {actor && <Text style={{ marginLeft: 4, color: '#cde1ff' }}>{actor}</Text>}
                {text && <div style={{ whiteSpace: 'pre-wrap', marginTop: 4, color: '#fff' }}>{text}</div>}
              </div>
            );
          })}
          {log.length === 0 && <Text type="secondary">等待启动或输出中...</Text>}

          {awaitingPlan && (
            <div style={{ marginTop: 12, padding: 12, border: '1px dashed #2b5cff', borderRadius: 6, background: '#0f1730' }}>
              <Space>
                <Text style={{ color: '#fff' }}>规划已生成，请确认是否继续执行</Text>
                <Tag color="blue">{planPaused ? '倒计时 暂停' : `倒计时 ${planCountdown}s`}</Tag>
                <Button size="small" onClick={handleOpenEdit}>修改</Button>
                <Button size="small" type="primary" onClick={handleConfirmPlan}>确认</Button>
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
