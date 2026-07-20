import { sfx } from '../../audio.js';
import { registerEffect } from './registry.js';

registerEffect('power', (game, eff, ctx) => {
  const rank = ctx.upgradeRank || 0;
  const durationScale = rank === 1 ? 1.15 : rank === 2 ? 1.3 : 1;
  game.engine.addPower(ctx.def, eff, durationScale);
});

registerEffect('extendPower', (game, eff) => {
  game.engine.extendPowers(eff.sec);
  sfx('enchant');
});
