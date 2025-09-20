// 页面头部组件
import { ReactNode } from 'react';
import { Typography, Space, Divider } from 'antd';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, extra, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Title level={2} className="mb-2">
            {title}
          </Title>
          {description && (
            <Text type="secondary" className="text-base">
              {description}
            </Text>
          )}
        </div>
        {extra && (
          <Space>{extra}</Space>
        )}
      </div>
      
      {children && (
        <>
          <Divider className="my-4" />
          {children}
        </>
      )}
    </div>
  );
}
