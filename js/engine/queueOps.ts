import type { CardInstance, QueueOpName } from '../data/types.js';
import { EVT } from '../core/events.js';
import { makeCard } from '../engine.js';

// CardEngine itself isn't typed until R3.6 — this narrows just the shape
// queueOp's cases actually touch.
export interface QueueOpEngine {
  queue: CardInstance[];
  discard: CardInstance[];
  deck: CardInstance[];
  flushMode: { charges: number; costMult: number } | null;
  lastResolvedId: string | null;
  lastResolvedLvl: number;
  cardIds: { next(): number };
  bus: { emit(name: string, payload: unknown): void };
  shuffleArray(arr: CardInstance[]): void;
  gainFlow(amount: number, source: string): void;
}

export interface QueueOpParams {
  costMult?: number;
}

type QueueOpHandler = (engine: QueueOpEngine, params: QueueOpParams) => void;

const handlers = new Map<QueueOpName, QueueOpHandler>();

export function registerQueueOp(name: QueueOpName, fn: QueueOpHandler): void {
  handlers.set(name, fn);
}

export function runQueueOp(engine: QueueOpEngine, op: QueueOpName, params: QueueOpParams = {}): void {
  const handler = handlers.get(op);
  if (!handler) throw new Error(`Unknown queue op: ${op}`);
  handler(engine, params);
}

registerQueueOp('duplicateNext', (engine) => {
  const next = engine.queue[0];
  if (next) engine.queue.splice(1, 0, { uid: engine.cardIds.next(), def: next.def, cost: next.cost + 1, lvl: next.lvl || 0, copy: true });
});

registerQueueOp('reverse', (engine) => {
  engine.queue.reverse();
});

registerQueueOp('flush', (engine, params) => {
  // Fast-forward, not teleport: queued cards still channel (at 3× speed)
  // and still pay Flow — channel rules and readability are preserved.
  if (engine.queue.length > 0) engine.flushMode = { charges: engine.queue.length, costMult: params.costMult ?? 1 };
});

registerQueueOp('echoLast', (engine) => {
  if (engine.lastResolvedId) {
    const inst = makeCard(engine.lastResolvedId, engine.lastResolvedLvl || 0) as CardInstance;
    inst.cost += 1;
    engine.queue.push(inst);
    engine.bus.emit(EVT.cardQueued, { inst });
  }
});

registerQueueOp('shuffleAll', (engine) => {
  engine.deck.push(...engine.discard);
  engine.discard = [];
  engine.shuffleArray(engine.deck);
  engine.bus.emit(EVT.deckShuffled, {});
});

registerQueueOp('purge', (engine) => {
  let refund = 0;
  for (const inst of engine.queue) refund += inst.cost;
  engine.discard.push(...engine.queue);
  engine.queue = [];
  engine.gainFlow(Math.floor(refund / 2), 'purge');
  engine.bus.emit(EVT.queueEmpty, {});
});
