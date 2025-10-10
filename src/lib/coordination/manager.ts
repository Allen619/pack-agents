// UTF-8
// 轻量单例封装：仅在被主动调用时才初始化，避免影响现有运行路径
import { CoordinationManager, featureFlags } from '../../packages/coordination-core';

let instance: CoordinationManager | null = null;

export const getCoordinationManager = () => {
  if (!instance) instance = new CoordinationManager();
  return instance;
};

export const ensureInitialized = () => {
  const cm = getCoordinationManager();
  cm.initialize();
  return cm;
};

export const shutdown = () => {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
};

