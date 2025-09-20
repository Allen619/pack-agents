// 懒加载组件导出
import {
  withComponentLazyLoading,
  withPageLazyLoading,
} from '@/lib/utils/lazy-loading';

// 工作流相关的懒加载组件
export const LazyFlowCanvasEditor = withComponentLazyLoading(
  () => import('@/components/workflows/FlowCanvasEditor')
);

export const LazyEnhancedFlowCanvas = withComponentLazyLoading(
  () => import('@/components/workflows/EnhancedFlowCanvas')
);

export const LazyWorkflowValidationPanel = withComponentLazyLoading(
  () => import('@/components/workflows/WorkflowValidationPanel')
);

export const LazyDependencyEditor = withComponentLazyLoading(
  () => import('@/components/workflows/DependencyEditor')
);

export const LazyWorkflowTemplateGallery = withComponentLazyLoading(
  () => import('@/components/workflows/WorkflowTemplateGallery')
);

export const LazyExecutionPlanPreview = withComponentLazyLoading(
  () => import('@/components/workflows/ExecutionPlanPreview')
);

// Agent 相关的懒加载组件
export const LazyEnhancedAgentConfigForm = withComponentLazyLoading(
  () => import('@/components/agents/EnhancedAgentConfigForm')
);

export const LazyEnhancedAgentChatInterface = withComponentLazyLoading(
  () => import('@/components/claude/EnhancedAgentChatInterface')
);

export const LazySystemPromptEditor = withComponentLazyLoading(
  () => import('@/components/advanced-forms/SystemPromptEditor')
);

export const LazyKnowledgeBasePathSelector = withComponentLazyLoading(
  () => import('@/components/advanced-forms/KnowledgeBasePathSelector')
);

export const LazyToolBindingPanel = withComponentLazyLoading(
  () => import('@/components/advanced-forms/ToolBindingPanel')
);

// 页面级懒加载组件
export const LazyAgentCreatePage = withPageLazyLoading(
  () => import('@/app/agents/create/page')
);

export const LazyAgentEditPage = withPageLazyLoading(
  () => import('@/app/agents/[id]/edit/page')
);

export const LazyAgentChatPage = withPageLazyLoading(
  () => import('@/app/agents/[id]/chat/page')
);

export const LazyWorkflowCreatePage = withPageLazyLoading(
  () => import('@/app/workflows/create/page')
);

export const LazyWorkflowEditPage = withPageLazyLoading(
  () => import('@/app/workflows/[id]/edit/page')
);

// 预加载策略配置
export const preloadConfig = {
  // 高优先级：用户可能立即访问的组件
  highPriority: [
    () => import('@/components/agents/AgentCard'),
    () => import('@/components/workflows/WorkflowCard'),
    () => import('@/components/ui/PageHeader'),
  ],

  // 中优先级：用户可能在导航后访问的组件
  mediumPriority: [
    () => import('@/components/agents/EnhancedAgentConfigForm'),
    () => import('@/components/workflows/FlowCanvasEditor'),
  ],

  // 低优先级：高级功能组件
  lowPriority: [
    () => import('@/components/claude/EnhancedAgentChatInterface'),
    () => import('@/components/workflows/DependencyEditor'),
    () => import('@/components/workflows/WorkflowTemplateGallery'),
  ],
};
