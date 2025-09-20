'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Bubble,
  Conversations,
  Welcome,
  Prompts,
  Sender,
  ThoughtChain,
  Actions,
} from '@ant-design/x';
import { 
  RobotOutlined, 
  UserOutlined, 
  CopyOutlined, 
  LikeOutlined, 
  DislikeOutlined,
  PaperClipOutlined,
  AudioOutlined 
} from '@ant-design/icons';
import { generateId, copyToClipboard } from '@/lib/utils';
import { ClaudeAgentConfig } from '@/lib/types';
import { SSEClient } from '@/lib/claude/streaming/sse-manager';

export interface ClaudeAgentChatProps {
  agent: ClaudeAgentConfig;
  onMessage?: (message: MessageType) => void;
  onExecutionComplete?: (result: any) => void;
  onError?: (error: any) => void;
  className?: string;
  height?: number | string;
}

export interface MessageType {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
  completed?: boolean;
  error?: boolean;
  metadata?: {
    tokensUsed?: number;
    executionTime?: number;
    toolsUsed?: string[];
  };
}

export interface ThoughtItem {
  title: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  description?: string;
}

/**
 * Claude Agent 聊天组件 - 使用 Ant Design X 组件构建的AI原生聊天界面
 */
export const ClaudeAgentChat: React.FC<ClaudeAgentChatProps> = ({
  agent,
  onMessage,
  onExecutionComplete,
  onError,
  className = '',
  height = '100%',
}) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughtChain, setThoughtChain] = useState<ThoughtItem[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [sseClient, setSseClient] = useState<SSEClient | null>(null);

  // 初始化SSE客户端
  useEffect(() => {
    const client = new SSEClient();
    setSseClient(client);

    return () => {
      client.disconnect();
    };
  }, []);

  // 连接到Agent执行流
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isThinking) return;

    setIsThinking(true);
    setThoughtChain([
      { title: '分析用户请求', status: 'process' },
      { title: '选择合适工具', status: 'wait' },
      { title: '执行分析任务', status: 'wait' },
      { title: '生成回复内容', status: 'wait' },
    ]);

    // 添加用户消息
    const userMessage: MessageType = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // 创建助手消息容器
    const assistantMessage: MessageType = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    const executionId = generateId();
    setCurrentExecutionId(executionId);

    try {
      // 设置SSE事件监听器
      if (sseClient) {
        sseClient.on('agent_message', (event) => {
          if (event.executionId === executionId && event.message?.type === 'result') {
            const newContent = event.message.content || '';
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: msg.content + newContent }
                : msg
            ));
          }
        });

        sseClient.on('progress', (event) => {
          if (event.executionId === executionId) {
            updateThoughtChainProgress(event.progress);
          }
        });

        sseClient.on('execution_complete', (event) => {
          if (event.executionId === executionId) {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, streaming: false, completed: true }
                : msg
            ));
            setIsThinking(false);
            setThoughtChain([]);
            setCurrentExecutionId(null);
            
            if (onExecutionComplete) {
              onExecutionComplete(event.data);
            }
          }
        });

        sseClient.on('execution_error', (event) => {
          if (event.executionId === executionId) {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessage.id
                ? {
                    ...msg,
                    content: `执行出错: ${event.error?.message || '未知错误'}`,
                    streaming: false,
                    error: true,
                  }
                : msg
            ));
            setIsThinking(false);
            setThoughtChain([]);
            setCurrentExecutionId(null);
            
            if (onError) {
              onError(event.error);
            }
          }
        });

        // 连接到流式执行端点
        sseClient.connect(`/api/claude/agents/${agent.id}/execute/stream`);
      }

      // 发起执行请求
      const response = await fetch(`/api/claude/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: content,
          options: {
            enableCache: true,
            timeout: 300000, // 5分钟超时
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || '执行失败');
      }

    } catch (error: any) {
      console.error('Agent execution error:', error);
      
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? {
              ...msg,
              content: `执行出错: ${error.message}`,
              streaming: false,
              error: true,
            }
          : msg
      ));
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsThinking(false);
      setThoughtChain([]);
      setCurrentExecutionId(null);
    }
  }, [agent.id, isThinking, sseClient, onExecutionComplete, onError]);

  // 更新思维链进度
  const updateThoughtChainProgress = useCallback((progress: any) => {
    setThoughtChain(prev => {
      const newChain = [...prev];
      
      // 根据进度类型更新相应的思维链状态
      if (progress.type === 'tool_selection') {
        newChain[1] = { ...newChain[1], status: 'process' };
      } else if (progress.type === 'tool_execution') {
        newChain[1] = { ...newChain[1], status: 'finish' };
        newChain[2] = { ...newChain[2], status: 'process' };
      } else if (progress.type === 'content_generation') {
        newChain[2] = { ...newChain[2], status: 'finish' };
        newChain[3] = { ...newChain[3], status: 'process' };
      }
      
      return newChain;
    });
  }, []);

  // 处理消息评价
  const rateMessage = useCallback(async (messageId: string, rating: 'positive' | 'negative') => {
    try {
      // 这里可以发送评价到后端
      console.log(`Message ${messageId} rated as ${rating}`);
      // TODO: 实现评价API调用
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback(async () => {
    try {
      // TODO: 实现文件上传逻辑
      console.log('File upload requested');
    } catch (error) {
      console.error('File upload error:', error);
    }
  }, []);

  // 处理语音输入
  const handleVoiceInput = useCallback(async () => {
    try {
      // TODO: 实现语音输入逻辑
      console.log('Voice input requested');
    } catch (error) {
      console.error('Voice input error:', error);
    }
  }, []);

  // 预定义的提示词
  const predefinedPrompts = [
    {
      key: 'analyze',
      label: '分析代码',
      description: '让我分析项目的代码结构和质量',
      prompt: '请分析当前项目的代码结构，识别潜在问题并提供改进建议',
    },
    {
      key: 'generate',
      label: '生成代码',
      description: '根据需求自动生成相应的代码',
      prompt: '我需要生成一个新的React组件，请帮我创建',
    },
    {
      key: 'debug',
      label: '调试问题',
      description: '帮助定位和解决代码中的问题',
      prompt: '我的代码出现了问题，请帮我诊断和修复',
    },
    {
      key: 'refactor',
      label: '重构代码',
      description: '优化代码结构和性能',
      prompt: '请帮我重构这段代码，提高其可读性和性能',
    },
    {
      key: 'test',
      label: '编写测试',
      description: '为代码生成单元测试',
      prompt: '请为这个函数编写完整的单元测试',
    },
    {
      key: 'document',
      label: '生成文档',
      description: '为代码和API生成文档',
      prompt: '请为这个模块生成详细的API文档',
    },
  ];

  return (
    <div className={`claude-agent-chat ${className}`} style={{ height }}>
      {/* 欢迎界面 */}
      {messages.length === 0 && (
        <Welcome
          variant="filled"
          icon={<RobotOutlined className="text-blue-500" />}
          title={`${agent.name} 助手`}
          description={agent.description}
          extra={
            <Prompts
              title="快速开始"
              items={predefinedPrompts}
              onItemClick={(item) => handleSendMessage(item.prompt)}
              className="mt-4"
            />
          }
          className="p-6"
        />
      )}

      {/* 对话历史 */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <Conversations
            items={messages}
            renderItem={(message) => (
              <Bubble
                key={message.id}
                content={message.content}
                avatar={
                  message.role === 'user'
                    ? <UserOutlined className="text-green-500" />
                    : <RobotOutlined className="text-blue-500" />
                }
                variant={message.role === 'user' ? 'outlined' : 'filled'}
                typing={message.streaming}
                status={message.error ? 'error' : 'success'}
                className={`mb-4 ${message.role === 'user' ? 'ml-8' : 'mr-8'}`}
                actions={
                  message.role === 'assistant' && message.completed && !message.error
                    ? (
                        <Actions
                          items={[
                            {
                              key: 'copy',
                              label: '复制',
                              icon: <CopyOutlined />,
                              onClick: () => copyToClipboard(message.content),
                            },
                            {
                              key: 'thumbsUp',
                              label: '有用',
                              icon: <LikeOutlined />,
                              onClick: () => rateMessage(message.id, 'positive'),
                            },
                            {
                              key: 'thumbsDown',
                              label: '无用',
                              icon: <DislikeOutlined />,
                              onClick: () => rateMessage(message.id, 'negative'),
                            },
                          ]}
                        />
                      )
                    : undefined
                }
              />
            )}
          />
        </div>
      )}

      {/* AI 思维链 */}
      {isThinking && thoughtChain.length > 0 && (
        <div className="px-4 pb-2">
          <ThoughtChain
            items={thoughtChain}
            className="bg-gray-50 rounded-lg p-3"
          />
        </div>
      )}

      {/* 输入组件 */}
      <div className="border-t bg-white p-4">
        <Sender
          placeholder={`向 ${agent.name} 发送消息...`}
          onSubmit={handleSendMessage}
          loading={isThinking}
          disabled={isThinking}
          actions={
            <Actions
              items={[
                {
                  key: 'attachment',
                  label: '上传文件',
                  icon: <PaperClipOutlined />,
                  onClick: handleFileUpload,
                },
                {
                  key: 'voice',
                  label: '语音输入',
                  icon: <AudioOutlined />,
                  onClick: handleVoiceInput,
                },
              ]}
            />
          }
          className="shadow-sm"
        />
      </div>
    </div>
  );
};

export default ClaudeAgentChat;
