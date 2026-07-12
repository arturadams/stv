import { sfx } from '../../audio.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface RangedState {
  fireT: number;
}

registerBehavior<RangedState>('ranged', {
  init: (e, game) => ({ fireT: 1 + game.rng.float() }),
  update: (game, e, dt, t, state) => {
    const { dist, ux, uy, spd, rooted } = t;
    if (!rooted) {
      if (dist > e.def.range!) {
        e.x += ux * spd * dt;
        e.y += uy * spd * dt;
      } else if (dist < e.def.range! * 0.6) {
        e.x -= ux * spd * dt;
        e.y -= uy * spd * dt;
      } else {
        e.x += -uy * spd * 0.6 * dt;
        e.y += ux * spd * 0.6 * dt;
      }
    }
    state.fireT -= dt;
    if (state.fireT <= 0 && dist < e.def.range! * 1.25) {
      state.fireT = e.def.fireRate!;
      const a = Math.atan2(uy, ux);
      game.enemyProjectiles.push({
        x: e.x, y: e.y, vx: Math.cos(a) * e.def.projSpeed!, vy: Math.sin(a) * e.def.projSpeed!,
        r: 7, dmg: e.def.dmg, color: e.def.glow, t: 0,
      });
      sfx('efire');
    }
    touchAttack(game, e, dist, dt);
  },
});
