// UTF-8
'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Space, Form, Input, Select, Button, Switch, Tag, Divider, Row, Col, Tooltip, message, Table, Modal, Popconfirm } from 'antd';
import { QuestionCircleOutlined, PlayCircleOutlined, HistoryOutlined, DeleteOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useAgents } from '@/hooks/useAgents';

const { Title, Paragraph, Text } = Typography;

type Flags = { enabled?: boolean; shadowMode?: boolean; agentAllowlist?: string[]; taskTypeAllowlist?: string[] };

export default function OrchestrationPage() {
  const { agents, agentsLoading } = useAgents();
  const agentOptions = useMemo(() => agents.map(a => ({ label: a.name, value: a.id })), [agents]);

  // 表单状态
  const [prompt, setPrompt] = useState('请以“规划→执行（2路并行）→总结”的方式完成任务；执行阶段两路分别从不同角度产出。');
  const [planAgentId, setPlanAgentId] = useState<string>('');
  const [executeAgentIds, setExecuteAgentIds] = useState<string[]>([]);
  const [summarizeAgentId, setSummarizeAgentId] = useState<string>('');
  const [flags, setFlags] = useState<Flags>({ enabled: false, shadowMode: true, agentAllowlist: [], taskTypeAllowlist: ['plan','execute','summarize'] });

  useEffect(() => {
    if (!agentsLoading && agents.length > 0) {
      setPlanAgentId((s) => s || agents[0]?.id);
      setExecuteAgentIds((s) => s.length ? s : [agents[1]?.id || agents[0]?.id, agents[2]?.id || agents[0]?.id].filter(Boolean));
      setSummarizeAgentId((s) => s || agents[3]?.id || agents[0]?.id);
    }
  }, [agentsLoading, agents]);

  // 实时输出
  const [runId, setRunId] = useState<string>('');
  const [log, setLog] = useState<any[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  const start = async () => {
    if (!prompt || !planAgentId || !summarizeAgentId || executeAgentIds.length === 0) {
      message.warning('请完善“提示词”和三个阶段所需的代理');
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
      // 连接流
      if (evtRef.current) { evtRef.current.close(); evtRef.current = null; }
      const ev = new EventSource(`/api/orchestration/stream?runId=${encodeURIComponent(id)}`);
      ev.onmessage = (e) => {
        try {
          const line = JSON.parse(e.data);
          setLog(prev => [...prev, line]);
        } catch {}
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
  const loadList = async () => {
    const res = await fetch('/api/orchestration/history');
    const data = await res.json();
    if (data?.success) setList(data.data || []);
  };
  useEffect(() => { loadList(); }, []);

  const columns = [
    { title: '运行ID', dataIndex: 'runId' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v==='completed'?'green':v==='failed'?'red':'blue'}>{v||'进行中'}</Tag> },
    { title: '开始时间', dataIndex: 'startedAt', render: (v: number) => v? new Date(v).toLocaleString(): '-' },
    { title: '结束时间', dataIndex: 'finishedAt', render: (v: number) => v? new Date(v).toLocaleString(): '-' },
    { title: '操作', key: 'op', render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<FileSearchOutlined />} onClick={async ()=>{ const res=await fetch(`/api/orchestration/history/${r.runId}`); const d=await res.json(); if(d?.success) setDetail(d.data); }}>查看</Button>
        <Popconfirm title="确认删除?" onConfirm={async ()=>{ await fetch(`/api/orchestration/history/${r.runId}`,{method:'DELETE'}); loadList(); }}> 
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  const mapStatus = (s: string) => {
    switch (s) { case 'completed': return '已完成'; case 'running': return '进行中'; case 'failed': return '失败'; default: return s; }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>智能体编排</Title>
      <Paragraph>通过“规划 → 执行（可并行） → 总结”的方式，组织多个代理完成复杂任务。支持影子/灰度开关、历史留存与实时输出。</Paragraph>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title={<>
          实时编排
          <Tooltip title="此处设置只影响本页发起的运行，不会修改全局配置。"><QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} /></Tooltip>
        </>} extra={<Button type="primary" icon={<PlayCircleOutlined />} onClick={start}>开始运行</Button>}>
          <Row gutter={16}>
            <Col span={12}>
              <Form layout="vertical">
                <Form.Item label={<>提示词 <Tooltip title="清晰描述要完成的目标"><QuestionCircleOutlined /></Tooltip></>}>
                  <Input.TextArea rows={4} value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="请输入要完成的任务" />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label={<>规划代理 <Tooltip title="负责把任务拆解为步骤与依赖"><QuestionCircleOutlined /></Tooltip></>}>
                      <Select options={agentOptions} value={planAgentId} onChange={setPlanAgentId} loading={agentsLoading} placeholder="选择代理" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<>执行代理（可多选并行） <Tooltip title="多个执行代理会并行产出"><QuestionCircleOutlined /></Tooltip></>}>
                      <Select mode="multiple" options={agentOptions} value={executeAgentIds} onChange={setExecuteAgentIds} loading={agentsLoading} placeholder="选择1个或多个" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<>总结代理 <Tooltip title="汇总前序结果，输出最终结论"><QuestionCircleOutlined /></Tooltip></>}>
                      <Select options={agentOptions} value={summarizeAgentId} onChange={setSummarizeAgentId} loading={agentsLoading} placeholder="选择代理" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label={<>启用新调度 <Tooltip title="命中白名单才会走新内核；关闭则只做影子对账"><QuestionCircleOutlined /></Tooltip></>}>
                      <Switch checked={!!flags.enabled} onChange={(v)=>setFlags({ ...flags, enabled: v })} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<>影子模式 <Tooltip title="只观察现有事件，不发出指派决策"><QuestionCircleOutlined /></Tooltip></>}>
                      <Switch checked={!!flags.shadowMode} onChange={(v)=>setFlags({ ...flags, shadowMode: v })} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<>任务类型白名单 <Tooltip title="这些类型才会使用新调度"><QuestionCircleOutlined /></Tooltip></>}>
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
                  {log.length === 0 && <Text type="secondary">等待启动或输出中…</Text>}
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        <Card title={<>
          历史记录
          <Tooltip title="保存在 data/coordination-runs 下，可查看事件与结果"><QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} /></Tooltip>
        </>} extra={<Button icon={<HistoryOutlined />} onClick={loadList}>刷新</Button>}>
          <Table rowKey="runId" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle"/>
        </Card>
      </Space>

      <Modal open={!!detail} title="运行详情" width={880} onCancel={()=>setDetail(null)} footer={null}>
        {detail ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>运行ID：<Text code>{detail.runId}</Text></Text>
            <Text>状态：<Tag color={detail.status==='completed'?'green':detail.status==='failed'?'red':'blue'}>{mapStatus(detail.status||'running')}</Tag></Text>
            <Text>开始时间：{detail.startedAt? new Date(detail.startedAt).toLocaleString() : '-'}</Text>
            <Text>结束时间：{detail.finishedAt? new Date(detail.finishedAt).toLocaleString() : '-'}</Text>
            <Divider/>
            <Text strong>规划输出</Text>
            <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 6 }}>{detail.planText || '—'}</div>
            <Text strong>执行输出（并行）</Text>
            <div>
              {(detail.execResults||[]).map((r:any, idx:number)=> (
                <Card key={idx} size="small" style={{ marginBottom: 8 }} title={`执行 ${idx+1}`}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{r.text}</div>
                </Card>
              ))}
              {(!detail.execResults || detail.execResults.length===0) && <Text type="secondary">—</Text>}
            </div>
            <Text strong>总结输出</Text>
            <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 6 }}>{detail.sumText || '—'}</div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}

