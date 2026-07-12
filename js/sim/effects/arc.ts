import { ELEMENT_COLORS } from '../../data/index.js';
import { wrapAngle } from '../../core/math.js';
import { sfx } from '../../audio.js';
import { aimAngle, hitEnemy, targetable } from '../combat.js';
import { shake } from '../fx.js';
import { registerEffect } from './registry.js';

registerEffect('arc', (game, eff, ctx) => {
  const p = game.player;
  const a0 = aimAngle(game);
  const half = (eff.arc * Math.PI / 180) / 2;
  const range = eff.range * ctx.radMult;
  for (const e of game.enemies) {
    if (!targetable(e)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > range + e.r) continue;
    let da = Math.atan2(e.y - p.y, e.x - p.x) - a0;
    da = wrapAngle(da);
    if (Math.abs(da) > half + 0.25) continue;
    let dmg = eff.dmg;
    if (eff.executeBelow && e.hp / e.maxHp < eff.executeBelow) dmg *= eff.executeMult;
    hitEnemy(game, e, dmg, ctx, eff);
    if (!e.dead && eff.knockback) {
      e.kvx = Math.cos(a0) * eff.knockback;
      e.kvy = Math.sin(a0) * eff.knockback;
      e.kt = 0.2;
    }
  }
  game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: a0, arc: half * 2, range, color: ELEMENT_COLORS[ctx.def.element] || '#e8dcc0', t: 0, life: 0.28 });
  shake(game, 4);
  sfx('slash');
});
