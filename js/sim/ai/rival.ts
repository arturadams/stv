import { sfx } from '../../audio.js';
import { colorOf } from '../../world.js';
import { damagePlayer } from '../combat.js';
import { shake } from '../fx.js';
import type { CastingState } from '../../data/types.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface RivalState {
  strafeT: number;
  strafeDir: number;
  castT: number;
  casting: CastingState | null;
  attackT: number;
}

// ═══ rival duel AI — readable, telegraphed, no one-shot chaos ═══
registerBehavior<RivalState>('rival', {
  init: (_e, game) => ({
    strafeT: 0, strafeDir: 1, castT: 5 + game.rng.float() * 3, casting: null, attackT: 1.2,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    const { dist, ux, uy, spd, rooted } = t;
    const cls = e.cls || 'mage';
    const melee = cls === 'warrior' || cls === 'druid';
    const band = cls === 'warrior' ? [120, 220]
      : cls === 'druid' ? [105, 205]
      : cls === 'rogue' ? [200, 320]
      : cls === 'necromancer' ? [240, 370]
      : cls === 'warlock' ? [280, 420]
      : [260, 400];

    // movement: hold the distance band, strafe
    state.strafeT -= dt;
    if (state.strafeT <= 0) {
      state.strafeT = game.rng.range(1, 2.2);
      state.strafeDir = game.rng.chance(0.5) ? -1 : 1;
    }
    if (!rooted && !state.casting) {
      if (dist > band[1]) {
        e.x += ux * spd * dt;
        e.y += uy * spd * dt;
      } else if (dist < band[0]) {
        e.x -= ux * spd * 0.9 * dt;
        e.y -= uy * spd * 0.9 * dt;
      }
      e.x += -uy * spd * 0.55 * state.strafeDir * dt;
      e.y += ux * spd * 0.55 * state.strafeDir * dt;
    }

    // featured-card cast: a big visible channel with a telegraph
    state.castT -= dt;
    if (state.casting) {
      state.casting.t += dt;
      if (state.casting.t >= state.casting.dur) state.casting = null;
    } else if (state.castT <= 0) {
      state.castT = game.rng.range(6.5, 9);
      const spells = (e.featured || []).filter((d) => d.cat === 'Spell' || d.cat === 'Power');
      const card = spells.length ? game.rng.pick(spells) : null;
      const castDur = 1.8;
      state.casting = { def: card, t: 0, dur: castDur };
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
    state.attackT -= dt;
    if (state.attackT <= 0 && !state.casting) {
      if (melee) {
        const reach = cls === 'druid' ? 145 : 170;
        if (dist < reach) {
          state.attackT = cls === 'druid' ? 1.15 : 1.5;
          const ex = e.x;
          const ey = e.y;
          const ang = Math.atan2(p.y - ey, p.x - ex);
          game.telegraphs.push({
            shape: 'circle', x: ex + Math.cos(ang) * 90, y: ey + Math.sin(ang) * 90, r: 90, t: 0, dur: 0.55, color: e.def.glow,
            onDone: (g) => {
              const hx = ex + Math.cos(ang) * 90;
              const hy = ey + Math.sin(ang) * 90;
              const damage = cls === 'druid' ? 11 : 14;
              if (Math.hypot(g.player.x - hx, g.player.y - hy) < 90 + g.player.r) damagePlayer(g, damage, hx, hy);
              g.fx.push({ kind: 'arc', x: ex, y: ey, ang, arc: 1.6, range: 150, color: e.def.glow, t: 0, life: 0.25 });
              sfx('slash');
            },
          });
        } else state.attackT = 0.4;
      } else {
        state.attackT = cls === 'rogue' ? 1.0 : cls === 'necromancer' ? 1.25 : 1.4;
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const speed = cls === 'rogue' ? 420 : cls === 'warlock' ? 340 : 310;
        const radius = cls === 'rogue' ? 6 : cls === 'necromancer' ? 7 : 9;
        const damage = cls === 'rogue' ? 8 : cls === 'warlock' ? 12 : 11;
        game.enemyProjectiles.push({
          x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          r: radius, dmg: damage, color: e.def.glow, t: 0,
        });
        sfx('efire');
      }
    }
    touchAttack(game, e, dist, dt);
  },
});
