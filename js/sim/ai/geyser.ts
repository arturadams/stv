import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { leadPoint } from './aim.js';
import { registerBehavior } from './registry.js';

interface GeyserState {
  ventT: number;
  awake: boolean;
}

// the brimstone vent: a buried polyp that cracks the crust in a marching line
// of eruptions toward where you're heading — walk sideways, not away.
registerBehavior<GeyserState>('geyser', {
  init: (e, game) => ({ ventT: 1.2 + game.rng.float() * 1.5, awake: false }),
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
    if (t.dist > def.range! * 1.5) state.awake = false;

    state.ventT -= dt;
    if (state.ventT > 0) return;
    state.ventT = def.ventEvery!;

    // fissure: a chain of eruptions from the vent toward the player's lead
    const aim = leadPoint(t.p, 0.9);
    const dx = aim.x - e.x;
    const dy = aim.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const steps = 5;
    const spacing = Math.min(len / steps + 30, 110);
    for (let i = 1; i <= steps; i++) {
      const x = e.x + ux * spacing * i;
      const y = e.y + uy * spacing * i;
      const r = def.ventR! * (i === steps ? 1.45 : 1);
      const dmg = def.ventDmg!;
      game.telegraphs.push({
        shape: 'circle', x, y, r, t: 0, dur: 0.55 + i * 0.16, color: def.glow,
        onDone: (g) => {
          if (Math.hypot(g.player.x - x, g.player.y - y) < r + g.player.r) damagePlayer(g, dmg, x, y);
          g.fx.push({ kind: 'blast', x, y, r, color: def.glow, t: 0, life: 0.4 });
          sfx('boom');
        },
      });
    }
    sfx('tel');
  },
});
