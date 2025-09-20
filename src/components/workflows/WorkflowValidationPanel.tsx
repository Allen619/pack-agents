import { useState, useEffect } from 'react';
import { 
  Card, 
  Alert, 
  Progress, 
  Typography, 
  List, 
  Tag, 
  Button, 
  Space, 
  Tooltip,
  Collapse,
  Badge,
  Empty
} from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  BugOutlined,
  ReloadOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { WorkflowConfig, AgentConfig } from '@/lib/types';
import { WorkflowValidator, ValidationIssue, WorkflowValidationResult } from '@/lib/workflow/validation';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface WorkflowValidationPanelProps {
  workflow: WorkflowConfig;
  agents: AgentConfig[];
  className?: string;
}

export function WorkflowValidationPanel({ workflow, agents, className }: WorkflowValidationPanelProps) {
  const [validationResult, setValidationResult] = useState<WorkflowValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runValidation();
  }, [workflow, agents]);

  const runValidation = async () => {
    setLoading(true);
    try {
      // Simulate async validation
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = WorkflowValidator.validate(workflow, agents);
      setValidationResult(result);
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error': return <BugOutlined className="text-red-500" />;
      case 'warning': return <ExclamationCircleOutlined className="text-orange-500" />;
      case 'info': return <InfoCircleOutlined className="text-blue-500" />;
    }
  };

  const getIssueColor = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
    }
  };

  const getCategoryIcon = (category: ValidationIssue['category']) => {
    switch (category) {
      case 'configuration': return '⚙️';
      case 'flow': return '🔄';
      case 'agents': return '🤖';
      case 'performance': return '⚡';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'orange';
    return 'red';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'normal';
    return 'exception';
  };

  const renderSummaryCard = () => {
    if (!validationResult) return null;

    const { isValid, score, summary } = validationResult;

    return (
      <Card size="small" className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <Progress
                type="circle"
                percent={score}
                size={60}
                status={getScoreStatus(score)}
                format={() => (
                  <div className="text-center">
                    <div className="text-lg font-bold">{score}</div>
                    <div className="text-xs text-gray-500">分</div>
                  </div>
                )}
              />
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-1">
                {isValid ? (
                  <CheckCircleOutlined className="text-green-500" />
                ) : (
                  <ExclamationCircleOutlined className="text-red-500" />
                )}
                <Text strong>
                  {isValid ? '工作流配置有效' : '工作流配置存在问题'}
                </Text>
              </div>
              
              <Space size="small">
                {summary.errors > 0 && (
                  <Tag color="red" icon={<BugOutlined />}>
                    {summary.errors} 个错误
                  </Tag>
                )}
                {summary.warnings > 0 && (
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                    {summary.warnings} 个警告
                  </Tag>
                )}
                {summary.infos > 0 && (
                  <Tag color="blue" icon={<InfoCircleOutlined />}>
                    {summary.infos} 个建议
                  </Tag>
                )}
                {summary.errors === 0 && summary.warnings === 0 && summary.infos === 0 && (
                  <Tag color="green" icon={<TrophyOutlined />}>
                    完美配置
                  </Tag>
                )}
              </Space>
            </div>
          </div>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={runValidation}
            loading={loading}
          >
            重新验证
          </Button>
        </div>
      </Card>
    );
  };

  const renderIssuesList = () => {
    if (!validationResult || validationResult.issues.length === 0) {
      return (
        <Card size="small">
          <Empty
            image={<TrophyOutlined className="text-4xl text-green-500" />}
            description={
              <div className="text-center">
                <Text strong className="text-green-600">配置完美！</Text>
                <br />
                <Text type="secondary">工作流配置没有发现任何问题</Text>
              </div>
            }
          />
        </Card>
      );
    }

    // Group issues by category
    const issuesByCategory = validationResult.issues.reduce((acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = [];
      }
      acc[issue.category].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>);

    return (
      <Card size="small" title="检测问题">
        <Collapse ghost>
          {Object.entries(issuesByCategory).map(([category, issues]) => (
            <Panel
              key={category}
              header={
                <div className="flex items-center space-x-2">
                  <span>{getCategoryIcon(category as ValidationIssue['category'])}</span>
                  <span className="capitalize">
                    {category === 'configuration' ? '配置问题' :
                     category === 'flow' ? '流程问题' :
                     category === 'agents' ? 'Agent 问题' : '性能问题'}
                  </span>
                  <Badge count={issues.length} showZero={false} />
                </div>
              }
            >
              <List
                size="small"
                dataSource={issues}
                renderItem={(issue, index) => (
                  <List.Item className="border-0 px-0">
                    <div className="w-full">
                      <div className="flex items-start space-x-2">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Text strong className="text-sm">
                              {issue.message}
                            </Text>
                            <Tag size="small" color={getIssueColor(issue.type)}>
                              {issue.code}
                            </Tag>
                          </div>
                          
                          {issue.suggestion && (
                            <Text type="secondary" className="text-xs block">
                              💡 {issue.suggestion}
                            </Text>
                          )}
                          
                          {issue.location && (
                            <Text type="secondary" className="text-xs">
                              📍 位置: {issue.location}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Panel>
          ))}
        </Collapse>
      </Card>
    );
  };

  const renderRecommendations = () => {
    if (!validationResult) return null;

    const recommendations = [];

    if (validationResult.score < 70) {
      recommendations.push('工作流质量评分较低，建议优先解决错误问题');
    }

    if (validationResult.summary.errors > 0) {
      recommendations.push('存在配置错误，可能导致执行失败，请及时修复');
    }

    if (validationResult.summary.warnings > 3) {
      recommendations.push('警告问题较多，建议逐步优化以提高稳定性');
    }

    if (validationResult.score >= 90) {
      recommendations.push('配置质量优秀！可以考虑执行测试运行');
    }

    if (recommendations.length === 0) return null;

    return (
      <Alert
        type="info"
        showIcon
        message="优化建议"
        description={
          <ul className="mt-2 mb-0">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm">
                {rec}
              </li>
            ))}
          </ul>
        }
        className="mt-4"
      />
    );
  };

  return (
    <div className={`workflow-validation-panel ${className}`}>
      <div className="mb-4">
        <Title level={4}>工作流验证</Title>
        <Text type="secondary">
          自动检测工作流配置中的问题并提供优化建议
        </Text>
      </div>

      {renderSummaryCard()}
      {renderIssuesList()}
      {renderRecommendations()}
    </div>
  );
}
