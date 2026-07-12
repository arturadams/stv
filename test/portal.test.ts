import { describe, expect, it } from 'vitest';

import { damageEnemy } from '../js/sim/combat.js';
import { spawnEnemy } from '../js/sim/entities/spawn.js';
import { engageBossGate } from '../js/sim/map/features.js';
import { applyReward } from '../js/sim/run/rewards.js';
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

// fight one gate start to finish: engage, wait out a sealed boss, slay it,
// and decline the relic so the run returns to combat
function clearGate(game: HeadlessGame, seed: number): void {
  game.zoneRegion = null;
  engageBossGate(game, makeLandmark(game));
  const boss = game.activeBoss;
  if (!boss) throw new TypeError('expected active boss');
  stepGame(game, 1, seed);
  for (let s = 0; s < 10 && game.state === 'combat' && boss.state === 'vanish'; s++) {
    stepGame(game, 1, seed + s);
  }
  damageEnemy(game, boss, Number.MAX_SAFE_INTEGER);
  if (game.state === 'reward') applyReward(game, null);
}

describe('world portals', () => {
  it("opens the portal only after the world's last gate falls", () => {
    const game = makeHeadlessGame(900);
    clearGate(game, 901);
    expect(game.portal).toBeNull();
    clearGate(game, 911);
    expect(game.portal).toBeNull();
    clearGate(game, 921);
    expect(game.portal).not.toBeNull();
    expect(game.worldBossesSlain).toBe(3);
  });

  it('collapses a missed portal and re-manifests it near the player', () => {
    const game = makeHeadlessGame(930);
    game.portal = { x: game.player.x + 2400, y: game.player.y, timeLeft: 0.5 };
    stepGame(game, 1, 931);
    expect(game.portal).toBeNull();
    expect(game.portalRespawnT).toBeGreaterThan(0);
    game.portalRespawnT = 0.5;
    stepGame(game, 1, 932);
    const portal = game.portal;
    if (!portal) throw new TypeError('expected the portal to return');
    const d = Math.hypot(portal.x - game.player.x, portal.y - game.player.y);
    expect(d).toBeLessThan(900);
  });

  it('advances the world when the player steps through', () => {
    const game = makeHeadlessGame(940);
    game.portal = { x: game.player.x, y: game.player.y, timeLeft: 60 };
    stepGame(game, 0.2, 941);
    expect(game.world).toBe(2);
    expect(game.portal).toBeNull();
    expect(game.worldBossesSlain).toBe(0);
  });

  it("the gate's seal dismisses ambient enemies without loot or kill credit", () => {
    const game = makeHeadlessGame(950);
    spawnEnemy(game, 'wisp', game.player.x + 300, game.player.y);
    spawnEnemy(game, 'wisp', game.player.x - 300, game.player.y);
    const kills = game.kills;
    engageBossGate(game, makeLandmark(game));
    stepGame(game, 0.1, 951);
    expect(game.enemies.filter((e) => !e.def.boss)).toHaveLength(0);
    expect(game.kills).toBe(kills);
  });
});
