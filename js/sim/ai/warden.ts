import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake } from '../fx.js';
import { inRotRect, leadPoint } from './aim.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

export interface WardenState {
  orbAng: number;
  orbCd: number;
  slamCd: number;
  summonCd: number;
}

const ORB_DIST = 74;
const ORB_R = 13;

// the kiln warden: two molten crucibles swing around it on chains — the space
// near it is never safe — and every few seconds it slams a burning cross
// through where you're headed.
registerBehavior<WardenState>('warden', {
  init: (e) => ({ orbAng: 0, orbCd: 0, slamCd: e.def.waveEvery! * 0.6, summonCd: e.def.summonEvery || 0 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    const def = e.def;

    // orbiting crucibles — contact damage on a short personal cooldown
    state.orbAng += dt * 2.4;
    state.orbCd -= dt;
    for (let i = 0; i < 2; i++) {
      const a = state.orbAng + i * Math.PI;
      const ox = e.x + Math.cos(a) * ORB_DIST;
      const oy = e.y + Math.sin(a) * ORB_DIST;
      if (state.orbCd <= 0 && Math.hypot(p.x - ox, p.y - oy) < ORB_R + p.r) {
        state.orbCd = 0.9;
        damagePlayer(game, 12, ox, oy);
      }
    }

    if (def.summonEvery) {
      state.summonCd -= dt;
      if (state.summonCd <= 0 && t.dist < 600) {
        state.summonCd = def.summonEvery;
        for (let i = 0; i < 2; i++) {
          const a = game.rng.range(0, Math.PI * 2);
          spawnEnemy(game, def.summonId || 'imp', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60);
        }
        sfx('summon');
      }
    }

    // the burning cross: four beams through the player's predicted position
    state.slamCd -= dt;
    if (state.slamCd <= 0 && t.dist < def.waveR! * 1.6) {
      state.slamCd = def.waveEvery!;
      const aim = leadPoint(p, 0.8);
      const base = game.rng.range(0, Math.PI);
      for (let i = 0; i < 4; i++) {
        const ang = base + (i / 4) * Math.PI * 2;
        const w = def.waveR!;
        const h = 58;
        const cx = aim.x + Math.cos(ang) * w * 0.5;
        const cy = aim.y + Math.sin(ang) * w * 0.5;
        game.telegraphs.push({
          shape: 'rect', x: cx, y: cy, w, h, ang, t: 0, dur: def.waveTel!, color: def.glow,
          onDone: (g) => {
            if (inRotRect(g.player.x, g.player.y, g.player.r, cx, cy, w, h, ang)) {
              damagePlayer(g, def.waveDmg!, cx, cy);
            }
            g.fx.push({ kind: 'rectblast', x: cx, y: cy, w, h, ang, color: def.glow, t: 0, life: 0.4 });
            shake(g, 6);
            sfx('slam');
          },
        });
      }
      sfx('fuse');
    }

    if (!t.rooted) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);
  },
});
