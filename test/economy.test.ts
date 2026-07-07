import { describe, expect, it } from 'vitest';

import { cardDef } from './helpers/data.js';
import {
  applyStatus,
  CARD_PRICES,
  engageBossGate,
  sellPrice,
} from '../js/world.js';
import { makeHeadlessGame, stepGame } from './helpers/headless.js';

interface StatusView {
  stacks: number;
  t: number;
  acc?: number;
}

interface BossView {
  hp: number;
  statuses: Record<string, StatusView>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBossView(value: unknown): value is BossView {
  return isRecord(value)
    && typeof value.hp === 'number'
    && isRecord(value.statuses);
}

describe('economy rules', () => {
  it('pins rarity prices and level-based sell prices', () => {
    expect(CARD_PRICES).toEqual({ Common: 25, Uncommon: 40, Rare: 70, Legendary: 120 });
    expect(sellPrice({ id: 'draw', lvl: 0 })).toBe(12);
    expect(sellPrice({ id: 'draw', lvl: 2 })).toBe(42);
    expect(sellPrice({ id: 'flush_queue', lvl: 0 })).toBe(35);
    expect(sellPrice({ id: 'worldfire', lvl: 0 })).toBe(60);
  });
});

describe('armor and status rules', () => {
  it('caps armor at 60 when resolving defense cards', () => {
    const game = makeHeadlessGame(66, 'warrior');
    game.player.armor = 55;
    const card = game.engine.makeCard('shield_wall');

    game.engine.doResolve(card, { repeat: 0, addStatus: [] }, null);

    expect(game.player.armor).toBe(60);
  });

  it('stacks and refreshes statuses while capping boss chill', () => {
    const game = makeHeadlessGame(77);
    const regular: {
      def: { boss: boolean; rival: boolean };
      statuses: Record<string, StatusView>;
    } = { def: { boss: false, rival: false }, statuses: {} };
    applyStatus(game, regular, 'burn', 2);
    const first = regular.statuses.burn;
    first.t = 1;
    applyStatus(game, regular, 'burn', 1);

    expect(first.stacks).toBe(3);
    expect(first.t).toBe(3);

    const boss: {
      def: { boss: boolean; rival: boolean };
      statuses: Record<string, StatusView>;
    } = { def: { boss: true, rival: false }, statuses: {} };
    applyStatus(game, boss, 'chill', 5);
    expect(boss.statuses.chill.stacks).toBe(1);
    expect(boss.statuses.chill.t).toBe(2.2);
  });

  it('ticks damage-over-time effects during headless updates', () => {
    const game = makeHeadlessGame(88);
    game.player.attackT = Number.POSITIVE_INFINITY;
    game.engine.drawTimer = Number.POSITIVE_INFINITY;
    game.engine.sustainedActive = true;
    engageBossGate(game, {
      x: game.player.x,
      y: game.player.y,
      r: 120,
      zoneR: 430,
      cleared: false,
      engaged: false,
    });
    stepGame(game, 1, 89);
    const bossValue: unknown = game.activeBoss;
    if (!isBossView(bossValue)) {
      throw new TypeError('expected active boss');
    }
    const boss = bossValue;
    const before = boss.hp;
    applyStatus(game, boss, 'burn', 2);

    stepGame(game, 1, 90);

    expect(boss.hp).toBeLessThan(before);
    expect(boss.statuses.burn.t).toBeLessThan(3);
    expect(cardDef('shield_wall').effects[0]).toEqual({ type: 'armor', amount: 25 });
  });
});
