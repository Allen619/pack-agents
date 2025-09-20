#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function initializeConfig() {
  console.log('🚀 初始化 Pack Agents 配置系统...');

  const configRoot = './config';

  try {
    // 创建目录结构
    const directories = [
      'agents/templates',
      'agents/instances',
      'workflows',
      'executions/current',
      'logs',
      'settings',
    ];

    for (const dir of directories) {
      const fullPath = path.join(configRoot, dir);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`✅ 创建目录: ${fullPath}`);
    }

    // 创建默认Agent模板
    const templates = [
      {
        id: 'code-analyst-template',
        name: '代码分析师模板',
        description: '专门用于代码分析和审查的 Agent 模板',
        role: 'sub',
        systemPrompt:
          '你是一个专业的代码分析师，负责分析代码质量、发现潜在问题、提供改进建议。请仔细分析代码结构、性能、安全性和可维护性。',
        enabledTools: ['Read', 'Grep', 'Search', 'List'],
        tags: ['code-analysis', 'review', 'quality'],
        category: 'development',
      },
      {
        id: 'code-generator-template',
        name: '代码生成器模板',
        description: '根据需求自动生成代码的 Agent 模板',
        role: 'sub',
        systemPrompt:
          '你是一个代码生成专家，根据需求编写高质量的代码。请确保代码遵循最佳实践，具有良好的可读性和可维护性。',
        enabledTools: ['Write', 'Edit', 'Read', 'List'],
        tags: ['code-generation', 'development', 'automation'],
        category: 'development',
      },
      {
        id: 'project-manager-template',
        name: '项目管理员模板',
        description: '协调多个 Agent 协作的主管理 Agent 模板',
        role: 'main',
        systemPrompt:
          '你是一个项目管理员，负责协调和管理整个工作流。请制定合理的执行计划，协调各个子任务，确保项目顺利完成。',
        enabledTools: ['Read', 'Write', 'Search', 'List'],
        tags: ['project-management', 'coordination', 'planning'],
        category: 'management',
      },
    ];

    for (const template of templates) {
      const templatePath = path.join(
        configRoot,
        'agents/templates',
        `${template.id}.json`
      );
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
      console.log(`✅ 创建模板: ${template.name}`);
    }

    // 创建默认配置文件
    const configs = [
      {
        file: 'app-config.json',
        data: {
          app: {
            name: 'Pack Agents',
            version: '1.0.0',
            environment: 'development',
          },
          storage: {
            type: 'file',
            configRoot: './config',
            autoBackup: true,
            maxExecutionHistory: 1000,
          },
          execution: {
            defaultTimeout: 300000,
            maxRetries: 3,
            parallelLimit: 5,
          },
        },
      },
      {
        file: 'llm-providers.json',
        data: {
          providers: {
            claude: {
              name: 'Anthropic Claude',
              models: ['claude-sonnet-4-20250514', 'claude-haiku-20250514'],
              defaultModel: 'claude-sonnet-4-20250514',
              rateLimit: {
                requestsPerMinute: 60,
                tokensPerMinute: 40000,
              },
            },
            openai: {
              name: 'OpenAI GPT',
              models: ['gpt-4', 'gpt-3.5-turbo'],
              defaultModel: 'gpt-4',
            },
          },
        },
      },
      {
        file: 'tools-config.json',
        data: {
          tools: {
            claudeCode: {
              enabled: true,
              allowedCommands: ['read', 'write', 'list', 'grep', 'search'],
              restrictedPaths: ['/system', '/etc', '/root'],
              maxFileSize: '10MB',
              timeout: 30000,
            },
            fileSystem: {
              enabled: true,
              allowedExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.md'],
              maxDepth: 10,
            },
          },
        },
      },
    ];

    for (const config of configs) {
      const configPath = path.join(configRoot, 'settings', config.file);
      await fs.writeFile(configPath, JSON.stringify(config.data, null, 2));
      console.log(`✅ 创建配置: ${config.file}`);
    }

    // 创建.gitignore (如果不存在)
    const gitignorePath = './.gitignore';
    try {
      await fs.access(gitignorePath);
    } catch {
      const gitignoreContent = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Pack Agents specific
/config/agents/instances/*.json
/config/executions/
/config/logs/
/backups/
`;
      await fs.writeFile(gitignorePath, gitignoreContent);
      console.log('✅ 创建 .gitignore 文件');
    }

    console.log('\n🎉 Pack Agents 配置系统初始化完成！');
    console.log('\n📁 配置目录结构:');
    console.log('├── config/');
    console.log('│   ├── agents/');
    console.log('│   │   ├── templates/    (Agent模板)');
    console.log('│   │   └── instances/    (Agent实例)');
    console.log('│   ├── workflows/        (工作流配置)');
    console.log('│   ├── executions/       (执行记录)');
    console.log('│   ├── logs/            (日志文件)');
    console.log('│   └── settings/        (系统设置)');
    console.log('');
    console.log('🚀 现在可以运行 npm run dev 启动开发服务器！');
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  }
}

initializeConfig();
