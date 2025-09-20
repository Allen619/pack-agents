import { useCallback, useState, useEffect, useRef } from 'react';
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
  ReactFlowProvider,
  Panel,
  useReactFlow,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Tooltip, 
  Modal, 
  Form, 
  Input, 
  Select,
  Popover,
  message
} from 'antd';
import { 
  SaveOutlined, 
  UndoOutlined, 
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  DeleteOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { AgentNode } from './nodes/AgentNode';
import { StageNode } from './nodes/StageNode';
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { WorkflowConfig, AgentConfig, ExecutionStage } from '@/lib/types';
import { DependencyManager } from '@/lib/workflow/dependencies';
import { generateId } from '@/lib/utils';

const { Text } = Typography;
const { Option } = Select;

// Define custom node types
const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
  stageNode: StageNode,
  startNode: StartNode,
  endNode: EndNode,
};

interface EnhancedFlowCanvasProps {
  workflow: WorkflowConfig;
  agents: AgentConfig[];
  onSave: (workflow: WorkflowConfig) => void;
  readonly?: boolean;
  className?: string;
}

export function EnhancedFlowCanvas({ 
  workflow, 
  agents, 
  onSave, 
  readonly = false, 
  className 
}: EnhancedFlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [edgeModalVisible, setEdgeModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [nodeForm] = Form.useForm();
  const [edgeForm] = Form.useForm();
  
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Command history for undo/redo
  const [commandHistory, setCommandHistory] = useState<Array<{
    nodes: Node[];
    edges: Edge[];
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#1890ff',
        },
        style: {
          stroke: '#1890ff',
          strokeWidth: 2,
        },
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsModified(false);
    
    // Save initial state to history
    saveToHistory(initialNodes, initialEdges);
  };

  const saveToHistory = (currentNodes: Node[], currentEdges: Edge[]) => {
    const newHistory = commandHistory.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: [...currentNodes],
      edges: [...currentEdges]
    });
    setCommandHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (readonly) return;
      
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#1890ff',
        },
        style: {
          stroke: '#1890ff',
          strokeWidth: 2,
        },
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      setIsModified(true);
      saveToHistory(nodes, [...edges, newEdge]);
    },
    [setEdges, readonly, nodes, edges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleSave = () => {
    // Convert current flow state back to workflow configuration
    const stageNodes = nodes.filter(node => node.type === 'stageNode');
    const stageEdges = edges.filter(edge => 
      stageNodes.some(node => node.id === edge.source) && 
      stageNodes.some(node => node.id === edge.target)
    );

    const updatedStages = stageNodes.map(node => {
      const originalStage = workflow.executionFlow.stages.find(stage => stage.id === node.id);
      return originalStage || {
        id: node.id,
        name: node.data?.stage?.name || 'New Stage',
        type: 'sequential' as const,
        tasks: [],
        timeoutMs: 300000,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 }
      };
    });

    const updatedDependencies = stageEdges.map(edge => ({
      fromStage: edge.source,
      toStage: edge.target,
      condition: edge.label as string || undefined
    }));

    const updatedWorkflow: WorkflowConfig = {
      ...workflow,
      executionFlow: {
        stages: updatedStages,
        dependencies: updatedDependencies
      },
      metadata: {
        ...workflow.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    onSave(updatedWorkflow);
    setIsModified(false);
    message.success('工作流保存成功');
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = commandHistory[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
      setIsModified(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < commandHistory.length - 1) {
      const nextState = commandHistory[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
      setIsModified(true);
    }
  };

  const handleAddStage = () => {
    if (readonly) return;

    const newStage: ExecutionStage = {
      id: generateId('stage'),
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
      position: { 
        x: Math.random() * 400 + 200, 
        y: Math.random() * 200 + 450 
      },
      data: { 
        stage: newStage,
        agents: []
      },
      draggable: true,
    };

    setNodes(nds => [...nds, newNode]);
    setIsModified(true);
    saveToHistory([...nodes, newNode], edges);
  };

  const handleEditNode = (node: Node) => {
    setEditingNode(node);
    setNodeModalVisible(true);
    
    if (node.type === 'stageNode') {
      nodeForm.setFieldsValue({
        name: node.data?.stage?.name || '',
        type: node.data?.stage?.type || 'sequential',
        timeoutMs: node.data?.stage?.timeoutMs || 300000
      });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    if (readonly) return;

    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    const updatedEdges = edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    );
    
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setIsModified(true);
    saveToHistory(updatedNodes, updatedEdges);
    message.success('节点删除成功');
  };

  const handleEditEdge = (edge: Edge) => {
    setSelectedEdge(edge);
    setEdgeModalVisible(true);
    edgeForm.setFieldsValue({
      condition: edge.label || ''
    });
  };

  const handleDeleteEdge = (edgeId: string) => {
    if (readonly) return;

    const updatedEdges = edges.filter(edge => edge.id !== edgeId);
    setEdges(updatedEdges);
    setIsModified(true);
    saveToHistory(nodes, updatedEdges);
    message.success('连接删除成功');
  };

  const handleNodeFormSubmit = async () => {
    if (!editingNode) return;

    try {
      const values = await nodeForm.validateFields();
      
      const updatedNodes = nodes.map(node => {
        if (node.id === editingNode.id && node.type === 'stageNode') {
          return {
            ...node,
            data: {
              ...node.data,
              stage: {
                ...node.data.stage,
                name: values.name,
                type: values.type,
                timeoutMs: values.timeoutMs
              }
            }
          };
        }
        return node;
      });
      
      setNodes(updatedNodes);
      setIsModified(true);
      saveToHistory(updatedNodes, edges);
      setNodeModalVisible(false);
      nodeForm.resetFields();
      message.success('节点更新成功');
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  const handleEdgeFormSubmit = async () => {
    if (!selectedEdge) return;

    try {
      const values = await edgeForm.validateFields();
      
      const updatedEdges = edges.map(edge => {
        if (edge.id === selectedEdge.id) {
          return {
            ...edge,
            label: values.condition
          };
        }
        return edge;
      });
      
      setEdges(updatedEdges);
      setIsModified(true);
      saveToHistory(nodes, updatedEdges);
      setEdgeModalVisible(false);
      edgeForm.resetFields();
      message.success('连接更新成功');
    } catch (error) {
      console.error('Failed to update edge:', error);
    }
  };

  const handleFitView = () => {
    reactFlowInstance.fitView({ padding: 0.1 });
  };

  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };

  const renderContextMenu = () => {
    if (!selectedNode && !selectedEdge) return null;

    const menuItems = [];

    if (selectedNode && !readonly) {
      if (selectedNode.type === 'stageNode') {
        menuItems.push(
          <Button
            key="edit"
            type="text"
            icon={<SettingOutlined />}
            onClick={() => handleEditNode(selectedNode)}
            size="small"
          >
            编辑阶段
          </Button>
        );
      }
      
      if (!['start', 'end'].includes(selectedNode.type || '')) {
        menuItems.push(
          <Button
            key="delete"
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteNode(selectedNode.id)}
            danger
            size="small"
          >
            删除节点
          </Button>
        );
      }
    }

    if (selectedEdge && !readonly) {
      menuItems.push(
        <Button
          key="edit-edge"
          type="text"
          icon={<LinkOutlined />}
          onClick={() => handleEditEdge(selectedEdge)}
          size="small"
        >
          编辑连接
        </Button>,
        <Button
          key="delete-edge"
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteEdge(selectedEdge.id)}
          danger
          size="small"
        >
          删除连接
        </Button>
      );
    }

    if (menuItems.length === 0) return null;

    return (
      <Card size="small" className="shadow-md">
        <Space direction="vertical" size="small">
          {menuItems}
        </Space>
      </Card>
    );
  };

  return (
    <div className={`enhanced-flow-canvas h-full w-full ${className}`} ref={canvasRef}>
      <div className="relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readonly ? undefined : onNodesChange}
          onEdgesChange={readonly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
          deleteKeyCode={readonly ? null : 'Delete'}
        >
          <Controls 
            position="top-left"
            showInteractive={false}
          />
          
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
          
          {/* Enhanced Toolbar Panel */}
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
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      title="撤销"
                    />
                    <Button
                      icon={<RedoOutlined />}
                      onClick={handleRedo}
                      disabled={historyIndex >= commandHistory.length - 1}
                      title="重做"
                    />
                    <Button
                      icon={<PlusOutlined />}
                      onClick={handleAddStage}
                      title="添加阶段"
                    >
                      添加阶段
                    </Button>
                  </>
                )}
                
                <Button
                  icon={<ZoomInOutlined />}
                  onClick={handleZoomIn}
                  title="放大"
                />
                <Button
                  icon={<ZoomOutOutlined />}
                  onClick={handleZoomOut}
                  title="缩小"
                />
                <Button
                  icon={<FullscreenOutlined />}
                  onClick={handleFitView}
                  title="适应画布"
                />
                
                <Tag color={isModified ? 'orange' : 'green'}>
                  {isModified ? '未保存' : '已保存'}
                </Tag>
              </Space>
            </Card>
          </Panel>

          {/* Context Menu */}
          {(selectedNode || selectedEdge) && (
            <Panel position="bottom-left">
              {renderContextMenu()}
            </Panel>
          )}

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
        </ReactFlow>
      </div>

      {/* Edit Node Modal */}
      <Modal
        title="编辑阶段"
        open={nodeModalVisible}
        onOk={handleNodeFormSubmit}
        onCancel={() => {
          setNodeModalVisible(false);
          nodeForm.resetFields();
        }}
        width={500}
      >
        <Form form={nodeForm} layout="vertical">
          <Form.Item
            name="name"
            label="阶段名称"
            rules={[{ required: true, message: '请输入阶段名称' }]}
          >
            <Input placeholder="输入阶段名称" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="执行类型"
            rules={[{ required: true, message: '请选择执行类型' }]}
          >
            <Select>
              <Option value="sequential">串行执行</Option>
              <Option value="parallel">并行执行</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="timeoutMs"
            label="超时时间（毫秒）"
            rules={[{ required: true, message: '请设置超时时间' }]}
          >
            <Input type="number" placeholder="300000" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Edge Modal */}
      <Modal
        title="编辑连接条件"
        open={edgeModalVisible}
        onOk={handleEdgeFormSubmit}
        onCancel={() => {
          setEdgeModalVisible(false);
          edgeForm.resetFields();
        }}
        width={500}
      >
        <Form form={edgeForm} layout="vertical">
          <Form.Item
            name="condition"
            label="触发条件"
            tooltip="定义什么情况下触发下一个阶段，留空表示成功时触发"
          >
            <Input placeholder="例如: success, failure, 或自定义条件" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function EnhancedFlowCanvasWrapper(props: EnhancedFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <EnhancedFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
