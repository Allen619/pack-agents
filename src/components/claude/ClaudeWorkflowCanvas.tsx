'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Node, Edge, Background, Controls, MiniMap } from '@xyflow/react';
import { Card, Badge, Button, Typography, Space, Tooltip } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  EyeOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { ClaudeWorkflowConfig, WorkflowResult } from '@/lib/types';
import { generateId } from '@/lib/utils';

const { Title, Text } = Typography;

export interface ClaudeWorkflowCanvasProps {
  workflow: ClaudeWorkflowConfig;
  onExecute?: (workflowId: string, request: any) => void;
  onPause?: (executionId: string) => void;
  onStop?: (executionId: string) => void;
  onViewDetails?: (nodeId: string) => void;
  onConfigureNode?: (nodeId: string) => void;
  className?: string;
  height?: number | string;
  readonly?: boolean;
}

export interface WorkflowNode extends Node {
  data: {
    label: string;
    type: 'main' | 'sub' | 'start' | 'end';
    agentId?: string;
    specialty?: string;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
    progress?: number;
    metadata?: any;
  };
}

export interface WorkflowEdge extends Edge {
  data?: {
    condition?: string;
    weight?: number;
  };
}

/**
 * Claude 工作流画布组件 - 可视化展示和执行工作流
 */
export const ClaudeWorkflowCanvas: React.FC<ClaudeWorkflowCanvasProps> = ({
  workflow,
  onExecute,
  onPause,
  onStop,
  onViewDetails,
  onConfigureNode,
  className = '',
  height = '600px',
  readonly = false,
}) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<WorkflowResult | null>(null);

  // 初始化工作流节点和边
  useEffect(() => {
    const initializeWorkflow = () => {
      const newNodes: WorkflowNode[] = [];
      const newEdges: WorkflowEdge[] = [];

      // 创建开始节点
      newNodes.push({
        id: 'start',
        type: 'input',
        position: { x: 100, y: 100 },
        data: {
          label: '开始',
          type: 'start',
          status: 'idle',
        },
      });

      // 创建主协调Agent节点
      newNodes.push({
        id: workflow.mainAgent.agentId,
        type: 'default',
        position: { x: 300, y: 100 },
        data: {
          label: '主协调器',
          type: 'main',
          agentId: workflow.mainAgent.agentId,
          status: 'idle',
        },
      });

      // 从开始节点连接到主协调器
      newEdges.push({
        id: 'start-to-main',
        source: 'start',
        target: workflow.mainAgent.agentId,
        type: 'smoothstep',
      });

      // 创建专家Agent节点
      workflow.specialists.forEach((specialist, index) => {
        const nodeId = specialist.agentId;
        const yPosition = 200 + index * 120;

        newNodes.push({
          id: nodeId,
          type: 'default',
          position: { x: 500, y: yPosition },
          data: {
            label: specialist.specialty,
            type: 'sub',
            agentId: specialist.agentId,
            specialty: specialist.specialty,
            status: 'idle',
          },
        });

        // 从主协调器连接到专家
        newEdges.push({
          id: `main-to-${nodeId}`,
          source: workflow.mainAgent.agentId,
          target: nodeId,
          type: 'smoothstep',
        });
      });

      // 创建结束节点
      newNodes.push({
        id: 'end',
        type: 'output',
        position: { x: 700, y: 100 },
        data: {
          label: '结束',
          type: 'end',
          status: 'idle',
        },
      });

      // 从所有专家连接到结束节点
      workflow.specialists.forEach((specialist) => {
        newEdges.push({
          id: `${specialist.agentId}-to-end`,
          source: specialist.agentId,
          target: 'end',
          type: 'smoothstep',
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    };

    initializeWorkflow();
  }, [workflow]);

  // 处理工作流执行
  const handleExecute = useCallback(async () => {
    if (isExecuting || !onExecute) return;

    const executionId = generateId();
    setCurrentExecutionId(executionId);
    setIsExecuting(true);

    // 重置节点状态
    setNodes(prev => prev.map(node => ({
      ...node,
      data: { ...node.data, status: 'idle', progress: 0 }
    })));

    try {
      const request = {
        description: '执行工作流',
        priority: 'normal' as const,
        timeout: 300000, // 5分钟
      };

      await onExecute(workflow.id, request);

      // 模拟执行进度更新
      simulateExecution(executionId);

    } catch (error) {
      console.error('Workflow execution error:', error);
      setIsExecuting(false);
      setCurrentExecutionId(null);
    }
  }, [isExecuting, onExecute, workflow.id]);

  // 模拟执行进度
  const simulateExecution = useCallback((executionId: string) => {
    let step = 0;
    const totalSteps = nodes.length;

    const interval = setInterval(() => {
      if (step >= totalSteps) {
        clearInterval(interval);
        setIsExecuting(false);
        setCurrentExecutionId(null);
        return;
      }

      setNodes(prev => prev.map((node, index) => {
        if (index === step) {
          return {
            ...node,
            data: { ...node.data, status: 'running', progress: 50 }
          };
        } else if (index < step) {
          return {
            ...node,
            data: { ...node.data, status: 'completed', progress: 100 }
          };
        }
        return node;
      }));

      step++;
    }, 1000);
  }, [nodes.length]);

  // 处理暂停
  const handlePause = useCallback(() => {
    if (currentExecutionId && onPause) {
      onPause(currentExecutionId);
      setNodes(prev => prev.map(node => 
        node.data.status === 'running'
          ? { ...node, data: { ...node.data, status: 'paused' } }
          : node
      ));
    }
  }, [currentExecutionId, onPause]);

  // 处理停止
  const handleStop = useCallback(() => {
    if (currentExecutionId && onStop) {
      onStop(currentExecutionId);
      setIsExecuting(false);
      setCurrentExecutionId(null);
      setNodes(prev => prev.map(node => ({
        ...node,
        data: { ...node.data, status: 'idle', progress: 0 }
      })));
    }
  }, [currentExecutionId, onStop]);

  // 节点点击处理
  const handleNodeClick = useCallback((event: React.MouseEvent, node: WorkflowNode) => {
    if (onViewDetails) {
      onViewDetails(node.id);
    }
  }, [onViewDetails]);

  // 获取节点状态颜色
  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#1890ff';
      case 'completed': return '#52c41a';
      case 'failed': return '#ff4d4f';
      case 'paused': return '#faad14';
      default: return '#d9d9d9';
    }
  };

  // 自定义节点渲染
  const nodeTypes = {
    default: ({ data, selected }: { data: any; selected: boolean }) => (
      <Card
        size="small"
        className={`workflow-node ${selected ? 'selected' : ''}`}
        style={{
          borderColor: getNodeStatusColor(data.status),
          backgroundColor: data.status === 'running' ? '#e6f7ff' : '#fff',
          minWidth: '120px',
        }}
        bodyStyle={{ padding: '8px' }}
      >
        <div className="text-center">
          <Badge
            status={
              data.status === 'running' ? 'processing' :
              data.status === 'completed' ? 'success' :
              data.status === 'failed' ? 'error' :
              data.status === 'paused' ? 'warning' : 'default'
            }
            text={data.label}
            className="font-medium"
          />
          {data.specialty && (
            <div className="text-xs text-gray-500 mt-1">
              {data.specialty}
            </div>
          )}
          {data.progress !== undefined && data.status === 'running' && (
            <div className="text-xs text-blue-500 mt-1">
              {data.progress}%
            </div>
          )}
        </div>
      </Card>
    ),
    input: ({ data }: { data: any }) => (
      <Card
        size="small"
        className="start-node"
        style={{ backgroundColor: '#f6ffed', borderColor: '#52c41a' }}
        bodyStyle={{ padding: '8px' }}
      >
        <div className="text-center text-green-600 font-medium">
          {data.label}
        </div>
      </Card>
    ),
    output: ({ data }: { data: any }) => (
      <Card
        size="small"
        className="end-node"
        style={{ backgroundColor: '#fff2e8', borderColor: '#fa8c16' }}
        bodyStyle={{ padding: '8px' }}
      >
        <div className="text-center text-orange-600 font-medium">
          {data.label}
        </div>
      </Card>
    ),
  };

  return (
    <div className={`claude-workflow-canvas ${className}`}>
      {/* 工作流控制面板 */}
      <Card className="mb-4" size="small">
        <div className="flex justify-between items-center">
          <div>
            <Title level={5} className="mb-1">{workflow.name}</Title>
            <Text type="secondary">{workflow.description}</Text>
          </div>
          
          {!readonly && (
            <Space>
              <Tooltip title="执行工作流">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecute}
                  disabled={isExecuting}
                  loading={isExecuting}
                >
                  执行
                </Button>
              </Tooltip>
              
              {isExecuting && (
                <>
                  <Tooltip title="暂停执行">
                    <Button
                      icon={<PauseCircleOutlined />}
                      onClick={handlePause}
                    >
                      暂停
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="停止执行">
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={handleStop}
                    >
                      停止
                    </Button>
                  </Tooltip>
                </>
              )}
            </Space>
          )}
        </div>
        
        {/* 执行状态信息 */}
        {currentExecutionId && (
          <div className="mt-3 p-2 bg-blue-50 rounded">
            <Text className="text-sm">
              执行ID: <code>{currentExecutionId}</code> | 
              模式: <Badge text={workflow.mode} /> |
              状态: <Badge status="processing" text="执行中" />
            </Text>
          </div>
        )}
      </Card>

      {/* React Flow 画布 */}
      <div style={{ height, border: '1px solid #d9d9d9', borderRadius: '6px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="workflow-canvas"
        >
          <Background color="#f5f5f5" gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => getNodeStatusColor(node.data?.status || 'idle')}
            className="workflow-minimap"
          />
        </ReactFlow>
      </div>

      {/* 工作流配置信息 */}
      <Card className="mt-4" size="small" title="配置信息">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text strong>执行模式: </Text>
            <Badge 
              text={workflow.mode} 
              color={
                workflow.mode === 'sequential' ? 'blue' :
                workflow.mode === 'parallel' ? 'green' : 'orange'
              }
            />
          </div>
          
          <div>
            <Text strong>专家数量: </Text>
            <Text>{workflow.specialists.length}</Text>
          </div>
          
          <div>
            <Text strong>共享上下文: </Text>
            <Badge 
              status={workflow.execution.sharedContext ? 'success' : 'default'}
              text={workflow.execution.sharedContext ? '启用' : '禁用'}
            />
          </div>
          
          <div>
            <Text strong>结果综合: </Text>
            <Badge 
              status={workflow.execution.resultSynthesis ? 'success' : 'default'}
              text={workflow.execution.resultSynthesis ? '启用' : '禁用'}
            />
          </div>
        </div>
      </Card>

      <style jsx>{`
        .workflow-node.selected {
          box-shadow: 0 0 0 2px #1890ff;
        }
        
        .workflow-canvas .react-flow__node {
          cursor: pointer;
        }
        
        .workflow-canvas .react-flow__edge {
          stroke: #d9d9d9;
          stroke-width: 2;
        }
        
        .workflow-minimap {
          background: white;
          border: 1px solid #d9d9d9;
        }
      `}</style>
    </div>
  );
};

export default ClaudeWorkflowCanvas;
