'use client';

import React, { Component, ReactNode } from 'react';
import { Button, Result, Card, Collapse, Typography, Space, Alert } from 'antd';
import { 
  ReloadOutlined, 
  BugOutlined, 
  WarningOutlined,
  CopyOutlined,
  HomeOutlined 
} from '@ant-design/icons';
import { copyToClipboard } from '@/lib/utils';

const { Panel } = Collapse;
const { Paragraph, Text } = Typography;

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  level?: 'page' | 'component' | 'critical';
  context?: string;
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 生成错误 ID
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 更新错误信息
    this.setState({
      errorInfo,
    });

    // 记录错误
    this.logError(error, errorInfo);

    // 调用外部错误处理
    this.props.onError?.(error, errorInfo);

    // 发送错误报告到监控服务
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(_: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    // 如果错误状态从有错误变为无错误，清理定时器
    if (prevState.hasError && !this.state.hasError) {
      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
        this.retryTimeoutId = null;
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  // 记录错误到控制台和本地存储
  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      level: this.props.level,
      retryCount: this.state.retryCount,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    };

    console.error('🚨 Error Boundary Caught Error:', errorLog);

    // 保存到本地存储用于调试
    try {
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorLog);
      
      // 只保留最近的 50 条错误日志
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (e) {
      console.warn('Failed to save error log to localStorage:', e);
    }
  }

  // 发送错误报告到监控服务
  private reportError(error: Error, errorInfo: ErrorInfo) {
    // 在实际项目中，这里会发送到 Sentry、LogRocket 等监控服务
    if (process.env.NODE_ENV === 'production') {
      // 模拟发送错误报告
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
        context: this.props.context,
      };

      console.log('📤 Error report would be sent:', errorReport);
    }
  }

  // 重试处理
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    // 延迟重试，给组件时间恢复
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }, 1000);
  };

  // 重置错误状态
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  // 复制错误信息
  private handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorText = `
错误 ID: ${errorId}
时间: ${new Date().toLocaleString()}
错误消息: ${error?.message}
错误堆栈:
${error?.stack}

组件堆栈:
${errorInfo?.componentStack}

上下文: ${this.props.context || 'N/A'}
重试次数: ${this.state.retryCount}
    `.trim();

    try {
      await copyToClipboard(errorText);
      console.log('Error details copied to clipboard');
    } catch (e) {
      console.warn('Failed to copy error details:', e);
    }
  };

  // 回到首页
  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // 渲染错误详情
  private renderErrorDetails() {
    const { error, errorInfo, errorId } = this.state;
    
    return (
      <Collapse ghost>
        <Panel header="错误详情" key="1" extra={<BugOutlined />}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title="基本信息">
              <Paragraph>
                <Text strong>错误 ID:</Text> <Text code>{errorId}</Text>
              </Paragraph>
              <Paragraph>
                <Text strong>时间:</Text> {new Date().toLocaleString()}
              </Paragraph>
              <Paragraph>
                <Text strong>重试次数:</Text> {this.state.retryCount}
              </Paragraph>
            </Card>

            <Card size="small" title="错误消息">
              <Paragraph>
                <Text code style={{ color: '#ff4d4f' }}>
                  {error?.message}
                </Text>
              </Paragraph>
            </Card>

            <Card size="small" title="错误堆栈">
              <Paragraph>
                <pre style={{ 
                  fontSize: '12px', 
                  background: '#f5f5f5', 
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {error?.stack}
                </pre>
              </Paragraph>
            </Card>

            <Card size="small" title="组件堆栈">
              <Paragraph>
                <pre style={{ 
                  fontSize: '12px', 
                  background: '#f5f5f5', 
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {errorInfo?.componentStack}
                </pre>
              </Paragraph>
            </Card>
          </Space>
        </Panel>
      </Collapse>
    );
  }

  // 获取错误级别对应的图标和颜色
  private getErrorLevel() {
    const { level = 'component' } = this.props;
    
    const levelConfig = {
      critical: {
        status: 'error' as const,
        icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
        title: '系统错误',
        description: '遇到了严重错误，请刷新页面或联系技术支持。',
      },
      page: {
        status: 'error' as const,
        icon: <BugOutlined style={{ color: '#ff7875' }} />,
        title: '页面错误',
        description: '页面遇到了错误，请尝试重新加载。',
      },
      component: {
        status: 'warning' as const,
        icon: <BugOutlined style={{ color: '#faad14' }} />,
        title: '组件错误',
        description: '组件渲染时遇到了错误，部分功能可能受到影响。',
      },
    };

    return levelConfig[level];
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // 如果提供了自定义 fallback，使用它
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { enableRetry = true, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;
    const levelConfig = this.getErrorLevel();
    const canRetry = enableRetry && retryCount < maxRetries;

    const actions = [
      <Button
        key="copy"
        icon={<CopyOutlined />}
        onClick={this.handleCopyError}
      >
        复制错误信息
      </Button>,
    ];

    if (canRetry) {
      actions.unshift(
        <Button
          key="retry"
          type="primary"
          icon={<ReloadOutlined />}
          onClick={this.handleRetry}
        >
          重试 ({maxRetries - retryCount} 次剩余)
        </Button>
      );
    } else {
      actions.unshift(
        <Button
          key="reset"
          type="primary"
          icon={<ReloadOutlined />}
          onClick={this.handleReset}
        >
          重置
        </Button>
      );
    }

    if (this.props.level === 'critical' || this.props.level === 'page') {
      actions.push(
        <Button
          key="home"
          icon={<HomeOutlined />}
          onClick={this.handleGoHome}
        >
          回到首页
        </Button>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        <Result
          status={levelConfig.status}
          icon={levelConfig.icon}
          title={levelConfig.title}
          subTitle={levelConfig.description}
          extra={actions}
        />

        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '24px' }}>
            <Alert
              message="开发模式"
              description="以下错误详情仅在开发环境显示"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            {this.renderErrorDetails()}
          </div>
        )}
      </div>
    );
  }
}

// 函数式错误边界组件的快捷方式
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return React.forwardRef<any, P>((props, ref) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </EnhancedErrorBoundary>
  ));
}

// 页面级错误边界
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="page" enableRetry={true} maxRetries={3}>
    {children}
  </EnhancedErrorBoundary>
);

// 组件级错误边界
export const ComponentErrorBoundary: React.FC<{ children: ReactNode; context?: string }> = ({ 
  children, 
  context 
}) => (
  <EnhancedErrorBoundary level="component" enableRetry={true} maxRetries={2} context={context}>
    {children}
  </EnhancedErrorBoundary>
);

// 关键功能错误边界
export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="critical" enableRetry={false}>
    {children}
  </EnhancedErrorBoundary>
);
