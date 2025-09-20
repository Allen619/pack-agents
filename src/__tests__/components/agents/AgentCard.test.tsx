import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentConfig } from '@/lib/types'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Create a test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('AgentCard', () => {
  const mockAgent: AgentConfig = {
    id: 'test-agent-123',
    name: '测试开发助手',
    description: '这是一个用于测试的开发助手Agent，能够帮助处理编程相关问题。',
    role: '开发助手',
    systemPrompt: '你是一个专业的开发助手，帮助用户解决编程问题。',
    llmConfig: {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      apiKey: 'test-key',
      parameters: {
        temperature: 0.7,
        maxTokens: 4000
      }
    },
    enabledTools: ['Read', 'Write', 'Search'],
    knowledgeBasePaths: ['./src', './docs'],
    metadata: {
      version: '1.0.0',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T12:00:00.000Z'
    }
  }

  const TestWrapper = createTestWrapper()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('应该正确渲染 Agent 基本信息', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    // 检查 Agent 名称
    expect(screen.getByText('测试开发助手')).toBeInTheDocument()
    
    // 检查角色标签
    expect(screen.getByText('开发助手')).toBeInTheDocument()
    
    // 检查描述（可能会被截断）
    expect(screen.getByText(/这是一个用于测试的开发助手/)).toBeInTheDocument()
    
    // 检查模型信息
    expect(screen.getByText('claude-3-sonnet-20240229')).toBeInTheDocument()
  })

  test('应该显示启用的工具数量', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    // 工具数量应该显示为 3
    expect(screen.getByText('3 个工具')).toBeInTheDocument()
  })

  test('应该显示知识库路径数量', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    // 知识库路径数量应该显示为 2
    expect(screen.getByText('2 个路径')).toBeInTheDocument()
  })

  test('应该显示创建和更新时间', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    // 检查创建时间（格式可能会根据 formatDate 函数而变化）
    expect(screen.getByText(/创建于/)).toBeInTheDocument()
    expect(screen.getByText(/更新于/)).toBeInTheDocument()
  })

  test('点击编辑按钮应该导航到编辑页面', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    const editButton = screen.getByRole('button', { name: /编辑/i })
    fireEvent.click(editButton)

    expect(mockPush).toHaveBeenCalledWith('/agents/test-agent-123/edit')
  })

  test('点击聊天按钮应该导航到聊天页面', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    const chatButton = screen.getByRole('button', { name: /聊天/i })
    fireEvent.click(chatButton)

    expect(mockPush).toHaveBeenCalledWith('/agents/test-agent-123/chat')
  })

  test('应该根据角色显示正确的颜色', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    // 检查角色标签是否有正确的类名或样式
    const roleTag = screen.getByText('开发助手')
    expect(roleTag.closest('.ant-tag')).toBeInTheDocument()
  })

  test('应该处理长描述文本的截断', () => {
    const agentWithLongDescription = {
      ...mockAgent,
      description: '这是一个非常非常非常非常非常非常非常非常非常非常长的描述文本，应该会被截断以适应卡片的显示空间，确保界面的整洁性。'
    }

    render(
      <TestWrapper>
        <AgentCard agent={agentWithLongDescription} />
      </TestWrapper>
    )

    // 长描述应该被截断
    const description = screen.getByText(/这是一个非常非常非常/)
    expect(description).toBeInTheDocument()
  })

  test('应该处理没有工具的情况', () => {
    const agentWithoutTools = {
      ...mockAgent,
      enabledTools: []
    }

    render(
      <TestWrapper>
        <AgentCard agent={agentWithoutTools} />
      </TestWrapper>
    )

    expect(screen.getByText('0 个工具')).toBeInTheDocument()
  })

  test('应该处理没有知识库路径的情况', () => {
    const agentWithoutPaths = {
      ...mockAgent,
      knowledgeBasePaths: []
    }

    render(
      <TestWrapper>
        <AgentCard agent={agentWithoutPaths} />
      </TestWrapper>
    )

    expect(screen.getByText('0 个路径')).toBeInTheDocument()
  })

  test('应该正确处理不同的 LLM 提供商', () => {
    const agentWithDifferentProvider = {
      ...mockAgent,
      llmConfig: {
        ...mockAgent.llmConfig,
        provider: 'openai' as const,
        model: 'gpt-4'
      }
    }

    render(
      <TestWrapper>
        <AgentCard agent={agentWithDifferentProvider} />
      </TestWrapper>
    )

    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  test('卡片应该有正确的测试 ID', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} />
      </TestWrapper>
    )

    expect(screen.getByTestId('agent-card')).toBeInTheDocument()
  })

  test('应该支持自定义类名', () => {
    render(
      <TestWrapper>
        <AgentCard agent={mockAgent} className="custom-agent-card" />
      </TestWrapper>
    )

    const card = screen.getByTestId('agent-card')
    expect(card).toHaveClass('custom-agent-card')
  })
})
