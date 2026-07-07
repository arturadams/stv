import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

registerBehavior<undefined>('chase', {
  update: (game, e, dt, t) => {
    if (!t.rooted) {
      e.x += (t.ux * t.spd + Math.cos(e.wobble) * 22) * dt;
      e.y += (t.uy * t.spd + Math.sin(e.wobble * 1.3) * 22) * dt;
    }
    touchAttack(game, e, t.dist, dt);
  },
});
