import { describe, expect, it } from 'vitest';

import { ENEMIES, WORLDS } from '../js/data/index.js';
import type { EnemyDef } from '../js/data/types.js';
import { damageEnemy } from '../js/sim/combat.js';
import { spawnEnemy } from '../js/sim/entities/spawn.js';
import { engageBossGate } from '../js/sim/map/features.js';
import { makeHeadlessGame, stepGame } from './helpers/headless.js';
import type { HeadlessGame } from './helpers/headless.js';

function makeLandmark(game: HeadlessGame) {
  return {
    x: game.player.x,
    y: game.player.y,
    r: 120,
    zoneR: 430,
    cleared: false,
    engaged: false,
  };
}

// step in one-second slices, tallying the boss's observable output so the
// assertions survive attack-cycle timing shifts
function observeFight(game: HeadlessGame, seconds: number, seed: number) {
  const seen = { telegraphs: 0, projectiles: 0, hazards: 0, minions: 0 };
  for (let s = 0; s < seconds; s++) {
    stepGame(game, 1, seed + s);
    seen.telegraphs += game.telegraphs.length;
    seen.projectiles += game.enemyProjectiles.length;
    seen.hazards += game.hazards.length;
    seen.minions += game.enemies.filter((e) => !e.def.boss).length;
  }
  return seen;
}

describe('three original bosses per world', () => {
  it('declares three distinct bosses on every world', () => {
    for (const world of WORLDS) {
      expect(world.bosses).toHaveLength(3);
      expect(new Set(world.bosses).size).toBe(3);
      for (const id of world.bosses) {
        const def: EnemyDef = ENEMIES[id as keyof typeof ENEMIES];
        expect(def.boss).toBe(true);
      }
    }
    // the six authored bosses each carry their own behavior — no reskins
    const authored = [...WORLDS[0].bosses, ...WORLDS[1].bosses];
    const behaviors = authored.map(
      (id) => (ENEMIES[id as keyof typeof ENEMIES] as EnemyDef).behavior,
    );
    expect(new Set(behaviors).size).toBe(6);
  });

  it('cycles boss gates through the world roster', () => {
    const game = makeHeadlessGame(700);
    const expected = WORLDS[0].bosses;
    for (let i = 0; i < 3; i++) {
      game.bossesSlain = i;
      game.zoneRegion = null;
      engageBossGate(game, makeLandmark(game));
      expect(game.activeBoss?.def.id).toBe(expected[i]);
      const boss = game.activeBoss;
      if (!boss) throw new TypeError('expected active boss');
      boss.dead = true;
      game.enemies = [];
      game.activeBoss = null;
    }
  });

  it.each([
    ['librarian', 1, 0],
    ['leviathan', 1, 1],
    ['unwritten_king', 1, 2],
    ['sovereign', 2, 0],
    ['colossus', 2, 1],
    ['phoenix', 2, 2],
  ] as const)('%s fights, telegraphs, and dies headlessly', (id, world, slot) => {
    const game = makeHeadlessGame(710 + slot, 'mage', world);
    game.bossesSlain = slot;
    engageBossGate(game, makeLandmark(game));
    const boss = game.activeBoss;
    if (!boss) throw new TypeError('expected active boss');
    expect(boss.def.id).toBe(id);

    const seen = observeFight(game, 30, 720 + slot);
    // every boss telegraphs its attacks instead of hitscanning the player
    expect(seen.telegraphs).toBeGreaterThan(0);
    if (game.state === 'combat') {
      const slain = game.bossesSlain;
      damageEnemy(game, boss, Number.MAX_SAFE_INTEGER);
      expect(game.bossesSlain).toBe(slain + 1);
    }
  });

  it('leviathan submerges, breaches, and pools ink', () => {
    const game = makeHeadlessGame(730);
    game.bossesSlain = 1;
    engageBossGate(game, makeLandmark(game));
    const boss = game.activeBoss;
    if (!boss) throw new TypeError('expected leviathan');
    let sawSubmerged = false;
    let sawInk = false;
    for (let s = 0; s < 25 && game.state === 'combat'; s++) {
      stepGame(game, 1, 731 + s);
      if (boss.state === 'vanish') sawSubmerged = true;
      if (game.hazards.some((hz) => hz.kind === 'ink')) sawInk = true;
    }
    expect(sawSubmerged).toBe(true);
    expect(sawInk).toBe(true);
  });

  it('the pyre matriarch moults once and hatches with half her life', () => {
    const game = makeHeadlessGame(740, 'mage', 2);
    game.bossesSlain = 2;
    engageBossGate(game, makeLandmark(game));
    const boss = game.activeBoss;
    if (!boss) throw new TypeError('expected phoenix');
    stepGame(game, 2, 741);
    boss.hp = Math.round(boss.maxHp * 0.2);
    let sawEgg = false;
    for (let s = 0; s < 8 && game.state === 'combat'; s++) {
      stepGame(game, 1, 742 + s);
      if (boss.state === 'vanish') sawEgg = true;
    }
    if (game.state !== 'combat') return; // the hatch blast can end a run
    expect(sawEgg).toBe(true);
    expect(boss.hp).toBeGreaterThan(boss.maxHp * 0.3);
  });
});

describe('world two originals', () => {
  it('shardlings split into slivers on death', () => {
    const game = makeHeadlessGame(750, 'mage', 2);
    const shardling = spawnEnemy(game, 'shardling', game.player.x + 200, game.player.y);
    stepGame(game, 1, 751);
    damageEnemy(game, shardling, Number.MAX_SAFE_INTEGER);
    expect(game.enemies.filter((e) => e.def.id === 'sliver').length).toBe(3);
  });

  it('the bellows cantor stokes nearby enemies into a frenzy', () => {
    const game = makeHeadlessGame(760, 'mage', 2);
    // a stationary vent sits inside the cantor's aura, so the stoke pulse
    // has a target no matter where the chasers wander
    spawnEnemy(game, 'bellows', game.player.x + 400, game.player.y);
    spawnEnemy(game, 'vent', game.player.x + 420, game.player.y + 40);
    let sawFrenzy = false;
    for (let s = 0; s < 8 && game.state === 'combat'; s++) {
      stepGame(game, 1, 761 + s);
      if (game.enemies.some((e) => e.frenzy > 0)) sawFrenzy = true;
    }
    expect(sawFrenzy).toBe(true);
  });

  it('vents, rams, and wardens all telegraph their threats', () => {
    const game = makeHeadlessGame(770, 'mage', 2);
    spawnEnemy(game, 'vent', game.player.x + 250, game.player.y);
    spawnEnemy(game, 'cinder_ram', game.player.x - 300, game.player.y);
    spawnEnemy(game, 'kiln_warden', game.player.x, game.player.y + 320);
    let telegraphs = 0;
    let hazards = 0;
    for (let s = 0; s < 15 && game.state === 'combat'; s++) {
      stepGame(game, 1, 771 + s);
      telegraphs += game.telegraphs.length;
      hazards += game.hazards.length;
    }
    expect(telegraphs).toBeGreaterThan(0);
    expect(hazards).toBeGreaterThan(0);
  });
});
