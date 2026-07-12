import { sfx } from '../../audio.js';
import { colorOf } from '../game.js';
import { registerEffect } from './registry.js';

registerEffect('trap', (game, eff, ctx) => {
  const p = game.player;
  game.traps.push({
    x: p.x, y: p.y, r: eff.r * ctx.radMult, armT: eff.arm, ttl: eff.ttl,
    dmg: eff.dmg, root: eff.root || 0, status: eff.status || null, ctx,
    color: colorOf(ctx.def),
  });
  sfx('engine');
});
