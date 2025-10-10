// UTF-8
// 演示用内存调试仓库：记录模拟完成的结果与事件

type EventItem = {
  at: number;
  name: string;
  taskId: string;
  agentId?: string;
  payload?: any;
};

type TaskResult = {
  title: string;
  content: string;
};

class DebugStore {
  private events: EventItem[] = [];
  private resultsByTask: Record<string, TaskResult> = {};

  addEvent(e: EventItem) {
    this.events.push(e);
    if (this.events.length > 200) this.events.shift();
  }

  addResult(taskId: string, result: TaskResult) {
    this.resultsByTask[taskId] = result;
  }

  clear() {
    this.events = [];
    this.resultsByTask = {};
  }

  snapshot() {
    return {
      events: [...this.events],
      resultsByTask: { ...this.resultsByTask },
    };
  }
}

export const debugStore = new DebugStore();

