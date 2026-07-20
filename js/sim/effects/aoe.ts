import { ELEMENT_COLORS } from '../../data/index.js';
import { sfx } from '../../audio.js';
import { aimAngle, enemiesIn, hitEnemy, nearestEnemy } from '../combat.js';
import { shake, spark } from '../fx.js';
import { colorOf } from '../game.js';
import { registerEffect } from './registry.js';

registerEffect('aoe', (game, eff, ctx) => {
  const p = game.player;
  let x: number;
  let y: number;
  let dir: number | undefined;
  if (eff.atFacing != null) {
    dir = aimAngle(game);
    x = p.x + Math.cos(dir) * eff.atFacing;
    y = p.y + Math.sin(dir) * eff.atFacing;
  } else if (ctx.preview && !ctx.preview.reticle) {
    x = ctx.preview.x;
    y = ctx.preview.y;
  } else if (ctx.def.targeting === 'self') {
    x = p.x;
    y = p.y;
  } else {
    const t = nearestEnemy(game, p.x, p.y);
    x = t ? t.x : p.x;
    y = t ? t.y : p.y;
  }
  const r = eff.r * ctx.radMult;
  let hits = 0;
  for (const e of enemiesIn(game, x, y, r)) {
  const controlScale = ctx.upgradeRank === 1 ? 1.1 : ctx.upgradeRank === 2 ? 1.2 : 1;
    hits++;
    if (eff.dmg > 0) hitEnemy(game, e, eff.dmg, ctx, eff);
    if (e.dead) continue;
    const hardy = e.def.boss || e.def.rival;
    if (eff.freeze) e.freeze = Math.max(e.freeze || 0, (hardy ? eff.freeze * 0.25 : eff.freeze) * controlScale);
    if (eff.stun) e.stun = Math.max(e.stun || 0, (hardy ? eff.stun * 0.25 : eff.stun) * controlScale);
    if (eff.root) e.root = Math.max(e.root || 0, (hardy ? eff.root * 0.2 : eff.root) * controlScale);
    if (eff.knockback) {
      const a = Math.atan2(e.y - y, e.x - x);
      e.kvx = Math.cos(a) * eff.knockback;
      e.kvy = Math.sin(a) * eff.knockback;
      e.kt = 0.25;
    }
  }
  if (eff.flowPerHit) game.engine.gainFlow(hits * eff.flowPerHit, 'manaburst');
  if (eff.flowFlat) game.engine.gainFlow(eff.flowFlat, 'card');
  if (hits > 0 && eff.flowIfHit) game.engine.gainFlow(eff.flowIfHit, 'card_hit');
  game.fx.push({ kind: 'blast', x, y, r, dir, color: ELEMENT_COLORS[ctx.def.element] || colorOf(ctx.def), t: 0, life: 0.5 });
  spark(game, x, y, ELEMENT_COLORS[ctx.def.element] || '#fff', Math.min(6 + r / 12, 26), r * 1.6, 0.55);
  shake(game, eff.shake || Math.min(4 + r / 40, 10));
  if ((eff.shake || 0) >= 14) game.hitstop = Math.max(game.hitstop, 0.08);
  sfx('blast', ctx.def.element);
});
