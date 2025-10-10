// UTF-8
'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Card, Typography, Space, Form, Input, Select, Button, Switch, Tag, Divider, Statistic, Row, Col, Alert, message, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useAgents } from '@/hooks/useAgents';

const { Title, Paragraph, Text } = Typography;

type Flags = {
  enabled: boolean;
  shadowMode: boolean;
  agentAllowlist: string[];
  taskTypeAllowlist: string[];
};

export default function CoordinationDemoPage() {
  const { agents, agentsLoading, error } = useAgents();
  const [prompt, setPrompt] = useState('请规划并执行一个三步任务示例');
  const [planAgentId, setPlanAgentId] = useState<string>('');
  const [executeAgentId, setExecuteAgentId] = useState<string>('');
  const [summarizeAgentId, setSummarizeAgentId] = useState<string>('');
  const [flags, setFlags] = useState<Flags>({
    enabled: false,
    shadowMode: true,
    agentAllowlist: [],
    taskTypeAllowlist: ['plan', 'execute', 'summarize'],
  });

  useEffect(() => {
    if (!agentsLoading && agents.length > 0) {
      setPlanAgentId((s) => s || agents[0]?.id);
      setExecuteAgentId((s) => s || agents[1]?.id || agents[0]?.id);
      setSummarizeAgentId((s) => s || agents[2]?.id || agents[0]?.id);
    }
  }, [agentsLoading, agents]);

  const agentOptions = useMemo(
    () => agents.map((a) => ({ label: `${a.name}`, value: a.id })),
    [agents]
  );

  const taskTypeOptions = useMemo(
    () => [
      { label: '规划', value: 'plan' },
      { label: '执行', value: 'execute' },
      { label: '总结', value: 'summarize' },
    ],
    []
  );

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<any>({ metrics: null, tasksByAgent: {} });

  const run = async () => {
    if (!planAgentId || !executeAgentId || !summarizeAgentId) {
      message.warning('请先选择三个代理');
      return;
    }
    setRunning(true);
    try {
      const res = await fetch('/api/coordination-demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flags,
          prompt,
          stages: { planAgentId, executeAgentId, summarizeAgentId },
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error?.message || '启动编排失败');
      }
      const agentsParam = [planAgentId, executeAgentId, summarizeAgentId].join(',');
      const poll = async () => {
        const sres = await fetch(`/api/coordination-demo/status?agents=${encodeURIComponent(agentsParam)}`);
        const sdata = await sres.json();
        if (sdata?.success) setStatus(sdata.data);
      };
      await poll();
      setTimeout(poll, 1000);
      setTimeout(poll, 3000);
      setTimeout(() => {
        poll();
        setRunning(false);
      }, 6000);
    } catch (e: any) {
      message.error(e.message || '运行失败');
      setRunning(false);
    }
  };

  const mapStatus = (s: string) => {
    switch (s) {
      case 'completed': return '已完成';
      case 'running': return '运行中';
      case 'queued': return '排队中';
      case 'pending': return '等待中';
      case 'canceled': return '已取消';
      case 'failed': return '失败';
      default: return s;
    }
  };
  const mapType = (tp: string) => {
    switch (tp) {
      case 'plan': return '规划';
      case 'execute': return '执行';
      case 'summarize': return '总结';
      default: return tp;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>协调内核演示（影子/灰度）</Title>
      <Paragraph>
        本页面演示如何使用协调内核对三个阶段（规划 → 执行 → 总结）进行编排。默认影子模式，仅观察不干预；关闭影子并设置白名单后，才会使用新调度派发任务。
      </Paragraph>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title={<>
          特性开关（演示作用，影响当前进程）
          <Tooltip title="这些开关仅对本页面发起的演示请求生效，不会改动现有运行路径。">
            <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
          </Tooltip>
        </>}>
          <Space size="large" wrap>
            <div>
              <Text>
                启用新调度
                <Tooltip title="开启后，命中白名单的任务将由新内核派发；关闭则完全不启用新路径。">
                  <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
                ：
              </Text>
              <Switch checked={flags.enabled} onChange={(v) => setFlags({ ...flags, enabled: v })} />
            </div>
            <div>
              <Text>
                影子模式
                <Tooltip title="只观察（镜像）现有任务事件，不发出派发/取消等决策。用于上线前对账验证。">
                  <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
                ：
              </Text>
              <Switch checked={flags.shadowMode} onChange={(v) => setFlags({ ...flags, shadowMode: v })} />
            </div>
            <div>
              <Text>
                Agent 白名单
                <Tooltip title="只有名单中的代理才会走新调度；为空表示全部回退旧逻辑。">
                  <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
                ：
              </Text>
              <Select
                mode="tags"
                style={{ minWidth: 280 }}
                value={flags.agentAllowlist}
                onChange={(v) => setFlags({ ...flags, agentAllowlist: v })}
                placeholder="输入/选择允许使用新调度的 agentId"
                options={agentOptions}
              />
            </div>
            <div>
              <Text>
                任务类型白名单
                <Tooltip title="只有这些类型的任务才会走新调度；为空表示不启用。">
                  <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
                ：
              </Text>
              <Select
                mode="multiple"
                style={{ minWidth: 280 }}
                value={flags.taskTypeAllowlist}
                onChange={(v) => setFlags({ ...flags, taskTypeAllowlist: v })}
                placeholder="选择允许的新调度任务类型"
                options={taskTypeOptions}
              />
            </div>
          </Space>
        </Card>

        <Card title="选择代理与输入任务">
          <Form layout="vertical">
            <Form.Item label="任务描述（提示词）">
              <Input.TextArea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="请输入要完成的任务" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="规划代理">
                  <Select loading={agentsLoading} options={agentOptions} value={planAgentId} onChange={setPlanAgentId} placeholder="选择计划代理" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="执行代理">
                  <Select loading={agentsLoading} options={agentOptions} value={executeAgentId} onChange={setExecuteAgentId} placeholder="选择执行代理" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="总结代理">
                  <Select loading={agentsLoading} options={agentOptions} value={summarizeAgentId} onChange={setSummarizeAgentId} placeholder="选择总结代理" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" loading={running} onClick={run}>运行编排</Button>
          </Form>
        </Card>

        <Card title={<>
          运行状态（快照）
          <Tooltip title="定时读取协调内核的统计信息，非实时推送；用于观察整体趋势。">
            <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
          </Tooltip>
        </>}>
          {status?.metrics ? (
            <Row gutter={16}>
              <Col span={4}><Statistic title="已指派" value={status.metrics.totalAssigned} /></Col>
              <Col span={4}><Statistic title="已完成" value={status.metrics.totalCompleted} /></Col>
              <Col span={4}><Statistic title="失败" value={status.metrics.totalFailed} /></Col>
              <Col span={4}><Statistic title="重试次数" value={status.metrics.totalRetried} /></Col>
              <Col span={4}><Statistic title="运行中" value={status.metrics.running} /></Col>
              <Col span={4}><Statistic title="排队中" value={status.metrics.queued} /></Col>
            </Row>
          ) : (
            <Text type="secondary">尚无数据，点击“运行编排”后查看。</Text>
          )}
          <Divider />
          <Row gutter={16}>
            {[planAgentId, executeAgentId, summarizeAgentId].filter(Boolean).map((aid) => (
              <Col span={8} key={aid}>
                <Title level={5}>代理 {aid}</Title>
                {(status.tasksByAgent?.[aid] || []).map((t: any) => {
                  const color = t.status === 'completed' ? 'green' : t.status === 'running' ? 'blue' : t.status === 'failed' ? 'red' : 'default';
                  return (
                    <div key={t.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed #eee' }}>
                      <Text code>{t.id}</Text>
                      <Tag color={color} style={{ marginLeft: 8 }}>
                        {mapStatus(t.status)}
                      </Tag>
                      <Text type="secondary" style={{ marginLeft: 8 }}>{mapType(t.type)}</Text>
                      {t.output && (
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                          {t.output}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Col>
            ))}
          </Row>
        </Card>
      </Space>
    </div>
  );
}

