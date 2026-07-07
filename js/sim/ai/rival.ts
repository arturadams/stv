import { sfx } from '../../audio.js';
import { colorOf } from '../../world.js';
import { damagePlayer } from '../combat.js';
import { shake } from '../fx.js';
import type { EnemyState } from '../../data/types.js';
import type { GameState } from '../types.js';
import { touchAttack } from './index.js';

// ═══ rival duel AI — readable, telegraphed, no one-shot chaos ═══
export function updateRivalDuel(
  game: GameState,
  e: EnemyState,
  dt: number,
  dist: number,
  ux: number,
  uy: number,
  spd: number,
  rooted: boolean,
): void {
  const p = game.player;
  const cls = e.cls || 'mage';
  const band = cls === 'warrior' ? [120, 220] : cls === 'rogue' ? [200, 320] : [260, 400];

  // movement: hold the distance band, strafe
  e.strafeT -= dt;
  if (e.strafeT <= 0) {
    e.strafeT = game.rng.range(1, 2.2);
    e.strafeDir = game.rng.chance(0.5) ? -1 : 1;
  }
  if (!rooted && !e.casting) {
    if (dist > band[1]) {
      e.x += ux * spd * dt;
      e.y += uy * spd * dt;
    } else if (dist < band[0]) {
      e.x -= ux * spd * 0.9 * dt;
      e.y -= uy * spd * 0.9 * dt;
    }
    e.x += -uy * spd * 0.55 * e.strafeDir * dt;
    e.y += ux * spd * 0.55 * e.strafeDir * dt;
  }

  // featured-card cast: a big visible channel with a telegraph
  e.castT -= dt;
  if (e.casting) {
    e.casting.t += dt;
    if (e.casting.t >= e.casting.dur) e.casting = null;
  } else if (e.castT <= 0) {
    e.castT = game.rng.range(6.5, 9);
    const spells = (e.featured || []).filter((d) => d.cat === 'Spell' || d.cat === 'Power');
    const card = spells.length ? game.rng.pick(spells) : null;
    const castDur = 1.8;
    e.casting = { def: card, t: 0, dur: castDur };
    const tx = p.x;
    const ty = p.y;
    const color = card ? colorOf(card) : e.def.glow;
    game.telegraphs.push({
      shape: 'circle', x: tx, y: ty, r: 135, t: 0, dur: castDur, color,
      onDone: (g) => {
        if (Math.hypot(g.player.x - tx, g.player.y - ty) < 135 + g.player.r) damagePlayer(g, 20, tx, ty);
        g.fx.push({ kind: 'blast', x: tx, y: ty, r: 135, color, t: 0, life: 0.5 });
        shake(g, 8);
        sfx('boom');
      },
    });
    sfx('tel');
    return;
  }

  // basic attacks per class — readable projectile speeds
  e.attackT -= dt;
  if (e.attackT <= 0 && !e.casting) {
    if (cls === 'warrior') {
      if (dist < 170) {
        e.attackT = 1.5;
        const ex = e.x;
        const ey = e.y;
        const ang = Math.atan2(p.y - ey, p.x - ex);
        game.telegraphs.push({
          shape: 'circle', x: ex + Math.cos(ang) * 90, y: ey + Math.sin(ang) * 90, r: 90, t: 0, dur: 0.55, color: e.def.glow,
          onDone: (g) => {
            const hx = ex + Math.cos(ang) * 90;
            const hy = ey + Math.sin(ang) * 90;
            if (Math.hypot(g.player.x - hx, g.player.y - hy) < 90 + g.player.r) damagePlayer(g, 14, hx, hy);
            g.fx.push({ kind: 'arc', x: ex, y: ey, ang, arc: 1.6, range: 150, color: e.def.glow, t: 0, life: 0.25 });
            sfx('slash');
          },
        });
      } else e.attackT = 0.4;
    } else {
      e.attackT = cls === 'rogue' ? 1.0 : 1.4;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const speed = cls === 'rogue' ? 420 : 310;
      game.enemyProjectiles.push({
        x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: cls === 'rogue' ? 6 : 9, dmg: cls === 'rogue' ? 8 : 11, color: e.def.glow, t: 0,
      });
      sfx('efire');
    }
  }
  touchAttack(game, e, dist, dt);
}
