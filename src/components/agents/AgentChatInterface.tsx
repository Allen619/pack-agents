import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Alert,
  Select,
  message as antdMessage,
} from 'antd';
import {
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
  ClearOutlined,
  SettingOutlined,
  StopOutlined,
  LoadingOutlined,
  CopyOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Bubble,
  Sender,
  Welcome,
} from '@ant-design/x';
import markdownit from 'markdown-it';
import { AgentConfig } from '@/types';
import { getAgentRoleColor } from '@/utils';

const DEFAULT_MAX_TURNS = 6;

type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

const PERMISSION_MODE_OPTIONS: Array<{
  value: PermissionMode;
  label: string;
  description: string;
}> = [
  {
    value: 'acceptEdits',
    label: 'acceptEdits（自动接受编辑）',
    description: '自动接受常规文件编辑操作，仍会对潜在风险请求确认。',
  },
  {
    value: 'default',
    label: 'default（逐项确认）',
    description: '每次工具调用都需人工确认，适合严格审核或演示场景。',
  },
  {
    value: 'bypassPermissions',
    label: 'bypassPermissions（跳过权限）',
    description: '直接执行所有启用的工具，仅在高度受控环境中使用。',
  },
  {
    value: 'plan',
    label: 'plan（仅生成计划）',
    description: '仅输出操作计划，不会实际落地改动，适合先评估方案。',
  },
];


// 复制到剪贴板函数
const copyToClipboard = async (text: string, messageId: string) => {
  try {
    await navigator.clipboard.writeText(text);
    antdMessage.success('已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    antdMessage.error('复制失败，请手动选择复制');
  }
};


// 初始化 markdown-it
const md = markdownit({ html: true, breaks: true });

// Markdown 渲染组件
const renderMarkdown = (content: string, onCopy?: (text: string) => void) => {
  if (!content || content === '...') {
    return <div className="text-gray-400">...</div>;
  }

  const renderWithCopyButtons = (html: string) => {
    // 为代码块添加复制按钮
    return html.replace(
      /<pre[^>]*><code[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
      (match, codeClass, codeContent) => {
        const buttonId = `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cleanContent = codeContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        return `
          <div class="relative">
            <pre class="overflow-x-auto p-4 bg-gray-800 rounded-lg text-gray-100 text-base">
              <code class="${codeClass}">${codeContent}</code>
            </pre>
            <button
              onclick="
                const event = new CustomEvent('copy-code', {
                  detail: { code: \`${cleanContent}\` },
                  bubbles: true
                });
                this.dispatchEvent(event);
              "
              class="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md transition-colors duration-200"
              title="复制代码"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8z"/>
              </svg>
            </button>
          </div>
        `;
      }
    );
  };

  return (
    <div
      className="max-w-none prose prose-sm"
      onCopy={(e) => {
        if (onCopy) {
          onCopy(window.getSelection()?.toString() || '');
        }
      }}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: renderWithCopyButtons(
            md.render(content)
              .replace(/<blockquote>/g, '<blockquote class="pl-4 my-2 italic border-l-4 border-gray-300 bg-gray-50 py-2 pr-4 rounded">')
          )
        }}
      />
    </div>
  );
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
  error?: string;
}

interface AgentChatInterfaceProps {
  agent: AgentConfig;
  onBack?: () => void;
  onOpenSettings?: (agent: AgentConfig) => void;
}

const buildWelcomeMessage = (agent: AgentConfig): ChatMessage => ({
  id: `welcome-${agent.id}`,
  role: 'assistant',
  content: `你好，我是 ${agent.name}。${
    agent.description || '我可以帮助你完成工作。'
  }`,
  timestamp: new Date(),
});

const getRoleText = (role: string) => {
  switch (role) {
    case 'main':
      return 'Coordinator';
    case 'sub':
      return 'Specialist';
    case 'synthesis':
      return 'Synthesizer';
    default:
      return role;
  }
};

const getProviderText = (provider: string) => {
  switch (provider) {
    case 'claude':
      return 'Claude';
    case 'openai':
      return 'OpenAI';
    default:
      return provider;
  }
};

export function AgentChatInterface({ agent, onBack, onOpenSettings }: AgentChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMessage(agent),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [shouldClearContext, setShouldClearContext] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('acceptEdits');
  const activeRequest = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 处理代码块复制事件
  useEffect(() => {
    const handleCodeCopy = (event: CustomEvent) => {
      const { code } = event.detail;
      copyToClipboard(code, 'code-block');
    };

    document.addEventListener('copy-code', handleCodeCopy as EventListener);

    return () => {
      document.removeEventListener('copy-code', handleCodeCopy as EventListener);
    };
  }, []);

  const hasStreamingMessage = messages.some((msg) => msg.streaming);

  useEffect(() => {
    setMessages([buildWelcomeMessage(agent)]);
    setInputValue('');
    setIsThinking(false);
    setPermissionMode('acceptEdits');
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
  }, [agent]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => () => {
    if (activeRequest.current) {
      activeRequest.current.abort();
    }
  }, []);

  const upsertAssistantMessage = useCallback(
    (id: string, updater: (current: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === id);
        if (index === -1) {
          return prev;
        }
        const updated = [...prev];
        updated[index] = updater(prev[index]);
        return updated;
      });
    },
    []
  );

  const handleOpenSettings = useCallback(() => {
    if (onOpenSettings) {
      onOpenSettings(agent);
    } else {
      antdMessage.info('设置功能暂未配置');
    }
  }, [agent, onOpenSettings]);

  const handleClearChat = useCallback(() => {
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
    setMessages([buildWelcomeMessage(agent)]);
    setInputValue('');
    setIsThinking(false);
    setSessionId(null);
    antdMessage.success('聊天记录已清空');
  }, [agent]);

  const handleStop = useCallback(() => {
    if (activeRequest.current) {
      activeRequest.current.abort();
      antdMessage.info('已停止当前响应');
    }
  }, []);

  // 清除上下文函数
  const clearContext = useCallback(() => {
    setMessages([buildWelcomeMessage(agent)]);
    setInputValue('');
    setIsThinking(false);
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
    setShouldClearContext(prev => !prev); // 切换状态
    setSessionId(null);
    antdMessage.success('上下文已清除，下次对话将重新开始');
  }, [agent]);

  const renderMessageWithCopy = useCallback(
    (message: ChatMessage) => {
      const contentNode = message.role === 'assistant'
        ? renderMarkdown(message.content, (text) => copyToClipboard(text, message.id))
        : (
          <div className="whitespace-pre-wrap break-words text-sm text-gray-800">
            {message.content || '...'}
          </div>
        );

      return (
        <div className="space-y-2">
          {contentNode}
          <div className="flex justify-end">
            <Button
              size="small"
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(message.content || '', message.id)}
            >
              复制此消息
            </Button>
          </div>
        </div>
      );
    },
    []
  );

  const currentPermissionMode = PERMISSION_MODE_OPTIONS.find(option => option.value === permissionMode);

  const handleSendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content) return;

    if (isThinking) {
      antdMessage.warning('Claude is already responding. Please wait.');
      return;
    }

    const timestamp = new Date();
    const userMessage: ChatMessage = {
      id: `user-${timestamp.getTime()}`,
      role: 'user',
      content,
      timestamp,
    };

    const assistantId = `assistant-${timestamp.getTime()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };

    const shouldResumeSession = Boolean(sessionId) && !shouldClearContext;

    const payload: {
      messages: { role: ChatMessage['role']; content: string }[];
      sessionId?: string;
      options: {
        maxTurns: number;
        continue: boolean;
        permissionMode: PermissionMode;
      };
    } = {
      messages: [...messages, userMessage].map(({ role, content: rawContent }) => ({
        role,
        content: rawContent,
      })),
      options: {
        maxTurns: DEFAULT_MAX_TURNS,
        continue: shouldResumeSession,
        permissionMode,
      },
    };

    if (shouldResumeSession && sessionId) {
      payload.sessionId = sessionId;
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue('');
    setIsThinking(true);

    // 发送消息后恢复continue状态，确保下次默认继续上下文
    if (shouldClearContext) {
      setShouldClearContext(false);
    }

    const controller = new AbortController();
    activeRequest.current = controller;

    try {
      const response = await fetch(`/api/agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errorMessage = '聊天请求失败';
        try {
          const errorBody = await response.json();
          errorMessage = errorBody?.error?.message || errorMessage;
        } catch (err) {
          console.warn('解析聊天错误响应失败', err);
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const appendDelta = (delta: string) => {
        // 过滤掉 (no content)
        if (delta === '(no content)') {
          return;
        }

        upsertAssistantMessage(assistantId, (current) => {
          // 处理开头的 \n\n
          let processedDelta = delta;
          if (current.content === '' && delta.startsWith('\n\n')) {
            processedDelta = delta.substring(2);
          }

          return {
            ...current,
            content: current.content + processedDelta,
          };
        });
      };

      const finalizeAssistant = (finalText?: string) => {
        upsertAssistantMessage(assistantId, (current) => {
          let content = current.content;

          if (typeof finalText === 'string' && finalText.length > 0) {
            content = finalText;
          }

          // 过滤掉 (no content)
          content = content.replace(/\(no content\)/g, '');

          // 处理开头的 \n\n
          if (content.startsWith('\n\n')) {
            content = content.substring(2);
          }

          return {
            ...current,
            content,
            streaming: false,
            timestamp: new Date(),
          };
        });
      };

      const markError = (errorMessage: string) => {
        upsertAssistantMessage(assistantId, (current) => ({
          ...current,
          content: errorMessage,
          streaming: false,
          error: errorMessage,
          timestamp: new Date(),
        }));
        antdMessage.error(errorMessage);
      };

      const handleLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let event: any;
        try {
          event = JSON.parse(trimmed);
        } catch (err) {
          console.warn('无法解析 Claude 响应块:', trimmed);
          return;
        }

        if (typeof event.sessionId === 'string' && event.sessionId) {
          setSessionId(event.sessionId);
        }

        switch (event.type) {
          case 'delta':
            if (typeof event.text === 'string') {
              appendDelta(event.text);
            }
            break;
          case 'done':
            finalizeAssistant(typeof event.text === 'string' ? event.text : undefined);
            break;
          case 'error':
            markError(
              typeof event.message === 'string' ? event.message : 'Claude 响应失败'
            );
            break;
          default:
            if (typeof event.text === 'string') {
              appendDelta(event.text);
            }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split('\n');
        buffer = segments.pop() ?? '';
        segments.forEach(handleLine);
      }

      if (buffer.trim()) {
        handleLine(buffer);
      }

      finalizeAssistant();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        upsertAssistantMessage(assistantId, (current) => ({
          ...current,
          content: current.content || '响应已取消。',
          streaming: false,
          timestamp: new Date(),
        }));
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Claude 聊天失败';
        upsertAssistantMessage(assistantId, (current) => ({
          ...current,
          content: errorMessage,
          streaming: false,
          error: errorMessage,
          timestamp: new Date(),
        }));
        antdMessage.error(errorMessage);
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
      setIsThinking(false);
    }
  }, [agent.id, inputValue, isThinking, messages, permissionMode, sessionId, shouldClearContext, upsertAssistantMessage]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 头部信息 */}
      <div className="p-4 bg-white border-b">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-blue-500 rounded-full">
              <RobotOutlined className="text-lg text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{agent.name}</div>
              <div className="flex items-center mt-1 space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getAgentRoleColor(agent.role).replace('bg-', 'bg-').replace('-500', '-100').replace('text-', 'text-')}`}>
                  {getRoleText(agent.role)}
                </span>
                <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded-full">
                  {getProviderText(agent.llmConfig.provider)}
                </span>
                <span className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">
                  {agent.metadata?.tags?.length ? agent.metadata.tags.join(', ') : 'No tags'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={handleClearChat}
              disabled={messages.length <= 1 && !inputValue}
            >
              清空
            </Button>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={clearContext}
              disabled={messages.length <= 1}
              title="清除上下文"
            >
              清除上下文
            </Button>
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={handleOpenSettings}
            >
              设置
            </Button>
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={handleStop}
              disabled={!isThinking}
            >
              停止
            </Button>
            {onBack && (
              <Button size="small" onClick={onBack}>
                返回
              </Button>
            )}
          </div>
        </div>

        {agent.description && (
          <div className="mt-2 text-sm text-gray-600">
            {agent.description}
          </div>
        )}
      </div>

      {/* 聊天区域 */}
      <div className="flex flex-col flex-1">
        {/* 消息列表 */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Welcome
                title="开始对话"
                description={`与 ${agent.name} 开始智能对话`}
                icon={<RobotOutlined style={{ fontSize: 48, color: '#1890ff' }} />}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Bubble.List
                items={messages.map((message) => {
                  const isUser = message.role === 'user';

                  return {
                    id: message.id,
                    role: isUser ? 'user' : 'assistant',
                    content: message.content || '...',
                    timestamp: message.streaming ? '生成中...' : message.timestamp.toLocaleTimeString(),
                    loading: message.streaming,
                    variant: message.error ? 'outlined' : undefined,
                    placement: isUser ? 'end' : 'start',
                    messageRender: () => renderMessageWithCopy(message),
                    avatar: isUser ? {
                      style: {
                        background: '#52c41a',
                        color: 'white',
                      },
                      children: <UserOutlined />,
                    } : {
                      style: {
                        background: getAgentRoleColor(agent.role).replace('bg-', '').replace('-500', ''),
                        color: 'white',
                      },
                      children: <RobotOutlined />,
                    },
                  };
                })}
                onCopy={(event: any) => {
                  const content = window.getSelection()?.toString() || '';
                  copyToClipboard(content, 'bubble-list');
                }}
              />

              {isThinking && !hasStreamingMessage && (
                <div className="flex justify-start">
                  <Bubble
                    content="思考中..."
                    loading={true}
                    placement="start"
                    avatar={{
                      style: {
                        background: getAgentRoleColor(agent.role).replace('bg-', '').replace('-500', ''),
                        color: 'white',
                      },
                      children: <RobotOutlined />,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 bg-white border-t">
          <Space size={8} wrap className="items-center mb-2 text-xs text-gray-600">
            <span className="text-gray-500">权限模式</span>
            <Select<PermissionMode>
              size="small"
              value={permissionMode}
              className="min-w-[220px]"
              onChange={(value) => setPermissionMode(value)}
              options={PERMISSION_MODE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
              popupMatchSelectWidth={false}
            />
          </Space>
          <div className="text-[11px] text-gray-400 mb-3">
            {currentPermissionMode?.description}
          </div>

          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            placeholder={`给 ${agent.name} 发消息...`}
            disabled={isThinking}
            loading={isThinking}
            prefix={
              <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                <UserOutlined className="text-white text-sm" />
              </div>
            }
            actions={[
              <Button
                key="send"
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isThinking}
                loading={isThinking}
              >
                发送
              </Button>
            ]}
          />

          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>已启用工具: {agent.enabledTools?.length ? agent.enabledTools.join(', ') : '无'}</span>
            {isThinking && (
              <span className="flex items-center text-blue-500">
                <LoadingOutlined className="mr-1 animate-spin" />
                处理中...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
