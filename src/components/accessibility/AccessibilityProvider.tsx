'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ConfigProvider } from 'antd';

// 无障碍配置接口
export interface AccessibilityConfig {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  keyboardNavigation: boolean;
  screenReader: boolean;
  focusIndicator: boolean;
  colorBlindFriendly: boolean;
}

// 无障碍上下文
interface AccessibilityContextType {
  config: AccessibilityConfig;
  updateConfig: (updates: Partial<AccessibilityConfig>) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// 默认配置
const defaultConfig: AccessibilityConfig = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  keyboardNavigation: true,
  screenReader: false,
  focusIndicator: true,
  colorBlindFriendly: false,
};

// 存储键
const STORAGE_KEY = 'accessibility-config';

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [config, setConfig] = useState<AccessibilityConfig>(defaultConfig);

  // 初始化配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        setConfig({ ...defaultConfig, ...parsedConfig });
      }
    } catch (error) {
      console.warn('Failed to load accessibility config:', error);
    }

    // 检测系统偏好设置
    detectSystemPreferences();
  }, []);

  // 检测系统偏好设置
  const detectSystemPreferences = () => {
    if (typeof window === 'undefined') return;

    // 检测减少动画偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      updateConfig({ reducedMotion: true });
    }

    // 检测高对比度偏好
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    if (prefersHighContrast.matches) {
      updateConfig({ highContrast: true });
    }

    // 检测屏幕阅读器
    const hasScreenReader = window.navigator?.userAgent?.includes('NVDA') || 
                           window.navigator?.userAgent?.includes('JAWS') ||
                           'speechSynthesis' in window;
    if (hasScreenReader) {
      updateConfig({ screenReader: true });
    }

    // 监听系统偏好变化
    prefersReducedMotion.addEventListener('change', (e) => {
      updateConfig({ reducedMotion: e.matches });
    });

    prefersHighContrast.addEventListener('change', (e) => {
      updateConfig({ highContrast: e.matches });
    });
  };

  // 更新配置
  const updateConfig = (updates: Partial<AccessibilityConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // 保存到本地存储
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      } catch (error) {
        console.warn('Failed to save accessibility config:', error);
      }

      return newConfig;
    });
  };

  // 应用样式到 DOM
  useEffect(() => {
    const root = document.documentElement;

    // 高对比度
    if (config.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 减少动画
    if (config.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // 字体大小
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${config.fontSize}`);

    // 键盘导航
    if (config.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // 焦点指示器
    if (config.focusIndicator) {
      root.classList.add('focus-indicator');
    } else {
      root.classList.remove('focus-indicator');
    }

    // 色盲友好
    if (config.colorBlindFriendly) {
      root.classList.add('colorblind-friendly');
    } else {
      root.classList.remove('colorblind-friendly');
    }

  }, [config]);

  // 快捷方法
  const toggleHighContrast = () => updateConfig({ highContrast: !config.highContrast });
  const toggleReducedMotion = () => updateConfig({ reducedMotion: !config.reducedMotion });

  const increaseFontSize = () => {
    const sizes: AccessibilityConfig['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(config.fontSize);
    if (currentIndex < sizes.length - 1) {
      updateConfig({ fontSize: sizes[currentIndex + 1] });
    }
  };

  const decreaseFontSize = () => {
    const sizes: AccessibilityConfig['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(config.fontSize);
    if (currentIndex > 0) {
      updateConfig({ fontSize: sizes[currentIndex - 1] });
    }
  };

  const resetSettings = () => {
    setConfig(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 键盘事件处理
  useEffect(() => {
    if (!config.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + H: 切换高对比度
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        toggleHighContrast();
      }

      // Alt + M: 切换减少动画
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        toggleReducedMotion();
      }

      // Alt + Plus: 增大字体
      if (e.altKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        increaseFontSize();
      }

      // Alt + Minus: 减小字体
      if (e.altKey && e.key === '-') {
        e.preventDefault();
        decreaseFontSize();
      }

      // Alt + 0: 重置设置
      if (e.altKey && e.key === '0') {
        e.preventDefault();
        resetSettings();
      }

      // Escape: 跳到主要内容
      if (e.key === 'Escape') {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.keyboardNavigation]);

  // 获取 Ant Design 主题配置
  const getAntdTheme = () => {
    const baseTheme = {
      token: {
        colorPrimary: config.highContrast ? '#000000' : '#3b82f6',
        colorBgBase: config.highContrast ? '#ffffff' : '#ffffff',
        colorTextBase: config.highContrast ? '#000000' : '#000000',
        borderRadius: config.reducedMotion ? 0 : 8,
        motionDurationSlow: config.reducedMotion ? '0s' : '0.3s',
        motionDurationMid: config.reducedMotion ? '0s' : '0.2s',
        motionDurationFast: config.reducedMotion ? '0s' : '0.1s',
      },
      components: {
        Button: {
          borderWidth: config.highContrast ? 2 : 1,
          controlOutline: config.focusIndicator ? '4px solid rgba(59, 130, 246, 0.3)' : 'none',
        },
        Input: {
          borderWidth: config.highContrast ? 2 : 1,
          controlOutline: config.focusIndicator ? '4px solid rgba(59, 130, 246, 0.3)' : 'none',
        },
        Card: {
          borderWidth: config.highContrast ? 2 : 1,
        },
      },
    };

    // 字体大小调整
    const fontSizeMultiplier = {
      'small': 0.875,
      'medium': 1,
      'large': 1.125,
      'extra-large': 1.25,
    }[config.fontSize];

    baseTheme.token = {
      ...baseTheme.token,
      fontSize: 14 * fontSizeMultiplier,
      fontSizeLG: 16 * fontSizeMultiplier,
      fontSizeXL: 20 * fontSizeMultiplier,
      fontSizeHeading1: 38 * fontSizeMultiplier,
      fontSizeHeading2: 30 * fontSizeMultiplier,
      fontSizeHeading3: 24 * fontSizeMultiplier,
      fontSizeHeading4: 20 * fontSizeMultiplier,
      fontSizeHeading5: 16 * fontSizeMultiplier,
    };

    return baseTheme;
  };

  const contextValue: AccessibilityContextType = {
    config,
    updateConfig,
    toggleHighContrast,
    toggleReducedMotion,
    increaseFontSize,
    decreaseFontSize,
    resetSettings,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <ConfigProvider theme={getAntdTheme()}>
        {children}
      </ConfigProvider>
    </AccessibilityContext.Provider>
  );
}

// 使用无障碍上下文的 Hook
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// 跳过链接组件
export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:no-underline"
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      onFocus={(e) => {
        e.target.style.position = 'static';
        e.target.style.left = 'auto';
        e.target.style.width = 'auto';
        e.target.style.height = 'auto';
        e.target.style.overflow = 'visible';
      }}
      onBlur={(e) => {
        e.target.style.position = 'absolute';
        e.target.style.left = '-10000px';
        e.target.style.width = '1px';
        e.target.style.height = '1px';
        e.target.style.overflow = 'hidden';
      }}
    >
      {children}
    </a>
  );
}

// 屏幕阅读器专用文本
export function ScreenReaderOnly({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      aria-hidden="false"
    >
      {children}
    </span>
  );
}

// ARIA 实时区域组件
export function LiveRegion({ 
  children, 
  politeness = 'polite' 
}: { 
  children: ReactNode; 
  politeness?: 'off' | 'polite' | 'assertive' 
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
