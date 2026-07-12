import { sfx } from '../../audio.js';
import { dropHazard } from '../entities/hazards.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';
import { pullPlayer } from './tide.js';

interface UndertowState {
  awake: boolean;
  cd: number;
  vortexT: number;
}

// the undertow maw: a mouth in the floor where the sea still remembers how to
// swallow. When it yawns, the whole court tilts toward it — and everything
// the current delivers, it keeps. Its teeth are where the pull ends.
registerBehavior<UndertowState>('undertow', {
  init: (e, game) => ({ awake: false, cd: e.def.pullEvery! * (0.3 + game.rng.float() * 0.4), vortexT: 0 }),
  update: (game, e, dt, t, state) => {
    const def = e.def;
    if (!state.awake) {
      if (t.dist < def.range!) {
        state.awake = true;
        game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r * 2.4, color: def.glow, t: 0, life: 0.5 });
        sfx('fuse');
      }
      return;
    }
    if (t.dist > def.range! * 1.5) {
      state.awake = false;
      return;
    }

    if (state.vortexT > 0) {
      state.vortexT -= dt;
      if (t.dist < def.pullR!) pullPlayer(game, e.x, e.y, def.pullForce!, dt);
      if (game.rng.chance(dt * 6)) {
        game.fx.push({
          kind: 'ring', x: e.x, y: e.y,
          r: def.pullR! * (0.4 + game.rng.float() * 0.6), color: def.glow, t: 0, life: 0.35,
        });
      }
      if (state.vortexT <= 0) {
        // the maw snaps shut on whatever the current delivered
        dropHazard(game, e.x, e.y, def.pullR! * 0.35, 5, 3.5, def.glow, 'brine');
        game.fx.push({ kind: 'blast', x: e.x, y: e.y, r: e.r * 2.2, color: def.glow, t: 0, life: 0.5 });
        sfx('boom');
      }
    } else {
      state.cd -= dt;
      if (state.cd <= 0) {
        state.cd = def.pullEvery!;
        state.vortexT = 2.6;
        game.telegraphs.push({
          shape: 'ring', x: e.x, y: e.y, r: def.pullR!, band: 26, t: 0, dur: 0.8,
          color: def.glow, decorative: true,
        });
        sfx('tel');
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
