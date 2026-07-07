import type {
  Buffs,
  CardInstance,
  School,
  StatusName,
} from '../data/types.js';

export type { School, StatusName } from '../data/types.js';

export interface EnemyState {
  uid: number;
  def: {
    id: string;
    boss?: boolean;
    rival?: boolean;
  };
  statuses: Partial<Record<StatusName, { stacks: number; t: number }>>;
}

export interface EventMap {
  cardDrawn: { inst: CardInstance; reason: string };
  cardResolved: { inst: CardInstance; buffs: Buffs };
  cardQueued: { inst: CardInstance };
  channelStart: { inst: CardInstance; dur: number; cost: number };
  deckShuffled: Record<string, never>;
  queueEmpty: Record<string, never>;
  flowGained: { amount: number; source: string };
  comboChanged: { combo: number };
  powerGained: { id: string; school: School };
  powerExpired: { id: string; school: School };
  statusApplied: { enemy: EnemyState; status: StatusName; x: number; y: number };
  enemyKilled: { enemy: EnemyState; x: number; y: number };
  playerHit: { amount: number };
  perfectDodge: Record<string, never>;
  trapTriggered: { x: number; y: number };
  dash: Record<string, never>;
}

export const EVT = {
  cardDrawn: 'cardDrawn',
  cardResolved: 'cardResolved',
  cardQueued: 'cardQueued',
  channelStart: 'channelStart',
  deckShuffled: 'deckShuffled',
  queueEmpty: 'queueEmpty',
  flowGained: 'flowGained',
  comboChanged: 'comboChanged',
  powerGained: 'powerGained',
  powerExpired: 'powerExpired',
  statusApplied: 'statusApplied',
  enemyKilled: 'enemyKilled',
  playerHit: 'playerHit',
  perfectDodge: 'perfectDodge',
  trapTriggered: 'trapTriggered',
  dash: 'dash',
} as const satisfies { [K in keyof EventMap]: K };

export class EventBus {
  private readonly listeners = new Map<
    keyof EventMap,
    Array<(payload: unknown) => void>
  >();

  on<K extends keyof EventMap>(
    name: K,
    listener: (payload: EventMap[K]) => void,
  ): void {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push((payload) => listener(payload as EventMap[K]));
    this.listeners.set(name, listeners);
  }

  emit<K extends keyof EventMap>(name: K, payload: EventMap[K]): void {
    const listeners = this.listeners.get(name);
    if (listeners) {
      for (const listener of listeners.slice()) listener(payload);
    }
  }
}
