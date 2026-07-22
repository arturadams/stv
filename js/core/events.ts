import type {
  Buffs,
  CardInstance,
  EnemyState,
  School,
  StatusName,
} from '../data/types.js';
import type { Summon } from '../sim/types.js';

export type { EnemyState, School, StatusName } from '../data/types.js';

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
  statusExpired: { enemy: EnemyState; status: StatusName };
  enemyKilled: { enemy: EnemyState; x: number; y: number };
  playerHit: { amount: number };
  perfectDodge: { x: number; y: number };
  trapTriggered: { x: number; y: number };
  dash: Record<string, never>;
  criticalHit: { enemy: EnemyState; dmg: number };
  enemyHit: { enemy: EnemyState; dmg: number; basic: boolean };
  bossHealthThreshold: { enemy: EnemyState; pct: number };
  summonCreated: { summon: Summon };
  // `forced` distinguishes a summon evicted early to make room for a new one
  // (js/sim/effects/coreSummon.ts's per-id/global cap eviction) from one that
  // simply ran out its own timer (js/sim/entities/summons.ts) — relics that
  // promise a reward for natural expiry specifically (e.g. Last Procession)
  // need to tell the two apart
  summonExpired: { summon: Summon; forced?: boolean };
  summonSacrificed: { summon: Summon };
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
  statusExpired: 'statusExpired',
  enemyKilled: 'enemyKilled',
  playerHit: 'playerHit',
  perfectDodge: 'perfectDodge',
  trapTriggered: 'trapTriggered',
  dash: 'dash',
  criticalHit: 'criticalHit',
  enemyHit: 'enemyHit',
  bossHealthThreshold: 'bossHealthThreshold',
  summonCreated: 'summonCreated',
  summonExpired: 'summonExpired',
  summonSacrificed: 'summonSacrificed',
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
