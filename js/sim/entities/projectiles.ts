import { EVT } from '../../core/events.js';
import { sfx } from '../../audio.js';
import { chainFrom, damagePlayer, enemiesIn, hitEnemy, targetable } from '../combat.js';
import { shake, spark } from '../fx.js';
import { gainRage } from '../player.js';
import type { GameState } from '../types.js';

export function updateProjectiles(game: GameState, dt: number): void {
  const p = game.player;
  // player projectiles
  for (const pr of game.projectiles) {
    pr.t += dt;
    if (pr.boomerang) {
      if (pr.phase === 0 && pr.t > 0.55) {
        pr.phase = 1;
        pr.hit.clear();
      }
      if (pr.phase === 1) {
        const a = Math.atan2(p.y - pr.y, p.x - pr.x);
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.vx = Math.cos(a) * sp;
        pr.vy = Math.sin(a) * sp;
        if (Math.hypot(p.x - pr.x, p.y - pr.y) < 24) pr.dead = true;
      }
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    if (pr.t > pr.life || Math.hypot(pr.x - p.x, pr.y - p.y) > 1600) pr.dead = true;
    if (pr.dead) continue;
    if (pr.rehit) {
      for (const [k, v] of pr.rehit) {
        const nv = v - dt;
        if (nv <= 0) pr.rehit.delete(k);
        else pr.rehit.set(k, nv);
      }
    }
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      if (Math.hypot(e.x - pr.x, e.y - pr.y) > e.r + pr.r) continue;
      if (pr.rehit) {
        if (pr.rehit.has(e.uid)) continue;
        // pr.rehit (the Map) is only ever created when spec.rehit was set
        // (see spawnPlayerProj in combat.ts), so this is always a number.
        pr.rehit.set(e.uid, pr.eff.rehit!);
      } else {
        if (pr.hit.has(e.uid)) continue;
        pr.hit.add(e.uid);
      }
      hitEnemy(game, e, pr.dmg, pr.ctx, pr.eff);
      spark(game, pr.x, pr.y, pr.color, 5, 120, 0.35);
      if (pr.ctx.basic) gainRage(game, 2);
      if (pr.eff.chainOnHit && !e.dead) chainFrom(game, e, pr.eff.chainOnHit, pr.ctx, pr.x, pr.y);
      if (pr.eff.explode) {
        const ex = pr.eff.explode;
        for (const o of enemiesIn(game, pr.x, pr.y, ex.r)) {
          if (o !== e && !o.dead) hitEnemy(game, o, ex.dmg, pr.ctx, pr.eff, { quiet: true });
        }
        game.fx.push({ kind: 'blast', x: pr.x, y: pr.y, r: ex.r, color: pr.color, t: 0, life: 0.4 });
        shake(game, 3);
        sfx('boom');
      }
      if (!pr.rehit) {
        if (pr.pierce > 0) pr.pierce--;
        else {
          pr.dead = true;
          break;
        }
      }
    }
  }
  game.projectiles = game.projectiles.filter((pr) => !pr.dead);

  // enemy projectiles
  for (const pr of game.enemyProjectiles) {
    pr.t += dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    if (pr.t > 4 || Math.hypot(pr.x - p.x, pr.y - p.y) > 1600) {
      pr.dead = true;
      continue;
    }
    const d = Math.hypot(pr.x - p.x, pr.y - p.y);
    if (d < pr.r + p.r + 4) {
      if (p.iframes > 0 && p.dashT > 0 && !p.dodgeCredited) {
        p.dodgeCredited = true;
        game.bus.emit(EVT.perfectDodge, {});
      } else if (p.iframes <= 0 && p.untargetable <= 0) {
        damagePlayer(game, pr.dmg, pr.x, pr.y);
        pr.dead = true;
      }
    }
  }
  game.enemyProjectiles = game.enemyProjectiles.filter((pr) => !pr.dead);
}
