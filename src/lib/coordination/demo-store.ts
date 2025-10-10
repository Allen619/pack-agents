// UTF-8
// 演示用内存存储：保存每个任务的模型输出，便于页面读取

type OutputRecord = {
  text: string;
  updatedAt: number;
};

const store = new Map<string, OutputRecord>();

export function setTaskOutput(taskId: string, text: string) {
  store.set(taskId, { text, updatedAt: Date.now() });
}

export function getTaskOutput(taskId: string): string | undefined {
  return store.get(taskId)?.text;
}

export function clearTaskOutput(taskId: string) {
  store.delete(taskId);
}

