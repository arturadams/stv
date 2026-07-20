import { describe, expect, it } from 'vitest';

import { CARD_LIST } from '../js/data/index.js';
import { spawnEnemy } from '../js/sim/entities/spawn.js';
import { makeHeadlessGame } from './helpers/headless.js';

describe('effect registry', () => {
  it('resolves every effect on all 154 cards without throwing', () => {
    const game = makeHeadlessGame(9001);
    expect(CARD_LIST.length).toBe(154);

    const buffs = {
      dmgMult: 1, costMult: 1, channelMult: 1, radiusMult: 1, critChance: 0, repeat: 0, addStatus: [],
    };

    for (const def of CARD_LIST) {
      // a fresh live target for every card, so single-target and AoE effects
      // alike have something to actually resolve against
      const enemy = spawnEnemy(game, 'wisp', game.player.x + 60, game.player.y);
      enemy.state = 'active';

      const inst = game.engine.makeCard(def.id);
      expect(() => {
        game.engine.doResolve(inst, buffs, null);
      }, `card "${def.id}" threw while resolving`).not.toThrow();
    }
  });
});
