'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Tabs,
  Tag,
  Modal,
  message,
  Tooltip,
  Collapse,
  Alert,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  RobotOutlined,
  SettingOutlined,
  CheckOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { cn } from '@/utils';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// 系统提示模板
const PROMPT_TEMPLATES = {
  codeAnalyst: {
    name: '代码分析师',
    description: '专门用于代码分析和审查的专业提示词',
    prompt: `你是一个资深的代码分析专家，具有多年的软件开发和代码审查经验。

## 你的职责
- 深入分析代码结构、架构和设计模式
- 识别潜在的性能问题、安全漏洞和代码异味
- 提供具体、可操作的改进建议
- 评估代码的可维护性、可读性和可扩展性

## 分析方法
1. **结构分析**: 分析代码架构、模块划分、依赖关系
2. **质量评估**: 检查编码规范、命名约定、注释质量
3. **性能审查**: 识别性能瓶颈、算法复杂度问题
4. **安全检查**: 发现安全漏洞、输入验证问题
5. **最佳实践**: 对照行业标准和最佳实践

## 输出格式
请以结构化的方式提供分析结果，包含：
- 总体评估
- 具体问题列表
- 改进建议
- 代码示例（如需要）

保持专业、准确、有建设性的分析态度。`,
  },
  codeGenerator: {
    name: '代码生成器',
    description: '专门用于智能代码生成的提示词',
    prompt: `你是一个专业的代码生成专家，能够根据需求生成高质量、可维护的代码。

## 你的能力
- 理解复杂的需求描述，生成相应的代码实现
- 遵循最佳实践和编码规范
- 生成完整的、可运行的代码，包含必要的错误处理
- 提供清晰的代码注释和文档

## 生成原则
1. **代码质量**: 确保代码清晰、可读、可维护
2. **最佳实践**: 遵循语言和框架的最佳实践
3. **错误处理**: 包含适当的错误处理和边界情况处理
4. **性能考虑**: 编写高效的代码，避免性能问题
5. **可测试性**: 生成易于测试的代码结构

## 输出要求
- 使用 \`\`\`filename:path/to/file.ext 格式标注文件
- 为每个文件添加简要说明
- 包含必要的导入和依赖
- 添加适当的注释和文档

根据具体需求，生成符合要求的高质量代码。`,
  },
  projectManager: {
    name: '项目管理员',
    description: '用于协调多个 Agent 协作的主管理 Agent',
    prompt: `你是一个经验丰富的项目管理专家和技术架构师，负责协调和管理多个专业 Agent 的协作。

## 你的职责
- 分析和分解复杂任务，制定合理的执行计划
- 协调不同专业 Agent 的工作，确保高效协作
- 监控任务执行进度，及时调整计划
- 整合各个 Agent 的输出，提供统一的项目总结

## 工作流程
1. **需求分析**: 深入理解用户需求和项目目标
2. **任务分解**: 将复杂任务分解为可执行的子任务
3. **Agent 分配**: 根据任务特性分配给合适的专业 Agent
4. **执行监控**: 跟踪各个任务的执行状态和质量
5. **结果整合**: 汇总所有 Agent 的工作成果
6. **总结报告**: 提供完整的项目总结和建议

## 沟通风格
- 保持专业而友好的沟通方式
- 提供清晰的指导和反馈
- 及时识别和解决潜在问题
- 确保所有参与者理解项目目标和进度

以项目成功为导向，确保所有 Agent 协同工作，达成最佳效果。`,
  },
};

// 角色特定的配置建议
const ROLE_SUGGESTIONS = {
  main: {
    color: 'green',
    suggestions: [
      '作为主 Agent，应该具备项目规划和团队协调能力',
      '提示词应该包含任务分解和优先级管理的指导',
      '建议添加与其他 Agent 沟通的协议和标准',
    ],
  },
  sub: {
    color: 'blue', 
    suggestions: [
      '作为执行 Agent，应该专注于特定领域的专业能力',
      '提示词应该明确定义专业技能和工作边界',
      '建议包含标准化的输出格式要求',
    ],
  },
  synthesis: {
    color: 'purple',
    suggestions: [
      '作为总结 Agent，应该具备信息整合和分析能力',
      '提示词应该包含结果聚合和质量评估的方法',
      '建议添加最终报告的结构化模板',
    ],
  },
};

interface SystemPromptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  agentRole?: 'main' | 'sub' | 'synthesis';
  agentName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTemplates?: boolean;
  showPreview?: boolean;
  showRoleGuide?: boolean;
}

export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  value = '',
  onChange,
  agentRole = 'sub',
  agentName = 'Agent',
  placeholder = '请输入系统提示词...',
  className,
  disabled = false,
  showTemplates = true,
  showPreview = true,
  showRoleGuide = true,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState(value);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [promptStats, setPromptStats] = useState({
    characters: 0,
    words: 0,
    lines: 0,
  });

  // 计算提示词统计信息
  useEffect(() => {
    const text = currentPrompt;
    setPromptStats({
      characters: text.length,
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      lines: text.split('\n').length,
    });
  }, [currentPrompt]);

  // 处理值变化
  useEffect(() => {
    setCurrentPrompt(value);
  }, [value]);

  const handlePromptChange = (newValue: string) => {
    setCurrentPrompt(newValue);
    onChange?.(newValue);
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = PROMPT_TEMPLATES[templateKey];
    if (template) {
      handlePromptChange(template.prompt);
      setIsTemplateModalVisible(false);
      message.success(`已应用模板：${template.name}`);
    }
  };

  const handleClear = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空当前的系统提示词吗？此操作不可撤销。',
      onOk: () => {
        handlePromptChange('');
        message.success('已清空系统提示词');
      },
    });
  };

  const validatePrompt = () => {
    const issues = [];
    
    if (currentPrompt.length < 50) {
      issues.push('提示词过短，建议至少包含50个字符');
    }
    
    if (currentPrompt.length > 8000) {
      issues.push('提示词过长，可能影响性能，建议控制在8000字符以内');
    }
    
    if (!currentPrompt.includes('你是') && !currentPrompt.includes('你的职责')) {
      issues.push('建议明确定义 Agent 的角色和职责');
    }
    
    return issues;
  };

  const roleConfig = ROLE_SUGGESTIONS[agentRole];
  const validationIssues = validatePrompt();

  return (
    <div className={cn('system-prompt-editor', className)}>
      <Card>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Title level={4} className="mb-0">
              <RobotOutlined className="mr-2" />
              系统提示编辑器
            </Title>
            <div className="flex items-center space-x-2">
              <Tag color={roleConfig.color}>
                {agentRole === 'main' ? '主 Agent' : 
                 agentRole === 'sub' ? '执行 Agent' : 
                 '总结 Agent'}
              </Tag>
              <Text type="secondary">{agentName}</Text>
            </div>
          </div>
          
          {showRoleGuide && (
            <Alert
              message={`${roleConfig.color === 'green' ? '主' : roleConfig.color === 'blue' ? '执行' : '总结'} Agent 提示词建议`}
              description={
                <ul className="mt-2 mb-0">
                  {roleConfig.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm">{suggestion}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
              className="mb-4"
            />
          )}
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <EditOutlined />
                编辑器
              </span>
            } 
            key="editor"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Space>
                  {showTemplates && (
                    <Button 
                      icon={<BulbOutlined />}
                      onClick={() => setIsTemplateModalVisible(true)}
                    >
                      选择模板
                    </Button>
                  )}
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={handleClear}
                    disabled={!currentPrompt.trim()}
                  >
                    清空
                  </Button>
                  {showPreview && (
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      type={isPreviewMode ? 'primary' : 'default'}
                    >
                      预览模式
                    </Button>
                  )}
                </Space>
                
                <Space className="text-sm text-gray-500">
                  <span>{promptStats.characters} 字符</span>
                  <span>{promptStats.words} 词</span>
                  <span>{promptStats.lines} 行</span>
                </Space>
              </div>

              {isPreviewMode ? (
                <Card className="bg-gray-50">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {currentPrompt || '暂无内容'}
                  </div>
                </Card>
              ) : (
                <TextArea
                  value={currentPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  autoSize={{ minRows: 12, maxRows: 24 }}
                  className="font-mono text-sm"
                />
              )}

              {validationIssues.length > 0 && (
                <Alert
                  message="提示词建议"
                  description={
                    <ul className="mt-2 mb-0">
                      {validationIssues.map((issue, index) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                />
              )}
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <InfoCircleOutlined />
                帮助
              </span>
            } 
            key="help"
          >
            <Collapse defaultActiveKey={['structure']}>
              <Panel header="提示词结构建议" key="structure">
                <div className="space-y-3 text-sm">
                  <div>
                    <Text strong>1. 角色定义</Text>
                    <div className="mt-1 text-gray-600">
                      明确定义 Agent 的身份、专业背景和能力范围
                    </div>
                    <div className="mt-1 p-2 bg-gray-50 rounded">
                      <code>你是一个资深的软件架构师，具有10年以上的企业级应用开发经验...</code>
                    </div>
                  </div>
                  
                  <div>
                    <Text strong>2. 职责范围</Text>
                    <div className="mt-1 text-gray-600">
                      列出具体的工作职责和任务边界
                    </div>
                    <div className="mt-1 p-2 bg-gray-50 rounded">
                      <code>## 你的职责<br/>- 分析系统架构设计<br/>- 识别性能瓶颈<br/>- 提供优化建议</code>
                    </div>
                  </div>

                  <div>
                    <Text strong>3. 工作方法</Text>
                    <div className="mt-1 text-gray-600">
                      描述具体的工作流程和方法论
                    </div>
                  </div>

                  <div>
                    <Text strong>4. 输出格式</Text>
                    <div className="mt-1 text-gray-600">
                      定义期望的输出结构和格式要求
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel header="最佳实践" key="best-practices">
                <div className="space-y-2 text-sm">
                  <div>• 使用清晰、具体的语言，避免模糊表述</div>
                  <div>• 包含具体的示例和期望输出格式</div>
                  <div>• 设定明确的工作边界和限制条件</div>
                  <div>• 考虑不同场景下的行为指导</div>
                  <div>• 定期测试和优化提示词效果</div>
                </div>
              </Panel>

              <Panel header="常见问题" key="troubleshooting">
                <div className="space-y-2 text-sm">
                  <div>
                    <Text strong>Q: 如何让 Agent 更专业？</Text>
                    <div>A: 添加具体的专业背景、经验描述和领域知识</div>
                  </div>
                  <div>
                    <Text strong>Q: 如何控制输出格式？</Text>
                    <div>A: 在提示词中明确定义输出结构和格式要求</div>
                  </div>
                  <div>
                    <Text strong>Q: 如何避免偏离主题？</Text>
                    <div>A: 设定清晰的职责边界和工作范围限制</div>
                  </div>
                </div>
              </Panel>
            </Collapse>
          </TabPane>
        </Tabs>
      </Card>

      {/* 模板选择弹窗 */}
      <Modal
        title="选择系统提示模板"
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
            <Card
              key={key}
              hoverable
              className="cursor-pointer"
              onClick={() => handleTemplateSelect(key)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Title level={5} className="mb-2">
                    {template.name}
                  </Title>
                  <Text type="secondary" className="text-sm">
                    {template.description}
                  </Text>
                </div>
                <Button 
                  type="primary" 
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(key);
                  }}
                >
                  应用
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  );
};
