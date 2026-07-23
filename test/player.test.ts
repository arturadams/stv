import { describe, expect, it } from 'vitest';

import { applyStatus, damageEnemy } from '../js/sim/combat.js';
import { updateBasicAttack } from '../js/sim/basicAttack.js';
import { updateProjectiles } from '../js/sim/entities/projectiles.js';
import { spawnEnemy } from '../js/sim/entities/spawn.js';
import { makeHeadlessGame } from './helpers/headless.js';

// Card System v2 (rework_cards.md) §6-9: the single class resource lives on
// game.engine.flow/maxFlow (one named 0-10 resource per class) — these exercise the
// per-class gain call sites, replacing the old Rage/Opportunity fields.
describe('class resources', () => {
  it('warrior builds Rage after every third landed melee swing', () => {
    const game = makeHeadlessGame(801, 'warrior');
    const enemy = spawnEnemy(game, 'seneschal', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    for (let swing = 0; swing < 3; swing++) {
      game.player.attackT = 0; // force the next call to land immediately
      updateBasicAttack(game, 0.01);
    }
    expect(game.engine.flow).toBe(startFlow + 1);
  });

  it('rogue gains Focus from killing a poisoned enemy, not an ordinary kill', () => {
    const game = makeHeadlessGame(802, 'rogue');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    applyStatus(game, enemy, 'poison', 1);
    damageEnemy(game, enemy, Number.MAX_SAFE_INTEGER, { quiet: true });
    expect(game.engine.flow).toBe(startFlow + 1);
  });

  it('rogue does not gain Focus from an unpoisoned kill', () => {
    const game = makeHeadlessGame(803, 'rogue');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    damageEnemy(game, enemy, Number.MAX_SAFE_INTEGER, { quiet: true });
    expect(game.engine.flow).toBe(startFlow);
  });

  it('mage gains Mana on every fourth landed basic bolt, fixing the missed-bolt stall', () => {
    const game = makeHeadlessGame(804, 'mage');
    const enemy = spawnEnemy(game, 'seneschal', game.player.x + 100, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    for (let bolt = 0; bolt < 4; bolt++) {
      game.player.attackT = 0; // force the next call to fire immediately
      updateBasicAttack(game, 0.01);
      for (let i = 0; i < 30 && game.projectiles.length > 0; i++) updateProjectiles(game, 1 / 60);
    }
    expect(game.engine.flow).toBe(startFlow + 1);
  });

  it('necromancer gains one Soul from a kill', () => {
    const game = makeHeadlessGame(805, 'necromancer');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    damageEnemy(game, enemy, Number.MAX_SAFE_INTEGER, { quiet: true });
    expect(game.engine.flow).toBe(startFlow + 1);
  });

  it('druid gains one Spirit after every third landed claw', () => {
    const game = makeHeadlessGame(806, 'druid');
    const enemy = spawnEnemy(game, 'seneschal', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    for (let claw = 0; claw < 3; claw++) {
      game.player.attackT = 0;
      updateBasicAttack(game, 0.01);
    }
    expect(game.engine.flow).toBe(startFlow + 1);
  });

  it('warlock gains one Corruption after every fourth landed bolt', () => {
    const game = makeHeadlessGame(807, 'warlock');
    const enemy = spawnEnemy(game, 'seneschal', game.player.x + 100, game.player.y);
    enemy.state = 'active';

    const startFlow = game.engine.flow;
    for (let bolt = 0; bolt < 4; bolt++) {
      game.player.attackT = 0;
      updateBasicAttack(game, 0.01);
      for (let i = 0; i < 35 && game.projectiles.length > 0; i++) updateProjectiles(game, 1 / 60);
    }
    expect(game.engine.flow).toBe(startFlow + 1);
  });
});
