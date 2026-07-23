import { sfx } from '../../audio.js';
import { colorOf } from '../game.js';
import { registerEffect } from './registry.js';

registerEffect('sustained', (game, eff, ctx) => {
  game.sustains.push({
    def: ctx.def, ctx, t: 0,
    dur: eff.dur * (ctx.upgradeRank === 1 ? 1.15 : ctx.upgradeRank === 2 ? 1.3 : 1), tick: eff.tick, tickT: 0, do: eff.do,
    color: colorOf(ctx.def),
  });
  game.engine.sustainedActive = true;
  sfx('zone', ctx.def.element);
});
