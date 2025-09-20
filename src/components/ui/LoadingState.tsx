// 加载状态组件
import { Spin, Card } from 'antd';

interface LoadingStateProps {
  loading?: boolean;
  children: React.ReactNode;
  tip?: string;
  size?: 'small' | 'default' | 'large';
}

export function LoadingState({ 
  loading = false, 
  children, 
  tip = '加载中...', 
  size = 'default' 
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size={size} tip={tip} />
      </div>
    );
  }

  return <>{children}</>;
}

interface LoadingCardProps {
  loading?: boolean;
  children: React.ReactNode;
  tip?: string;
  className?: string;
}

export function LoadingCard({ 
  loading = false, 
  children, 
  tip = '加载中...', 
  className 
}: LoadingCardProps) {
  return (
    <Card className={className}>
      <Spin spinning={loading} tip={tip}>
        {children}
      </Spin>
    </Card>
  );
}
