// UTF-8
// 运行期事件总线（内存版）：用于 SSE 将编排过程中的事件实时推送给前端

type Subscriber = (data: any) => void;
const subs = new Map<string, Set<Subscriber>>();

export function publish(runId: string, data: any) {
  const set = subs.get(runId);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try {
      fn(data);
    } catch {
      // ignore
    }
  }
}

export function subscribe(runId: string, fn: Subscriber) {
  let set = subs.get(runId);
  if (!set) {
    set = new Set();
    subs.set(runId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) subs.delete(runId);
  };
}

