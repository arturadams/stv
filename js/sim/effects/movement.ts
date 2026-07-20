import { distToSegment } from '../../core/math.js';
import { sfx } from '../../audio.js';
import { aimAngle, hitEnemy, nearestEnemy, targetable } from '../combat.js';
import { floater, shake, sigil, spark } from '../fx.js';
import { colorOf } from '../game.js';
import { clampToRegion } from '../map/chunks.js';
import { registerEffect } from './registry.js';

// repositioning cards are not cast — they become your Dash for a while
registerEffect('dashOverride', (game, eff, ctx) => {
  const p = game.player;
  const dur = eff.dur * (1 + 0.15 * (ctx.lvl || 0));
  game.dashOverride = { def: ctx.def, spec: eff.move, timeLeft: dur, dur, color: colorOf(ctx.def) };
  floater(game, p.x, p.y - 34, `DASH → ${ctx.def.name.toUpperCase()}`, colorOf(ctx.def), 13);
  sfx('enchant');
});

registerEffect('blink', (game, eff, ctx) => {
  const p = game.player;
  let a: number;
  const t = nearestEnemy(game, p.x, p.y);
  if (eff.away && t) a = Math.atan2(p.y - t.y, p.x - t.x);
  else a = Math.atan2(p.moveDir.y, p.moveDir.x);
  const color = colorOf(ctx.def);
  // collapse the hero into a thin vertical sigil, leaving a fading afterimage
  sigil(game, p.x, p.y, color, 'collapse');
  p.x += Math.cos(a) * eff.dist;
  p.y += Math.sin(a) * eff.dist;
  clampToRegion(game, p);
  if (eff.untargetable) p.untargetable = Math.max(p.untargetable, eff.untargetable);
  if (eff.empower) {
    p.empower = { ...eff.empower };
    floater(game, p.x, p.y - 30, 'EMPOWERED', '#a98fe0', 12);
  }
  // reconstruct with an outward pulse
  sigil(game, p.x, p.y, color, 'reconstruct');
  spark(game, p.x, p.y, color, 6, 110);
  sfx('blink');
});

registerEffect('dashAttack', (game, eff, ctx) => {
  const p = game.player;
  const a = aimAngle(game);
  const x0 = p.x;
  const y0 = p.y;
  p.x += Math.cos(a) * eff.dist;
  p.y += Math.sin(a) * eff.dist;
  clampToRegion(game, p);
  for (const e of game.enemies) {
    if (!targetable(e)) continue;
    if (distToSegment(e.x, e.y, x0, y0, p.x, p.y) < 60 + e.r) {
      hitEnemy(game, e, eff.dmg, ctx, eff);
      if (e.dead) continue;
      if (eff.gather) { // drag enemies along toward the destination
        const ka = Math.atan2(p.y - e.y, p.x - e.x);
        e.kvx = Math.cos(ka) * eff.gather;
        e.kvy = Math.sin(ka) * eff.gather;
        e.kt = 0.3;
      } else if (eff.knockback) {
        const ka = Math.atan2(e.y - y0, e.x - x0);
        e.kvx = Math.cos(ka) * eff.knockback;
        e.kvy = Math.sin(ka) * eff.knockback;
        e.kt = 0.25;
      }
    }
  }
  game.fx.push({ kind: 'streak', x1: x0, y1: y0, x2: p.x, y2: p.y, color: '#e8dcc0', t: 0, life: 0.3 });
  shake(game, 5);
  sfx('charge');
});
