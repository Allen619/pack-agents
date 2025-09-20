// Agent 对话界面组件 - 使用 Ant Design X
import { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Alert,
  message,
} from 'antd';
import { 
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
  ClearOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { AgentConfig } from '@/types';
import { getAgentRoleColor } from '@/utils';

const { Text, Title } = Typography;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface AgentChatInterfaceProps {
  agent: AgentConfig;
  onBack?: () => void;
}

export function AgentChatInterface({ agent, onBack }: AgentChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    // 添加欢迎消息
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `你好！我是 ${agent.name}。${agent.description || '我可以帮助你完成各种任务。'}`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [agent]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    // 模拟 AI 响应（这里应该调用实际的 Claude Code SDK）
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `我收到了你的消息："${userMessage.content}"。这是一个模拟回复，实际情况下会调用 Claude Code SDK 来处理你的请求。`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 1500);
  };

  const handleClearChat = () => {
    setMessages([]);
    message.success('对话历史已清空');
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'main':
        return '主管理';
      case 'sub':
        return '子执行';
      case 'synthesis':
        return '总结';
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

  return (
    <div className="h-full flex flex-col">
      {/* Agent 信息头部 */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RobotOutlined className="text-blue-500 text-2xl" />
            <div>
              <Title level={4} className="mb-1">
                {agent.name}
              </Title>
              <div className="flex items-center space-x-2">
                <Tag className={getAgentRoleColor(agent.role)}>
                  {getRoleText(agent.role)}
                </Tag>
                <Tag color="blue">
                  {getProviderText(agent.llmConfig.provider)}
                </Tag>
                <Tag color="green">
                  {agent.llmConfig.model}
                </Tag>
              </div>
            </div>
          </div>
          
          <Space>
            <Button 
              icon={<ClearOutlined />} 
              onClick={handleClearChat}
              disabled={messages.length === 0}
            >
              清空对话
            </Button>
            <Button icon={<SettingOutlined />}>
              设置
            </Button>
            {onBack && (
              <Button onClick={onBack}>
                返回
              </Button>
            )}
          </Space>
        </div>

        {agent.description && (
          <Text type="secondary" className="block mt-2">
            {agent.description}
          </Text>
        )}
      </Card>

      {/* 对话区域 */}
      <Card 
        className="flex-1 flex flex-col"
        bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* 消息列表 */}
        <div className="flex-1 p-4 overflow-y-auto max-h-96">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageOutlined className="text-4xl mb-2" />
              <div>开始与 {agent.name} 对话</div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* AI 思考状态 */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <Text type="secondary" className="text-sm">
                        {agent.name} 正在思考...
                      </Text>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <Alert
            message="注意"
            description="这是一个演示界面。完整的 Claude Code SDK 集成将在后续版本中实现。"
            type="info"
            showIcon
            className="mb-4"
            closable
          />
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`向 ${agent.name} 发送消息...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isThinking}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isThinking}
              loading={isThinking}
            >
              发送
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            按 Enter 发送消息 • 支持的工具: {agent.enabledTools.join(', ')}
          </div>
        </div>
      </Card>
    </div>
  );
}
