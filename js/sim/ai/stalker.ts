import { sfx } from '../../audio.js';
import { spark } from '../fx.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface StalkerState {
  stalkT: number;
}

// phase-shifts through ash, reappearing at the player's flank
registerBehavior<StalkerState>('stalker', {
  init: () => ({ stalkT: 3 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    state.stalkT -= dt;
    if (e.state === 'vanish') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const a = game.rng.range(0, Math.PI * 2);
        e.x = p.x + Math.cos(a) * 170;
        e.y = p.y + Math.sin(a) * 170;
        e.state = 'active';
        state.stalkT = game.rng.range(3.5, 5);
        game.fx.push({ kind: 'spawn', x: e.x, y: e.y, r: e.r * 2, color: e.def.glow, t: 0, life: 0.5 });
        sfx('blink');
      }
      return;
    }
    if (state.stalkT <= 0 && t.dist > 130) {
      e.state = 'vanish';
      e.stateT = 0.9;
      spark(game, e.x, e.y, e.def.glow, 8, 120);
      sfx('blink');
    } else if (!t.rooted) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);
  },
});
