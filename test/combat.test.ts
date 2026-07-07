import { describe, expect, it } from 'vitest';

import {
  STATUS_DEFS,
  applyStatus,
  damageEnemy,
  nearestEnemy,
  spawnPlayerProj,
  targetable,
} from '../js/sim/combat.js';
import { spawnEnemy } from '../js/world.js';
import { makeHeadlessGame } from './helpers/headless.js';

describe('typed combat primitives', () => {
  it('applies statuses and emits one ordered kill event', () => {
    const game = makeHeadlessGame(701);
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';
    let observedKills = -1;
    let events = 0;
    game.bus.on('enemyKilled', ({ enemy: killed }) => {
      if (killed.uid === enemy.uid) {
        events++;
        observedKills = game.kills;
      }
    });

    applyStatus(game, enemy, 'burn', 2);
    damageEnemy(game, enemy, Number.MAX_SAFE_INTEGER, { quiet: true });

    expect(STATUS_DEFS.burn).toMatchObject({ dps: 3, dur: 3 });
    expect(enemy.statuses.burn).toMatchObject({ stacks: 2, t: 3 });
    expect(enemy.dead).toBe(true);
    expect(events).toBe(1);
    expect(observedKills).toBe(1);
  });

  it('queries targets and creates typed player projectiles', () => {
    const game = makeHeadlessGame(702);
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 80, game.player.y);
    enemy.state = 'active';

    expect(targetable(enemy)).toBe(true);
    expect(nearestEnemy(game, game.player.x, game.player.y)).toBe(enemy);

    spawnPlayerProj(
      game,
      game.player.x,
      game.player.y,
      0,
      { dmg: 5, speed: 600, radius: 4, element: 'arcane' },
      {
        def: { element: 'arcane' },
        buffs: {},
        dmgMult: 1,
        basic: true,
      },
    );

    expect(game.projectiles).toHaveLength(1);
    expect(game.projectiles[0]).toMatchObject({ vx: 600, vy: 0, dmg: 5, life: 2.2 });
  });
});
