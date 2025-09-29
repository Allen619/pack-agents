import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import PerformanceProvider from '@/components/performance/PerformanceProvider';
import QueryProvider from '@/components/providers/QueryProvider';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-inter',
  fallback: ['system-ui', 'arial', 'sans-serif']
});

export const metadata: Metadata = {
  title: 'Pack Agents - 多Agent工作流管理平台',
  description: '基于Claude Code SDK的AI工作流管理平台，支持多Agent协作、可视化编排和实时监控',
  keywords: ['AI', 'Agent', '工作流', 'Claude', 'SDK', '代码分析', '自动化'],
  authors: [{ name: 'Pack Agents Team' }],
  openGraph: {
    title: 'Pack Agents - 多Agent工作流管理平台',
    description: '基于Claude Code SDK的AI工作流管理平台',
    type: 'website',
    locale: 'zh_CN',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={inter.className}>
        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
            theme={{
              token: {
                colorPrimary: '#3b82f6',
                borderRadius: 8,
                wireframe: false,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              },
              components: {
                Layout: {
                  bodyBg: '#f8fafc',
                  headerBg: '#ffffff',
                  siderBg: '#ffffff',
                  triggerBg: '#ffffff',
                },
                Menu: {
                  itemSelectedBg: '#eff6ff',
                  itemSelectedColor: '#2563eb',
                  itemHoverBg: '#f1f5f9',
                  itemHoverColor: '#1e293b',
                  itemActiveBg: '#dbeafe',
                  iconSize: 16,
                },
                Card: {
                  borderRadiusLG: 12,
                  paddingLG: 24,
                },
                Button: {
                  borderRadiusLG: 8,
                  controlHeight: 36,
                },
                Statistic: {
                  titleFontSize: 14,
                  contentFontSize: 24,
                },
              },
            }}
          >
            <QueryProvider>
              <PerformanceProvider>
                {children}
              </PerformanceProvider>
            </QueryProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
