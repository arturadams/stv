import { sfx } from '../../audio.js';
import { registerEffect } from './registry.js';

registerEffect('power', (game, eff, ctx) => {
  game.engine.addPower(ctx.def, eff, 1 + 0.15 * (ctx.lvl || 0));
});

registerEffect('extendPower', (game, eff) => {
  game.engine.extendPowers(eff.sec);
  sfx('enchant');
});
