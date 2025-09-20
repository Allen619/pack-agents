import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Pack Agents',
  description: 'Pack Agents 多智能体工作流管理平台用户文档',
  lang: 'zh-CN',

  // 基础配置
  base: '/',
  cleanUrls: true,
  ignoreDeadLinks: false,
  lastUpdated: true,

  // 主题配置
  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/user/getting-started/introduction' },
      { text: '核心功能', link: '/user/core-features/agent-factory' },
      { text: '故障排除', link: '/user/troubleshooting/faq' },
      { text: 'API 参考', link: '/user/reference/api-reference' },
    ],

    // 侧边栏
    sidebar: {
      '/user/': [
        {
          text: '快速开始',
          collapsed: false,
          items: [
            { text: '产品介绍', link: '/user/getting-started/introduction' },
            { text: '快速上手', link: '/user/getting-started/quick-start' },
            { text: '核心概念', link: '/user/getting-started/core-concepts' },
          ],
        },
        {
          text: '核心功能',
          collapsed: false,
          items: [
            { text: 'Agent 工厂', link: '/user/core-features/agent-factory' },
            {
              text: '工作流编排',
              link: '/user/core-features/workflow-orchestration',
            },
            { text: '实用案例', link: '/user/core-features/use-cases' },
          ],
        },
        {
          text: '故障排除',
          collapsed: false,
          items: [{ text: '常见问题', link: '/user/troubleshooting/faq' }],
        },
        {
          text: '最佳实践',
          collapsed: false,
          items: [
            { text: 'Agent 设计', link: '/user/best-practices/agent-design' },
          ],
        },
        {
          text: '参考资料',
          collapsed: false,
          items: [
            { text: '术语表', link: '/user/reference/glossary' },
            { text: 'API 参考', link: '/user/reference/api-reference' },
            { text: '更新日志', link: '/user/reference/changelog' },
          ],
        },
      ],
    },

    // 搜索
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Allen619/pack-agents' },
    ],

    // 页脚
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Pack Agents Team',
    },

    // 编辑链接
    editLink: {
      pattern:
        'https://github.com/Allen619/pack-agents/edit/main/docs-site/:path',
      text: '在 GitHub 上编辑此页面',
    },

    // 上次更新时间
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium',
        forceLocale: true,
      },
    },

    // 上下页导航
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    // 大纲设置
    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    // 返回顶部
    returnToTopLabel: '回到顶部',

    // 侧边栏菜单标签
    sidebarMenuLabel: '菜单',

    // 暗色模式开关标签
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  // markdown 配置
  markdown: {
    lineNumbers: true,
    container: {
      tipLabel: '提示',
      warningLabel: '注意',
      dangerLabel: '警告',
      infoLabel: '信息',
      detailsLabel: '详细信息',
    },
  },

  // 构建配置
  build: {
    outDir: '../dist-docs',
  },
});
