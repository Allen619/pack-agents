// 加载状态组件
import { Card } from 'antd';
import { LoadingSpinner } from '@/lib/utils/lazy-loading';

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
        <LoadingSpinner size={size} tip={tip} />
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
  if (loading) {
    return (
      <Card className={className}>
        <LoadingSpinner tip={tip} />
      </Card>
    );
  }

  return <Card className={className}>{children}</Card>;
}
