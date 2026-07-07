import { describe, expect, it } from 'vitest';

import {
  advanceWorld,
  applyReward,
  buyCard,
  combineCards,
  damageEnemy,
  engageBossGate,
  foundRival,
  leaveSanctuary,
  matchmakingFallback,
  openSanctuary,
  resolveEncounterChoice,
  sellCard,
} from '../js/world.js';
import { makeHeadlessGame, stepGame } from './helpers/headless.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError('expected ' + label);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError('expected ' + label);
  return value;
}

describe('headless class smoke', () => {
  it.each([
    ['mage', 101],
    ['warrior', 202],
    ['rogue', 303],
  ] as const)('simulates a 180-second %s run', (classId, seed) => {
    const game = makeHeadlessGame(seed, classId);
    let cardsResolved = 0;
    game.bus.on('cardResolved', () => {
      cardsResolved++;
    });

    stepGame(game, 180, seed ^ 0x5eed);

    expect(typeof document).toBe('undefined');
    expect(game.kills).toBeGreaterThan(0);
    expect(cardsResolved).toBeGreaterThanOrEqual(5);
    expect(game.player.hp > 0 || game.state === 'gameover').toBe(true);
  });
});

describe('forced headless paths', () => {
  it('clears a boss gate, offers a relic, and continues in world two', () => {
    const game = makeHeadlessGame(404);
    const landmark = {
      x: game.player.x,
      y: game.player.y,
      r: 120,
      zoneR: 430,
      cleared: false,
      engaged: false,
    };

    engageBossGate(game, landmark);
    const boss = requireRecord(game.activeBoss, 'active boss');
    stepGame(game, 1, 404);
    damageEnemy(game, boss, Number.MAX_SAFE_INTEGER);

    expect(game.bossesSlain).toBe(1);
    expect(landmark).toMatchObject({ cleared: true, portal: true });
    const reward = requireRecord(game.pendingReward, 'relic reward');
    expect(reward.type).toBe('relic');
    const choice = requireArray(reward.options, 'relic options')[0];
    applyReward(game, choice);

    advanceWorld(game, { seed: 405 });
    const before = game.runTime;
    stepGame(game, 30, 406);

    expect(game.world).toBe(2);
    expect(game.runTime).toBeGreaterThan(before);
  });

  it('resolves duel, party, and matchmaking fallback paths', () => {
    const duel = makeHeadlessGame(505);
    foundRival(duel);
    resolveEncounterChoice(duel, 'fight');

    expect(duel.zoneRegion).toMatchObject({ kind: 'duel' });
    const rival = requireArray(duel.enemies, 'duel enemies').find((value) => {
      if (!isRecord(value) || !isRecord(value.def)) return false;
      return value.def.rival === true;
    });
    stepGame(duel, 1, 505);
    damageEnemy(duel, requireRecord(rival, 'rival enemy'), Number.MAX_SAFE_INTEGER);
    expect(duel.duelsWon).toBe(1);
    expect(duel.pendingReward).toMatchObject({ type: 'card' });

    const party = makeHeadlessGame(506);
    foundRival(party);
    resolveEncounterChoice(party, 'party');
    const ally = requireRecord(party.ally, 'party ally');
    ally.t = Number(ally.dur) - 0.1;
    stepGame(party, 1, 507);
    expect(party.ally).toBeNull();
    expect(party.mm.state).toBe('idle');

    const fallback = makeHeadlessGame(508);
    matchmakingFallback(fallback);
    expect(requireArray(fallback.enemies, 'fallback enemies').some((value) => {
      if (!isRecord(value) || !isRecord(value.def)) return false;
      return value.def.id === 'guardian';
    })).toBe(true);
  });

  it('characterizes sanctuary buying, selling floor, and combining', () => {
    const game = makeHeadlessGame(606);
    game.gold = 1000;
    openSanctuary(game, {
      x: game.player.x,
      y: game.player.y,
      r: 190,
      seed: 607,
      lock: false,
      stock: null,
    });

    const beforeBuy = game.deckIds.length;
    expect(buyCard(game, 0)).toBe(true);
    expect(game.deckIds).toHaveLength(beforeBuy + 1);

    game.deckIds = game.deckIds.slice(0, 6);
    const floorEntry = game.deckIds[0];
    expect(sellCard(game, floorEntry.id, floorEntry.lvl ?? 0)).toBe(false);

    game.deckIds = [
      { id: 'draw', lvl: 0 },
      { id: 'battery', lvl: 0 },
      { id: 'quickcast', lvl: 0 },
      { id: 'frost_nova', lvl: 0 },
      { id: 'mana_burst', lvl: 0 },
      { id: 'teleport', lvl: 0 },
      { id: 'flame_attunement', lvl: 0 },
      { id: 'flame_attunement', lvl: 0 },
    ];
    expect(combineCards(game, 'flame_attunement', 0)).toBe(true);
    expect(game.deckIds.filter((entry) => entry.id === 'flame_attunement'))
      .toEqual([{ id: 'flame_attunement', lvl: 1 }]);

    leaveSanctuary(game);
    expect(game.state).toBe('combat');
  });
});
