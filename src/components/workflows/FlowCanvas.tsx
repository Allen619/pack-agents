import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Space, Typography, Tag, Tooltip } from 'antd';
import { 
  SaveOutlined, 
  UndoOutlined, 
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { AgentNode } from './nodes/AgentNode';
import { StageNode } from './nodes/StageNode';
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { WorkflowConfig, AgentConfig, ExecutionStage } from '@/lib/types';

const { Text } = Typography;

// Define custom node types
const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
  stageNode: StageNode,
  startNode: StartNode,
  endNode: EndNode,
};

interface FlowCanvasProps {
  workflow: WorkflowConfig;
  agents: AgentConfig[];
  onSave: (flow: { nodes: Node[]; edges: Edge[] }) => void;
  readonly?: boolean;
  className?: string;
}

export function FlowCanvas({ workflow, agents, onSave, readonly = false, className }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isModified, setIsModified] = useState(false);

  // Initialize flow from workflow configuration
  useEffect(() => {
    initializeFlow();
  }, [workflow, agents]);

  const initializeFlow = () => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Add start node
    initialNodes.push({
      id: 'start',
      type: 'startNode',
      position: { x: 50, y: 100 },
      data: { label: '开始' },
      draggable: !readonly,
    });

    // Add agent nodes
    let yOffset = 250;
    workflow.agentIds.forEach((agentId, index) => {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        initialNodes.push({
          id: agentId,
          type: 'agentNode',
          position: { x: 200 + (index % 3) * 300, y: yOffset + Math.floor(index / 3) * 200 },
          data: { 
            agent,
            isMain: workflow.mainAgentId === agentId,
            workflow
          },
          draggable: !readonly,
        });
      }
    });

    // Add stage nodes based on execution flow
    workflow.executionFlow.stages.forEach((stage, index) => {
      initialNodes.push({
        id: stage.id,
        type: 'stageNode',
        position: { x: 100 + index * 250, y: 450 },
        data: { 
          stage,
          agents: stage.tasks.map(task => agents.find(a => a.id === task.agentId)).filter(Boolean)
        },
        draggable: !readonly,
      });
    });

    // Add end node
    initialNodes.push({
      id: 'end',
      type: 'endNode',
      position: { x: 50, y: 650 },
      data: { label: '结束' },
      draggable: !readonly,
    });

    // Add edges based on dependencies
    workflow.executionFlow.dependencies.forEach(dep => {
      initialEdges.push({
        id: `${dep.fromStage}-${dep.toStage}`,
        source: dep.fromStage,
        target: dep.toStage,
        label: dep.condition || '',
        type: 'smoothstep',
        animated: true,
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsModified(false);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (readonly) return;
      
      setEdges((eds) => addEdge(params, eds));
      setIsModified(true);
    },
    [setEdges, readonly],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSave = () => {
    onSave({ nodes, edges });
    setIsModified(false);
  };

  const handleReset = () => {
    initializeFlow();
  };

  const addAgentToCanvas = (agent: AgentConfig) => {
    if (readonly) return;

    const newNode: Node = {
      id: agent.id,
      type: 'agentNode',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 250 },
      data: { 
        agent,
        isMain: workflow.mainAgentId === agent.id,
        workflow
      },
      draggable: true,
    };

    setNodes((nds) => [...nds, newNode]);
    setIsModified(true);
  };

  const addStage = () => {
    if (readonly) return;

    const newStage: ExecutionStage = {
      id: `stage-${Date.now()}`,
      name: '新阶段',
      type: 'sequential',
      tasks: [],
      timeoutMs: 300000,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
      },
    };

    const newNode: Node = {
      id: newStage.id,
      type: 'stageNode',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 450 },
      data: { 
        stage: newStage,
        agents: []
      },
      draggable: true,
    };

    setNodes((nds) => [...nds, newNode]);
    setIsModified(true);
  };

  return (
    <div className={`flow-canvas h-full w-full ${className}`}>
      <ReactFlowProvider>
        <div className="relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readonly ? undefined : onNodesChange}
            onEdgesChange={readonly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-gray-50"
          >
            <Controls position="top-left" />
            <MiniMap 
              position="bottom-right"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'agentNode': return '#1890ff';
                  case 'stageNode': return '#52c41a';
                  case 'startNode': return '#722ed1';
                  case 'endNode': return '#eb2f96';
                  default: return '#8c8c8c';
                }
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            
            {/* Toolbar Panel */}
            <Panel position="top-center">
              <Card size="small" className="shadow-md">
                <Space>
                  {!readonly && (
                    <>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        disabled={!isModified}
                      >
                        保存布局
                      </Button>
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleReset}
                        disabled={!isModified}
                      >
                        重置
                      </Button>
                      <Button
                        icon={<InfoCircleOutlined />}
                        onClick={addStage}
                      >
                        添加阶段
                      </Button>
                    </>
                  )}
                  <Tag color={isModified ? 'orange' : 'green'}>
                    {isModified ? '未保存' : '已保存'}
                  </Tag>
                </Space>
              </Card>
            </Panel>

            {/* Info Panel */}
            {selectedNode && (
              <Panel position="bottom-left">
                <Card size="small" className="shadow-md max-w-sm">
                  <Space direction="vertical" size="small">
                    <Text strong>节点信息</Text>
                    <div>
                      <Text type="secondary">类型: </Text>
                      <Tag>{selectedNode.type}</Tag>
                    </div>
                    <div>
                      <Text type="secondary">ID: </Text>
                      <Text code>{selectedNode.id}</Text>
                    </div>
                    {selectedNode.data?.agent && (
                      <div>
                        <Text type="secondary">Agent: </Text>
                        <Text>{selectedNode.data.agent.name}</Text>
                      </div>
                    )}
                    {selectedNode.data?.stage && (
                      <div>
                        <Text type="secondary">阶段: </Text>
                        <Text>{selectedNode.data.stage.name}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Panel>
            )}

            {/* Legend Panel */}
            <Panel position="top-right">
              <Card size="small" className="shadow-md">
                <Space direction="vertical" size="small">
                  <Text strong className="text-xs">图例</Text>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <Text className="text-xs">开始/结束</Text>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <Text className="text-xs">Agent 节点</Text>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <Text className="text-xs">执行阶段</Text>
                    </div>
                  </div>
                </Space>
              </Card>
            </Panel>
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
