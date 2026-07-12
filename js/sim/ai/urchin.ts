import { sfx } from '../../audio.js';
import { registerBehavior } from './registry.js';

interface UrchinState {
  volleyT: number;
  baseAng: number;
}

// the reef urchin: coral that grew over something the court dropped. It never
// moves — the space around it is simply, periodically, full of spines. The
// gaps between spines rotate a little each volley: walk with them, not away.
registerBehavior<UrchinState>('urchin', {
  init: (e, game) => ({
    volleyT: e.def.volleyEvery! * (0.3 + game.rng.float() * 0.5),
    baseAng: game.rng.range(0, Math.PI * 2),
  }),
  update: (game, e, dt, t, state) => {
    const def = e.def;
    if (t.dist > def.range!) return;
    state.volleyT -= dt;
    if (state.volleyT > 0) return;
    state.volleyT = def.volleyEvery!;
    state.baseAng += 0.35;
    const n = def.volleyCount!;
    for (let i = 0; i < n; i++) {
      const a = state.baseAng + (i / n) * Math.PI * 2;
      game.enemyProjectiles.push({
        x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
        vx: Math.cos(a) * def.projSpeed!, vy: Math.sin(a) * def.projSpeed!,
        r: 5, dmg: def.dmg, color: def.glow, t: 0,
      });
    }
    game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r * 1.8, color: def.glow, t: 0, life: 0.4 });
    sfx('efire');
  },
});
