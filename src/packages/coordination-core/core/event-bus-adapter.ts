// UTF-8
import type { SystemEvent, SystemEventName } from './types';

export type EventHandler<T = any> = (event: SystemEvent<T>) => void;

export interface EventBusAdapter {
  on: (name: SystemEventName, handler: EventHandler) => void;
  off: (name: SystemEventName, handler: EventHandler) => void;
  emit: <T = any>(event: SystemEvent<T>) => void;
  removeAll: () => void;
}

// 轻量内置事件总线（避免外部强依赖）
export const createInMemoryEventBus = (): EventBusAdapter => {
  const map = new Map<SystemEventName, Set<EventHandler>>();
  const ensure = (name: SystemEventName) => {
    let set = map.get(name);
    if (!set) {
      set = new Set<EventHandler>();
      map.set(name, set);
    }
    return set;
  };
  return {
    on(name, handler) {
      ensure(name).add(handler);
    },
    off(name, handler) {
      ensure(name).delete(handler);
    },
    emit(event) {
      const set = map.get(event.name);
      if (!set) return;
      for (const h of Array.from(set)) {
        try {
          h(event);
        } catch {
          // 忽略监听异常，避免影响主流程
        }
      }
    },
    removeAll() {
      map.clear();
    },
  };
};

