'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, Space } from 'antd';
import { 
  DashboardOutlined, 
  RobotOutlined, 
  ShareAltOutlined, 
  PlayCircleOutlined,
  SettingOutlined,
  PlusOutlined,
  FileTextOutlined,
  MenuOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '控制台',
      onClick: () => router.push('/'),
    },
    {
      key: 'agents',
      icon: <RobotOutlined />,
      label: 'Agent 工厂',
      onClick: () => router.push('/agents'),
      children: [
        {
          key: 'agents-list',
          label: 'Agent 列表',
          onClick: () => router.push('/agents'),
        },
        {
          key: 'agents-create',
          label: '创建 Agent',
          onClick: () => router.push('/agents/create'),
        },
        {
          key: 'agents-templates',
          label: '模板库',
          onClick: () => router.push('/agents/templates'),
        },
      ],
    },
    {
      key: 'workflows',
      icon: <ShareAltOutlined />,
      label: '工作流编排',
      onClick: () => router.push('/workflows'),
      children: [
        {
          key: 'workflows-list',
          label: '工作流列表',
          onClick: () => router.push('/workflows'),
        },
        {
          key: 'workflows-create',
          label: '创建工作流',
          onClick: () => router.push('/workflows/create'),
        },
        {
          key: 'workflows-templates',
          label: '模板库',
          onClick: () => router.push('/workflows/templates'),
        },
      ],
    },
    {
      key: 'executions',
      icon: <PlayCircleOutlined />,
      label: '执行监控',
      onClick: () => router.push('/executions'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => router.push('/settings'),
    },
  ];

  // 根据当前路径确定选中的菜单项
  const getSelectedKeys = () => {
    if (pathname === '/') return ['dashboard'];
    if (pathname.startsWith('/agents')) {
      if (pathname === '/agents') return ['agents-list'];
      if (pathname === '/agents/create') return ['agents-create'];
      if (pathname.startsWith('/agents/templates')) return ['agents-templates'];
      if (pathname.match(/^\/agents\/[^\/]+\/edit$/)) return ['agents-list'];
      if (pathname.match(/^\/agents\/[^\/]+\/chat$/)) return ['agents-list'];
      return ['agents'];
    }
    if (pathname.startsWith('/workflows')) {
      if (pathname === '/workflows') return ['workflows-list'];
      if (pathname === '/workflows/create') return ['workflows-create'];
      if (pathname.startsWith('/workflows/templates')) return ['workflows-templates'];
      if (pathname.match(/^\/workflows\/[^\/]+/)) return ['workflows-list'];
      return ['workflows'];
    }
    if (pathname.startsWith('/executions')) return ['executions'];
    if (pathname.startsWith('/settings')) return ['settings'];
    return [];
  };

  // 根据当前路径确定展开的菜单项
  const getOpenKeys = () => {
    if (pathname.startsWith('/agents')) return ['agents'];
    if (pathname.startsWith('/workflows')) return ['workflows'];
    return [];
  };

  return (
    <Layout className="h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="border-r border-gray-200 shadow-lg"
        width={240}
        style={{ background: '#fff' }}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <RobotOutlined className="text-lg text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-lg font-bold text-gray-900 truncate">Pack Agents</div>
                <div className="text-xs text-gray-500 truncate">AI工作流平台</div>
              </div>
            )}
          </div>
        </div>
        
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          className="h-full border-none"
          style={{ 
            background: 'transparent',
            borderRight: 0
          }}
          onClick={({ key }) => {
            // 查找包括嵌套菜单在内的所有菜单项
            const findMenuItem = (items: any[], targetKey: string): any => {
              for (const item of items) {
                if (item.key === targetKey) return item;
                if (item.children) {
                  const found = findMenuItem(item.children, targetKey);
                  if (found) return found;
                }
              }
              return null;
            };

            const item = findMenuItem(menuItems, key);
            if (item?.onClick) {
              item.onClick();
            }
          }}
        />
      </Sider>

      <Layout className="h-full">
        <Header className="flex justify-between items-center px-6 shadow-sm" style={{ height: '64px', flexShrink: 0 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          />
          
          <Space>
            <Button 
              icon={<FileTextOutlined />}
              onClick={() => window.open('http://localhost:5173', '_blank')}
            >
              文档
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => router.push('/workflows/create')}
            >
              新建工作流
            </Button>
          </Space>
        </Header>

        <Content className="overflow-auto flex-1 bg-gray-50">
          <div className="overflow-y-auto h-full">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
