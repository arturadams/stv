import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';
import { pullPlayer } from './tide.js';

interface SirenState {
  songCd: number;
  songT: number;
  pulseT: number;
}

// the court siren: she does not chase — she asks you to come to her, and the
// water agrees. Her song drags you across the marble toward whatever else the
// court has laid out. Dash to cut the current, or kill her to end the verse.
registerBehavior<SirenState>('siren', {
  init: (e, game) => ({ songCd: e.def.pullEvery! * (0.4 + game.rng.float() * 0.4), songT: 0, pulseT: 0 }),
  update: (game, e, dt, t, state) => {
    const def = e.def;
    // she drifts at the hem of her own song, never closing herself
    if (!t.rooted && state.songT <= 0) {
      if (t.dist < def.pullR! * 0.55) {
        e.x -= t.ux * t.spd * dt;
        e.y -= t.uy * t.spd * dt;
      } else if (t.dist > def.pullR! * 0.95) {
        e.x += t.ux * t.spd * dt;
        e.y += t.uy * t.spd * dt;
      } else {
        e.x += -t.uy * t.spd * 0.5 * dt;
        e.y += t.ux * t.spd * 0.5 * dt;
      }
    }

    if (state.songT > 0) {
      state.songT -= dt;
      if (t.dist < def.pullR!) pullPlayer(game, e.x, e.y, def.pullForce!, dt);
      state.pulseT -= dt;
      if (state.pulseT <= 0) {
        state.pulseT = 0.45;
        game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: def.pullR!, color: def.glow, t: 0, life: 0.45 });
      }
    } else {
      state.songCd -= dt;
      if (state.songCd <= 0 && t.dist < def.pullR! * 1.1) {
        state.songCd = def.pullEvery!;
        state.songT = 2.2;
        state.pulseT = 0;
        floater(game, e.x, e.y - e.r - 12, '♫', def.glow, 14);
        sfx('enchant');
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
