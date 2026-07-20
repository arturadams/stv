import { describe, expect, it } from 'vitest';

import { damageEnemy } from '../js/sim/combat.js';
import { updateBasicAttack } from '../js/sim/basicAttack.js';
import { spawnEnemy } from '../js/sim/entities/spawn.js';
import { classChannelMult, gainCorruption } from '../js/sim/player.js';
import { CARDS } from '../js/data/index.js';
import { makeHeadlessGame } from './helpers/headless.js';

describe('class resources', () => {
  it('warrior basic attack builds Rage on a landed hit', () => {
    const game = makeHeadlessGame(801, 'warrior');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    expect(game.rage).toBe(0);
    updateBasicAttack(game, 0.6); // attackT starts at 0.5 — this dt lands the swing
    expect(game.rage).toBeGreaterThan(0);
  });

  it('rogue gains Opportunity from a kill', () => {
    const game = makeHeadlessGame(802, 'rogue');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    expect(game.opportunity).toBe(0);
    damageEnemy(game, enemy, Number.MAX_SAFE_INTEGER, { quiet: true });
    expect(game.opportunity).toBe(1);
  });

  it('necromancer harvests Souls and spends one to quicken a class card', () => {
    const game = makeHeadlessGame(803, 'necromancer');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    damageEnemy(game, enemy, Number.MAX_SAFE_INTEGER, { quiet: true });
    expect(game.souls).toBe(1);
    expect(classChannelMult(game, CARDS.raise_dead)).toBe(0.68);
    expect(game.souls).toBe(0);
  });

  it('druid basic attacks build Spirit that is spent to quicken class cards', () => {
    const game = makeHeadlessGame(804, 'druid');
    const enemy = spawnEnemy(game, 'wisp', game.player.x + 50, game.player.y);
    enemy.state = 'active';

    updateBasicAttack(game, 0.6);
    expect(game.spirit).toBe(5);
    expect(classChannelMult(game, CARDS.pounce)).toBeCloseTo(0.92);
    expect(game.spirit).toBe(0);
  });

  it('warlock Corruption quickens cards and triggers backlash at its cap', () => {
    const game = makeHeadlessGame(805, 'warlock');
    gainCorruption(game, 50);

    expect(classChannelMult(game, CARDS.hellfire)).toBe(0.8);
    gainCorruption(game, 50);
    expect(game.corruption).toBe(35);
    expect(game.player.hp).toBe(92);
  });
});
