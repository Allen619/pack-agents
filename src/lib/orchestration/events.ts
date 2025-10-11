// UTF-8
import { EventEmitter } from 'events';

export type OrchestrationEvent = {
  type: 'info' | 'stage' | 'delta' | 'result' | string;
  at: number;
  stage?: string;
  actorId?: string;
  actorName?: string;
  text?: string;
};

class OrchestrationBus extends EventEmitter {}

export const orchestrationBus = new OrchestrationBus();

export function emitEvent(runId: string, event: OrchestrationEvent) {
  orchestrationBus.emit(runId, event);
}

export function subscribe(runId: string, handler: (e: OrchestrationEvent) => void) {
  orchestrationBus.on(runId, handler);
  return () => orchestrationBus.off(runId, handler);
}

