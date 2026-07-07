import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { registerBehavior } from './registry.js';

interface MortarState {
  fireT: number;
}

// artillery: lobs telegraphed magma at your feet; backs off if crowded
registerBehavior<MortarState>('mortar', {
  init: (e, game) => ({ fireT: 1 + game.rng.float() }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (!t.rooted && t.dist < 180) {
      e.x -= t.ux * t.spd * dt;
      e.y -= t.uy * t.spd * dt;
    }
    state.fireT -= dt;
    if (state.fireT <= 0 && t.dist < e.def.range!) {
      state.fireT = e.def.fireRate!;
      const tx = p.x + game.rng.range(-40, 40);
      const ty = p.y + game.rng.range(-40, 40);
      const def = e.def;
      game.telegraphs.push({
        shape: 'circle', x: tx, y: ty, r: def.mortarR!, t: 0, dur: def.mortarTel!, color: def.glow,
        onDone: (g) => {
          if (Math.hypot(g.player.x - tx, g.player.y - ty) < def.mortarR! + g.player.r) damagePlayer(g, def.dmg, tx, ty);
          g.fx.push({ kind: 'blast', x: tx, y: ty, r: def.mortarR!, color: def.glow, t: 0, life: 0.5 });
          sfx('boom');
        },
      });
      sfx('tel');
    }
  },
});
