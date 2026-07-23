import { ELEMENT_COLORS } from '../../data/index.js';
import { wrapAngle } from '../../core/math.js';
import { sfx } from '../../audio.js';
import { aimAngle, hitEnemy, targetable } from '../combat.js';
import { impact, impulse, shake } from '../fx.js';
import { registerEffect } from './registry.js';

registerEffect('arc', (game, eff, ctx) => {
  const p = game.player;
  const a0 = aimAngle(game);
  const half = (eff.arc * Math.PI / 180) / 2;
  const range = eff.range * ctx.radMult;
  const color = ELEMENT_COLORS[ctx.def.element] || '#e8dcc0';
  let hits = 0;
  let executed = false;
  for (const e of game.enemies) {
    if (!targetable(e)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > range + e.r) continue;
    let da = Math.atan2(e.y - p.y, e.x - p.x) - a0;
    da = wrapAngle(da);
    if (Math.abs(da) > half + 0.25) continue;
    let dmg = eff.dmg;
    if (eff.executeBelow && e.hp / e.maxHp < eff.executeBelow) {
      dmg *= eff.executeMult;
      executed = true;
    }
    hitEnemy(game, e, dmg, ctx, eff);
    hits++;
    if (!e.dead && eff.knockback) {
      e.kvx = Math.cos(a0) * eff.knockback;
      e.kvy = Math.sin(a0) * eff.knockback;
      e.kt = 0.2;
    }
  }
  game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: a0, arc: half * 2, range, color, t: 0, life: 0.28 });
  if (hits > 0) {
    // white-hot contact flash + a short directional camera impulse
    impact(game, p.x + Math.cos(a0) * range * 0.55, p.y + Math.sin(a0) * range * 0.55, color, a0, executed);
    impulse(game, a0 + Math.PI, Math.min(9, 3 + hits));
  }
  shake(game, 4);
  sfx('slash');
});
