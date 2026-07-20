import { describe, expect, it } from 'vitest';

import { damageEnemy } from '../js/sim/combat.js';
import { engageBossGate } from '../js/sim/map/features.js';
import { foundRival, matchmakingFallback } from '../js/sim/run/matchmaking.js';
import { openSanctuary } from '../js/sim/run/sanctuary.js';
import {
  advanceWorld,
  applyReward,
  buyCard,
  combineCards,
  leaveSanctuary,
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
    ['necromancer', 404],
    ['druid', 505],
    ['warlock', 606],
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
    const boss = game.activeBoss;
    if (!boss) throw new TypeError('expected active boss');
    let bossesSlainAtEvent = -1;
    game.bus.on('enemyKilled', ({ enemy }) => {
      if (enemy.def.boss) bossesSlainAtEvent = game.bossesSlain;
    });
    stepGame(game, 1, 404);
    damageEnemy(game, boss, Number.MAX_SAFE_INTEGER);

    expect(game.bossesSlain).toBe(1);
    expect(bossesSlainAtEvent).toBe(1);
    expect(landmark).toMatchObject({ cleared: true });
    // one gate down, two to go — the portal waits for the world's last boss
    expect(game.portal).toBeNull();
    const reward = game.pendingReward;
    if (!reward) throw new TypeError('expected relic reward');
    expect(reward.type).toBe('relic');
    const choice = reward.options[0];
    applyReward(game, choice);

    advanceWorld(game, { seed: 405 });
    const before = game.runTime;
    // 120s gives the ambient spawner real odds of producing World II's
    // higher-threat tiers (stalker, shardling's death-split, the cinder
    // ram's intercept charge, mortar's led artillery, imp's deathBurst) so
    // their behaviors actually run, not just world 1's.
    stepGame(game, 120, 406);

    expect(game.world).toBe(2);
    expect(game.runTime).toBeGreaterThan(before);
    expect(game.player.hp > 0 || game.state === 'gameover').toBe(true);
  });

  it('resolves duel, party, and matchmaking fallback paths', () => {
    const duel = makeHeadlessGame(505);
    foundRival(duel);
    resolveEncounterChoice(duel, 'fight');

    expect(duel.zoneRegion).toMatchObject({ kind: 'duel' });
    const rival = duel.enemies.find((e) => e.def.rival === true);
    if (!rival) throw new TypeError('expected rival enemy');
    let duelsWonAtEvent = -1;
    duel.bus.on('enemyKilled', ({ enemy }) => {
      if (enemy.def.rival) duelsWonAtEvent = duel.duelsWon;
    });
    stepGame(duel, 1, 505);
    damageEnemy(duel, rival, Number.MAX_SAFE_INTEGER);
    expect(duel.duelsWon).toBe(1);
    expect(duelsWonAtEvent).toBe(1);
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
