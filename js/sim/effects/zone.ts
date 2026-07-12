import { ELEMENT_COLORS } from '../../data/index.js';
import { sfx } from '../../audio.js';
import { nearestEnemy } from '../combat.js';
import { registerEffect } from './registry.js';

registerEffect('zone', (game, eff, ctx) => {
  const p = game.player;
  let x: number;
  let y: number;
  const follow = !!eff.follow;
  if (follow || ctx.def.targeting === 'self') {
    x = p.x;
    y = p.y;
  } else if (ctx.preview) {
    x = ctx.preview.x;
    y = ctx.preview.y;
  } else {
    const t = nearestEnemy(game, p.x, p.y);
    x = t ? t.x : p.x;
    y = t ? t.y : p.y;
  }
  game.zones.push({
    x, y, r: eff.r * ctx.radMult, t: 0, duration: eff.duration * (1 + 0.15 * (ctx.lvl || 0)),
    tickDmg: eff.tickDmg, tickRate: eff.tickRate || 0.5, tickT: 0,
    status: eff.status || null, slow: eff.slow || 0, follow,
    color: ELEMENT_COLORS[ctx.def.element], element: ctx.def.element, ctx,
  });
  sfx('zone', ctx.def.element);
});
