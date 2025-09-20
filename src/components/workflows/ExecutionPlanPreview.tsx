import { useState } from 'react';
import { 
  Card, 
  Typography, 
  Timeline, 
  Tag, 
  Space, 
  Button, 
  Tooltip, 
  Progress, 
  Collapse,
  Alert,
  Statistic,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  PlayCircleOutlined, 
  ClockCircleOutlined, 
  TeamOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  RightOutlined
} from '@ant-design/icons';
import { WorkflowConfig, AgentConfig } from '@/lib/types';
import { DependencyManager, ExecutionPlan } from '@/lib/workflow/dependencies';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ExecutionPlanPreviewProps {
  workflow: WorkflowConfig;
  agents: AgentConfig[];
  onExecute?: () => void;
  className?: string;
}

export function ExecutionPlanPreview({ 
  workflow, 
  agents, 
  onExecute,
  className 
}: ExecutionPlanPreviewProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  const executionPlan = DependencyManager.generateExecutionPlan(workflow);
  const validation = DependencyManager.validateDependencies(workflow);

  const getStageDisplayName = (stageId: string) => {
    const stage = workflow.executionFlow.stages.find(s => s.id === stageId);
    return stage ? stage.name : stageId;
  };

  const getAgentDisplayName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : agentId;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const calculateProgress = (level: number) => {
    // Mock progress calculation for preview
    return Math.min((level / executionPlan.executionLevels.length) * 100, 100);
  };

  const renderOverviewStats = () => {
    return (
      <Card size="small" className="mb-4">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总阶段数"
              value={executionPlan.totalStages}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="预估时长"
              value={formatDuration(executionPlan.estimatedDuration)}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="执行层级"
              value={executionPlan.executionLevels.length}
              prefix={<RightOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="关键路径"
              value={executionPlan.criticalPath.length}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  const renderValidationStatus = () => {
    if (validation.isValid) {
      return (
        <Alert
          type="success"
          message="执行计划有效"
          description="工作流配置正确，可以开始执行。"
          showIcon
          className="mb-4"
        />
      );
    }

    return (
      <Alert
        type="error"
        message="执行计划存在问题"
        description={
          <div>
            {validation.errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="text-orange-600">⚠ {warning}</div>
            ))}
          </div>
        }
        showIcon
        className="mb-4"
      />
    );
  };

  const renderExecutionTimeline = () => {
    return (
      <Card 
        size="small" 
        title={
          <Space>
            <PlayCircleOutlined />
            执行时间线
          </Space>
        }
        className="mb-4"
      >
        <Timeline>
          {executionPlan.executionLevels.map((level, index) => {
            const isSelected = selectedLevel === index;
            const progress = calculateProgress(index + 1);
            
            return (
              <Timeline.Item
                key={level.level}
                dot={
                  <div 
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full text-white text-sm cursor-pointer
                      ${isSelected ? 'bg-blue-600' : 'bg-blue-500'}
                    `}
                    onClick={() => setSelectedLevel(isSelected ? null : index)}
                  >
                    {level.level}
                  </div>
                }
              >
                <div className={`ml-4 ${isSelected ? 'bg-blue-50 p-3 rounded-lg' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Text strong>Level {level.level}</Text>
                      {level.canRunInParallel && (
                        <Tag color="green" size="small">并行</Tag>
                      )}
                      <Text type="secondary" className="text-sm">
                        {formatDuration(level.estimatedDuration)}
                      </Text>
                    </div>
                    
                    <Progress 
                      percent={progress} 
                      size="small" 
                      className="w-24"
                      showInfo={false}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {level.stages.map(stageId => (
                      <Tag key={stageId} color="blue" size="small">
                        {getStageDisplayName(stageId)}
                      </Tag>
                    ))}
                  </div>

                  {isSelected && (
                    <div className="mt-3 space-y-2">
                      <Text strong className="block">阶段详情:</Text>
                      {level.stages.map(stageId => {
                        const stage = workflow.executionFlow.stages.find(s => s.id === stageId);
                        if (!stage) return null;

                        return (
                          <div key={stageId} className="bg-white p-2 rounded border">
                            <div className="flex items-center justify-between mb-1">
                              <Text strong className="text-sm">{stage.name}</Text>
                              <Tag color={stage.type === 'parallel' ? 'green' : 'orange'} size="small">
                                {stage.type === 'parallel' ? '并行' : '串行'}
                              </Tag>
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              <div>任务数: {stage.tasks.length}</div>
                              <div>超时: {formatDuration(stage.timeoutMs)}</div>
                              <div>重试: {stage.retryPolicy.maxRetries} 次</div>
                            </div>

                            {stage.tasks.length > 0 && (
                              <div className="mt-2">
                                <Text className="text-xs text-gray-500 block mb-1">执行 Agent:</Text>
                                <div className="flex flex-wrap gap-1">
                                  {stage.tasks.map(task => (
                                    <Tag key={task.id} size="small">
                                      {getAgentDisplayName(task.agentId)}
                                    </Tag>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {level.dependencies.length > 0 && (
                        <div>
                          <Text strong className="text-sm block mb-1">依赖关系:</Text>
                          <div className="text-xs text-gray-600">
                            等待阶段: {level.dependencies.map(dep => getStageDisplayName(dep)).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Card>
    );
  };

  const renderCriticalPath = () => {
    if (executionPlan.criticalPath.length === 0) return null;

    return (
      <Card 
        size="small" 
        title={
          <Space>
            <ExclamationCircleOutlined />
            关键路径分析
          </Space>
        }
        className="mb-4"
      >
        <div className="space-y-3">
          <div>
            <Text type="secondary" className="block mb-2">
              关键路径决定了工作流的最短执行时间，优化这些阶段可以显著提升整体性能。
            </Text>
            
            <div className="flex items-center space-x-2 flex-wrap">
              {executionPlan.criticalPath.map((stageId, index) => (
                <span key={stageId} className="flex items-center">
                  <Tag color="red" size="small">
                    {getStageDisplayName(stageId)}
                  </Tag>
                  {index < executionPlan.criticalPath.length - 1 && (
                    <RightOutlined className="mx-1 text-gray-400" />
                  )}
                </span>
              ))}
            </div>
          </div>

          {executionPlan.criticalPath.length > 5 && (
            <Alert
              type="warning"
              message="关键路径较长"
              description="考虑并行化某些阶段以缩短总执行时间。"
              showIcon
              size="small"
            />
          )}
        </div>
      </Card>
    );
  };

  const renderOptimizationSuggestions = () => {
    if (executionPlan.warnings.length === 0) return null;

    return (
      <Card 
        size="small" 
        title={
          <Space>
            <WarningOutlined />
            优化建议
          </Space>
        }
        className="mb-4"
      >
        <div className="space-y-2">
          {executionPlan.warnings.map((warning, index) => (
            <Alert
              key={index}
              type="warning"
              message={warning}
              showIcon
              size="small"
            />
          ))}
        </div>
      </Card>
    );
  };

  const renderResourceAnalysis = () => {
    const maxParallelStages = Math.max(
      ...executionPlan.executionLevels.map(level => level.stages.length)
    );
    
    const totalAgents = new Set(
      workflow.executionFlow.stages.flatMap(stage => 
        stage.tasks.map(task => task.agentId)
      )
    ).size;

    return (
      <Card 
        size="small" 
        title={
          <Space>
            <TeamOutlined />
            资源分析
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalAgents}</div>
              <div className="text-sm text-gray-500">涉及 Agent 总数</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{maxParallelStages}</div>
              <div className="text-sm text-gray-500">最大并行阶段数</div>
            </div>
          </Col>
        </Row>

        <Divider />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Text type="secondary">CPU 密集度:</Text>
            <Tag color={totalAgents > 5 ? 'red' : totalAgents > 3 ? 'orange' : 'green'}>
              {totalAgents > 5 ? '高' : totalAgents > 3 ? '中' : '低'}
            </Tag>
          </div>
          
          <div className="flex justify-between text-sm">
            <Text type="secondary">并行处理:</Text>
            <Tag color={maxParallelStages > 3 ? 'green' : 'orange'}>
              {maxParallelStages > 3 ? '高效' : '一般'}
            </Tag>
          </div>
          
          <div className="flex justify-between text-sm">
            <Text type="secondary">执行复杂度:</Text>
            <Tag color={executionPlan.executionLevels.length > 5 ? 'red' : 'green'}>
              {executionPlan.executionLevels.length > 5 ? '复杂' : '简单'}
            </Tag>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={`execution-plan-preview ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Title level={4}>执行计划预览</Title>
          <Text type="secondary">
            分析工作流执行流程，识别潜在问题和优化机会
          </Text>
        </div>
        
        {validation.isValid && onExecute && (
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={onExecute}
            size="large"
          >
            开始执行
          </Button>
        )}
      </div>

      {renderValidationStatus()}
      {renderOverviewStats()}
      
      <Row gutter={16}>
        <Col span={16}>
          {renderExecutionTimeline()}
          {renderCriticalPath()}
          {renderOptimizationSuggestions()}
        </Col>
        
        <Col span={8}>
          {renderResourceAnalysis()}
        </Col>
      </Row>
    </div>
  );
}
