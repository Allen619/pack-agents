'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Tooltip,
  Progress,
  Alert,
  Spin,
  Divider,
  Upload,
  Select,
  Switch,
} from 'antd';
import {
  Conversations,
  Bubble,
  Welcome,
  Prompts,
  Sender,
  Attachments,
  ThoughtChain,
  Actions,
} from '@ant-design/x';
import {
  SendOutlined,
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  FileTextOutlined,
  BugOutlined,
  CodeOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DownloadOutlined,
  CopyOutlined,
  LikeOutlined,
  DislikeOutlined,
} from '@ant-design/icons';
import { AgentConfig } from '@/types';
import { cn, formatBytes, downloadFile } from '@/utils';
import { analyzeCode, generateCode, testClaudeConnection } from '@/lib/claude';

const { Text, Title } = Typography;
const { Option } = Select;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'analysis' | 'generation' | 'chat';
    tokensUsed?: number;
    executionTime?: number;
    files?: Array<{
      path: string;
      content: string;
      language: string;
    }>;
    streaming?: boolean;
    error?: string;
  };
}

interface ThoughtStep {
  title: string;
  status: 'wait' | 'process' | 'success' | 'error';
  description?: string;
}

interface EnhancedAgentChatInterfaceProps {
  agent: AgentConfig;
  className?: string;
  showAdvancedFeatures?: boolean;
  onMessage?: (message: ChatMessage) => void;
}

export const EnhancedAgentChatInterface: React.FC<EnhancedAgentChatInterfaceProps> = ({
  agent,
  className,
  showAdvancedFeatures = true,
  onMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentThoughts, setCurrentThoughts] = useState<ThoughtStep[]>([]);
  const [showThoughts, setShowThoughts] = useState(true);
  const [operationMode, setOperationMode] = useState<'chat' | 'analysis' | 'generation'>('chat');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string;
    content: string;
    type: string;
  }>>([]);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  // 初始化连接测试
  useEffect(() => {
    testConnection();
  }, [agent.id]);

  const testConnection = async () => {
    try {
      const connected = await testClaudeConnection(agent.id);
      setIsConnected(connected);
      if (!connected) {
        message.warning('Claude API 连接失败，请检查配置');
      }
    } catch (error) {
      setIsConnected(false);
      message.error('连接测试失败');
    }
  };

  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    onMessage?.(message);
  };

  const updateThoughts = (steps: ThoughtStep[]) => {
    setCurrentThoughts(steps);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !isConnected) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setIsLoading(true);

    try {
      let response: any;
      let messageType: 'chat' | 'analysis' | 'generation' = 'chat';

      // 根据操作模式和内容判断处理方式
      if (operationMode === 'analysis' || content.toLowerCase().includes('分析') || content.toLowerCase().includes('analyze')) {
        messageType = 'analysis';
        await handleCodeAnalysis(content);
      } else if (operationMode === 'generation' || content.toLowerCase().includes('生成') || content.toLowerCase().includes('generate')) {
        messageType = 'generation';
        await handleCodeGeneration(content);
      } else {
        // 普通对话模式
        await handleChatMessage(content);
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: '抱歉，处理您的请求时发生了错误。请稍后再试。',
        timestamp: new Date(),
        metadata: {
          error: (error as Error).message,
        },
      };
      addMessage(errorMessage);
      message.error('处理失败：' + (error as Error).message);
    } finally {
      setIsLoading(false);
      setCurrentThoughts([]);
    }
  };

  const handleChatMessage = async (content: string) => {
    updateThoughts([
      { title: '理解用户输入', status: 'process' },
      { title: '生成响应', status: 'wait' },
      { title: '格式化输出', status: 'wait' },
    ]);

    // 模拟简单的对话响应
    // 在实际实现中，这里应该调用 Claude API 进行对话
    setTimeout(() => {
      updateThoughts([
        { title: '理解用户输入', status: 'success' },
        { title: '生成响应', status: 'process' },
        { title: '格式化输出', status: 'wait' },
      ]);
    }, 1000);

    setTimeout(() => {
      updateThoughts([
        { title: '理解用户输入', status: 'success' },
        { title: '生成响应', status: 'success' },
        { title: '格式化输出', status: 'process' },
      ]);

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `作为 ${agent.name}，我理解您的问题：${content}\n\n我可以为您提供相关的帮助和建议。如果您需要代码分析或生成功能，请使用相应的模式或在消息中明确说明。`,
        timestamp: new Date(),
        metadata: {
          type: 'chat',
          tokensUsed: 150,
          executionTime: 2000,
        },
      };

      addMessage(assistantMessage);
    }, 2000);
  };

  const handleCodeAnalysis = async (content: string) => {
    updateThoughts([
      { title: '解析分析请求', status: 'process' },
      { title: '加载知识库', status: 'wait' },
      { title: '执行代码分析', status: 'wait' },
      { title: '生成分析报告', status: 'wait' },
    ]);

    try {
      const analysisRequest = {
        executionId: `chat-analysis-${Date.now()}`,
        analysisTarget: content,
        paths: agent.knowledgeBasePaths || ['./src'],
        analysisType: 'full' as const,
        specificQuestions: [content],
        maxTurns: 3,
        startTime: Date.now(),
      };

      updateThoughts([
        { title: '解析分析请求', status: 'success' },
        { title: '加载知识库', status: 'process' },
        { title: '执行代码分析', status: 'wait' },
        { title: '生成分析报告', status: 'wait' },
      ]);

      const result = await analyzeCode(analysisRequest);

      updateThoughts([
        { title: '解析分析请求', status: 'success' },
        { title: '加载知识库', status: 'success' },
        { title: '执行代码分析', status: 'success' },
        { title: '生成分析报告', status: 'success' },
      ]);

      const analysisMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: result.success ? result.content.analysis : '分析失败：' + result.error?.message,
        timestamp: new Date(),
        metadata: {
          type: 'analysis',
          tokensUsed: result.metadata?.tokensUsed,
          executionTime: result.metadata?.executionTime,
        },
      };

      addMessage(analysisMessage);

    } catch (error) {
      updateThoughts([
        { title: '解析分析请求', status: 'success' },
        { title: '加载知识库', status: 'error' },
        { title: '执行代码分析', status: 'error' },
        { title: '生成分析报告', status: 'error' },
      ]);
      throw error;
    }
  };

  const handleCodeGeneration = async (content: string) => {
    updateThoughts([
      { title: '解析生成需求', status: 'process' },
      { title: '准备上下文', status: 'wait' },
      { title: '生成代码', status: 'wait' },
      { title: '处理结果', status: 'wait' },
    ]);

    try {
      const generationRequest = {
        executionId: `chat-generation-${Date.now()}`,
        prompt: content,
        contextFiles: uploadedFiles.map(file => ({
          path: file.name,
          content: file.content,
          language: file.type,
        })),
        projectContext: {
          language: 'typescript',
          framework: 'react',
        },
        maxTurns: 5,
        startTime: Date.now(),
      };

      updateThoughts([
        { title: '解析生成需求', status: 'success' },
        { title: '准备上下文', status: 'process' },
        { title: '生成代码', status: 'wait' },
        { title: '处理结果', status: 'wait' },
      ]);

      const result = await generateCode(generationRequest);

      updateThoughts([
        { title: '解析生成需求', status: 'success' },
        { title: '准备上下文', status: 'success' },
        { title: '生成代码', status: 'success' },
        { title: '处理结果', status: 'success' },
      ]);

      const generationMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: result.success ? result.content : '生成失败：' + result.error?.message,
        timestamp: new Date(),
        metadata: {
          type: 'generation',
          tokensUsed: result.metadata?.tokensUsed,
          executionTime: result.metadata?.executionTime,
          files: result.files,
        },
      };

      addMessage(generationMessage);

    } catch (error) {
      updateThoughts([
        { title: '解析生成需求', status: 'success' },
        { title: '准备上下文', status: 'error' },
        { title: '生成代码', status: 'error' },
        { title: '处理结果', status: 'error' },
      ]);
      throw error;
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const fileInfo = {
        name: file.name,
        content,
        type: file.name.split('.').pop() || 'text',
      };
      setUploadedFiles(prev => [...prev, fileInfo]);
      message.success(`文件 ${file.name} 上传成功`);
    };
    reader.readAsText(file);
    return false; // 阻止默认上传
  };

  const handleDownloadFile = (file: { path: string; content: string; language: string }) => {
    downloadFile(file.content, file.path);
    message.success(`文件 ${file.path} 下载成功`);
  };

  const clearConversation = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空当前对话吗？此操作不可撤销。',
      onOk: () => {
        setMessages([]);
        setUploadedFiles([]);
        message.success('对话已清空');
      },
    });
  };

  return (
    <div className={cn('enhanced-agent-chat-interface', className)}>
      <Card>
        {/* 头部信息 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {agent.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <Title level={4} className="mb-0">{agent.name}</Title>
              <div className="flex items-center space-x-2">
                <Tag color={agent.role === 'main' ? 'green' : agent.role === 'sub' ? 'blue' : 'purple'}>
                  {agent.role === 'main' ? '主 Agent' : 
                   agent.role === 'sub' ? '执行 Agent' : 
                   '总结 Agent'}
                </Tag>
                <Tag color={isConnected ? 'green' : 'red'}>
                  {isConnected ? '已连接' : '连接失败'}
                </Tag>
              </div>
            </div>
          </div>
          
          <Space>
            <Select
              value={operationMode}
              onChange={setOperationMode}
              style={{ width: 120 }}
              size="small"
            >
              <Option value="chat">对话模式</Option>
              <Option value="analysis">代码分析</Option>
              <Option value="generation">代码生成</Option>
            </Select>
            
            <Tooltip title="显示/隐藏思维过程">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setShowThoughts(!showThoughts)}
                type={showThoughts ? 'primary' : 'default'}
              />
            </Tooltip>
            
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={testConnection}
              loading={isLoading}
            >
              测试连接
            </Button>
            
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setIsSettingsVisible(true)}
            />
          </Space>
        </div>

        {/* 连接状态提示 */}
        {!isConnected && (
          <Alert
            message="Claude API 连接异常"
            description="请检查 Agent 的 LLM 配置，确保 API 密钥正确且有效。"
            type="warning"
            showIcon
            className="mb-4"
            action={
              <Button size="small" onClick={testConnection}>
                重新测试
              </Button>
            }
          />
        )}

        {/* 欢迎界面 */}
        {messages.length === 0 && (
          <Welcome
            variant="filled"
            icon={<ThunderboltOutlined />}
            title={`与 ${agent.name} 开始对话`}
            description={agent.description || '我是您的 AI 助手，可以帮助您分析代码、生成代码或进行技术讨论。'}
            extra={
              <Prompts
                title="快速开始"
                items={[
                  {
                    key: 'analyze',
                    label: '分析代码',
                    description: '让我分析您的代码结构和质量',
                    children: '请分析一下我的项目代码结构',
                  },
                  {
                    key: 'generate',
                    label: '生成代码',
                    description: '基于需求生成相应的代码',
                    children: '帮我生成一个 React 组件',
                  },
                  {
                    key: 'debug',
                    label: '解决问题',
                    description: '帮助您定位和解决技术问题',
                    children: '我遇到了一个技术问题，需要帮助',
                  },
                  {
                    key: 'optimize',
                    label: '性能优化',
                    description: '提供性能优化建议',
                    children: '如何优化我的代码性能？',
                  },
                ]}
                onItemClick={(item) => {
                  if (item.children) {
                    handleSendMessage(item.children as string);
                  }
                }}
              />
            }
          />
        )}

        {/* 对话区域 */}
        {messages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text type="secondary">
                对话历史 ({messages.length} 条消息)
              </Text>
              <Button size="small" danger onClick={clearConversation}>
                清空对话
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto" ref={conversationRef}>
              <Conversations
                items={messages.map(msg => ({
                  key: msg.id,
                  avatar: msg.role === 'user' ? undefined : {
                    style: { backgroundColor: '#1890ff' },
                    children: agent.name?.charAt(0) || 'A',
                  },
                  placement: msg.role === 'user' ? 'right' : 'left',
                  content: (
                    <Bubble
                      content={msg.content}
                      avatar={msg.role === 'assistant' ? {
                        style: { backgroundColor: '#1890ff' },
                        children: agent.name?.charAt(0) || 'A',
                      } : undefined}
                      variant={msg.role === 'user' ? 'outlined' : 'filled'}
                      actions={
                        msg.role === 'assistant' ? (
                          <Actions
                            items={[
                              {
                                icon: <CopyOutlined />,
                                tooltip: '复制',
                                onClick: () => {
                                  navigator.clipboard.writeText(msg.content);
                                  message.success('已复制到剪贴板');
                                },
                              },
                              {
                                icon: <LikeOutlined />,
                                tooltip: '有用',
                                onClick: () => message.info('感谢您的反馈'),
                              },
                              {
                                icon: <DislikeOutlined />,
                                tooltip: '无用',
                                onClick: () => message.info('我们会改进'),
                              },
                              ...(msg.metadata?.files ? [
                                {
                                  icon: <DownloadOutlined />,
                                  tooltip: '下载生成的文件',
                                  onClick: () => {
                                    msg.metadata?.files?.forEach(file => {
                                      handleDownloadFile(file);
                                    });
                                  },
                                },
                              ] : []),
                            ]}
                          />
                        ) : undefined
                      }
                    />
                  ),
                }))}
              />
            </div>

            {/* 生成的文件显示 */}
            {messages.some(msg => msg.metadata?.files?.length) && (
              <Card size="small" title="生成的文件">
                <div className="space-y-2">
                  {messages
                    .filter(msg => msg.metadata?.files?.length)
                    .flatMap(msg => msg.metadata!.files!)
                    .map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <FileTextOutlined />
                          <Text code>{file.path}</Text>
                          <Tag size="small">{file.language}</Tag>
                        </div>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(file)}
                        >
                          下载
                        </Button>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* AI 思维链展示 */}
        {showThoughts && currentThoughts.length > 0 && (
          <Card size="small" className="mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <BugOutlined />
              <Text strong>AI 思考过程</Text>
            </div>
            <ThoughtChain
              items={currentThoughts.map(thought => ({
                title: thought.title,
                status: thought.status,
                description: thought.description,
              }))}
            />
          </Card>
        )}

        {/* 上传的文件显示 */}
        {uploadedFiles.length > 0 && (
          <Card size="small" className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Text strong>上下文文件 ({uploadedFiles.length})</Text>
              <Button size="small" onClick={() => setUploadedFiles([])}>
                清空
              </Button>
            </div>
            <div className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <FileTextOutlined />
                  <Text>{file.name}</Text>
                  <Tag size="small">{file.type}</Tag>
                  <Text type="secondary">({formatBytes(file.content.length)})</Text>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 输入区域 */}
        <Sender
          placeholder={`向 ${agent.name} 发送消息...`}
          onSubmit={handleSendMessage}
          loading={isLoading}
          disabled={!isConnected}
          actions={
            <Attachments
              beforeUpload={handleFileUpload}
              items={[
                {
                  key: 'file',
                  label: '上传代码文件',
                  accept: '.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.kt,.scala,.css,.html,.vue,.json,.md',
                },
              ]}
            />
          }
        />
      </Card>

      {/* 设置弹窗 */}
      <Modal
        title="聊天设置"
        open={isSettingsVisible}
        onCancel={() => setIsSettingsVisible(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          <div>
            <Text strong>显示选项</Text>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Text>显示思维过程</Text>
                <Switch checked={showThoughts} onChange={setShowThoughts} />
              </div>
            </div>
          </div>

          <Divider />

          <div>
            <Text strong>Agent 信息</Text>
            <div className="mt-2 space-y-1 text-sm">
              <div>模型: {agent.llmConfig?.model}</div>
              <div>提供商: {agent.llmConfig?.provider}</div>
              <div>知识库路径: {agent.knowledgeBasePaths?.length || 0} 个</div>
              <div>可用工具: {agent.enabledTools?.length || 0} 个</div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
