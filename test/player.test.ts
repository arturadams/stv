import { describe, expect, it } from 'vitest';

import { damageEnemy } from '../js/sim/combat.js';
import { updateBasicAttack } from '../js/sim/basicAttack.js';
import { spawnEnemy } from '../js/world.js';
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
});
