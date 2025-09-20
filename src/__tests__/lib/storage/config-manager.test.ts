import { ConfigManager } from '@/lib/storage/config-manager';
import { AgentConfig, WorkflowConfig } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

// Mock file system operations
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock path module
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
}));

describe('ConfigManager', () => {
  const mockConfigDir = 'test-config';
  let configManager: ConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new ConfigManager(mockConfigDir);
  });

  describe('初始化', () => {
    test('应该创建配置目录结构', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith('test-config/agents', {
        recursive: true,
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith('test-config/workflows', {
        recursive: true,
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith('test-config/executions', {
        recursive: true,
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith('test-config/templates', {
        recursive: true,
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith('test-config/backups', {
        recursive: true,
      });
    });

    test('应该创建默认配置文件', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-config/app-config.json',
        expect.any(String)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-config/llm-providers.json',
        expect.any(String)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-config/tools-config.json',
        expect.any(String)
      );
    });
  });

  describe('Agent 管理', () => {
    const mockAgent: AgentConfig = {
      id: 'test-agent',
      name: '测试Agent',
      description: '测试描述',
      role: '开发助手',
      systemPrompt: '测试系统提示',
      llmConfig: {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        apiKey: 'test-key',
        parameters: {},
      },
      enabledTools: ['Read', 'Write'],
      knowledgeBasePaths: [],
      metadata: {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    };

    test('应该保存 Agent 配置', async () => {
      mockFs.writeFile.mockResolvedValue();

      await configManager.saveAgent(mockAgent);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-config/agents/test-agent.json',
        JSON.stringify(mockAgent, null, 2)
      );
    });

    test('应该加载 Agent 配置', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockAgent));

      const result = await configManager.loadAgent('test-agent');

      expect(result).toEqual(mockAgent);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        'test-config/agents/test-agent.json',
        'utf-8'
      );
    });

    test('应该列出所有 Agent', async () => {
      mockFs.readdir.mockResolvedValue([
        'test-agent.json',
        'another-agent.json',
      ] as any);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockAgent))
        .mockResolvedValueOnce(
          JSON.stringify({ ...mockAgent, id: 'another-agent' })
        );

      const result = await configManager.listAgents();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-agent');
      expect(result[1].id).toBe('another-agent');
    });

    test('应该删除 Agent', async () => {
      mockFs.unlink.mockResolvedValue();

      await configManager.deleteAgent('test-agent');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        'test-config/agents/test-agent.json'
      );
    });

    test('加载不存在的 Agent 应该抛出错误', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(configManager.loadAgent('non-existent')).rejects.toThrow();
    });
  });

  describe('Workflow 管理', () => {
    const mockWorkflow: WorkflowConfig = {
      id: 'test-workflow',
      name: '测试工作流',
      description: '测试工作流描述',
      agentIds: ['agent1', 'agent2'],
      mainAgentId: 'agent1',
      executionFlow: {
        stages: [],
        dependencies: [],
      },
      configuration: {
        maxExecutionTime: 300000,
        autoRetry: true,
        notifications: false,
      },
      metadata: {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        executionCount: 0,
      },
    };

    test('应该保存 Workflow 配置', async () => {
      mockFs.writeFile.mockResolvedValue();

      await configManager.saveWorkflow(mockWorkflow);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-config/workflows/test-workflow.json',
        JSON.stringify(mockWorkflow, null, 2)
      );
    });

    test('应该加载 Workflow 配置', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockWorkflow));

      const result = await configManager.loadWorkflow('test-workflow');

      expect(result).toEqual(mockWorkflow);
    });

    test('应该列出所有 Workflow', async () => {
      mockFs.readdir.mockResolvedValue(['test-workflow.json'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockWorkflow));

      const result = await configManager.listWorkflows();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-workflow');
    });

    test('应该删除 Workflow', async () => {
      mockFs.unlink.mockResolvedValue();

      await configManager.deleteWorkflow('test-workflow');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        'test-config/workflows/test-workflow.json'
      );
    });
  });

  describe('模板管理', () => {
    test('应该列出 Agent 模板', async () => {
      mockFs.readdir.mockResolvedValue([
        'template1.json',
        'template2.json',
      ] as any);
      mockFs.readFile
        .mockResolvedValueOnce(
          JSON.stringify({ id: 'template1', name: '模板1' })
        )
        .mockResolvedValueOnce(
          JSON.stringify({ id: 'template2', name: '模板2' })
        );

      const result = await configManager.listAgentTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('template1');
      expect(result[1].id).toBe('template2');
    });

    test('应该从模板创建 Agent', async () => {
      const mockTemplate = {
        id: 'template1',
        name: '开发助手模板',
        role: '开发助手',
        systemPrompt: '模板系统提示',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));
      mockFs.writeFile.mockResolvedValue();

      const result = await configManager.createAgentFromTemplate('template1', {
        name: '我的开发助手',
        description: '自定义描述',
      });

      expect(result.name).toBe('我的开发助手');
      expect(result.role).toBe('开发助手');
      expect(result.systemPrompt).toBe('模板系统提示');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    test('保存失败时应该抛出错误', async () => {
      const mockAgent: AgentConfig = {
        id: 'test-agent',
        name: '测试Agent',
        description: '测试描述',
        role: '开发助手',
        systemPrompt: '测试系统提示',
        llmConfig: {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          apiKey: 'test-key',
          parameters: {},
        },
        enabledTools: [],
        knowledgeBasePaths: [],
        metadata: {
          version: '1.0.0',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(configManager.saveAgent(mockAgent)).rejects.toThrow(
        'Write failed'
      );
    });

    test('读取失败时应该抛出错误', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read failed'));

      await expect(configManager.loadAgent('test-agent')).rejects.toThrow(
        'Read failed'
      );
    });
  });
});
