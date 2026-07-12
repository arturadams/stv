import { sfx } from '../../audio.js';
import { colorOf } from '../game.js';
import { registerEffect } from './registry.js';

registerEffect('draw', (game, eff) => {
  for (let i = 0; i < eff.n; i++) game.engine.drawCard('card');
});

registerEffect('queueOp', (game, eff) => {
  game.engine.queueOp(eff.op, { costMult: eff.costMult });
  sfx('engine');
});

registerEffect('mod', (game, eff, ctx) => {
  game.engine.addModifier(ctx.def, eff);
  sfx('engine');
});

registerEffect('enchant', (game, eff, ctx) => {
  game.engine.addEnchant(eff, { name: ctx.def.name, glyph: ctx.def.glyph, color: colorOf(ctx.def) });
  sfx('enchant');
});

registerEffect('haste', (game, eff) => {
  game.engine.hasteMult = eff.mult;
  game.engine.hasteTimer = eff.dur;
  sfx('enchant');
});

registerEffect('flowOverTime', (game, eff) => {
  game.engine.flowJobs.push({ amount: eff.amount, dur: eff.dur, remaining: eff.amount });
  sfx('engine');
});
