import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake } from '../fx.js';
import type { Vec2 } from '../types.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface LungeState {
  cd: number;
  dir: Vec2 | null;
  chainLeft: number;
  waveCd: number;
  summonCd: number;
}

registerBehavior<LungeState>('lunge', {
  init: (e) => ({
    cd: 1.5, dir: null, chainLeft: 0, waveCd: e.def.waveEvery || 0, summonCd: e.def.summonEvery || 0,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    const { dist, ux, uy, spd, rooted } = t;

    // elites that call reinforcements
    if (e.def.summonEvery) {
      state.summonCd -= dt;
      if (state.summonCd <= 0 && dist < 600) {
        state.summonCd = e.def.summonEvery;
        for (let i = 0; i < 2; i++) {
          const a = game.rng.range(0, Math.PI * 2);
          spawnEnemy(game, e.def.summonId || 'wisp', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60);
        }
        sfx('summon');
      }
    }

    state.cd -= dt;
    if (e.state === 'telegraph') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'lunging';
        e.stateT = 0.35;
        sfx('lunge');
      }
      return;
    }
    if (e.state === 'lunging') {
      e.stateT -= dt;
      const dir = state.dir!;
      e.x += dir.x * e.def.lungeSpeed! * dt;
      e.y += dir.y * e.def.lungeSpeed! * dt;
      if (dist < e.r + p.r + 6) damagePlayer(game, e.def.dmg, e.x, e.y);
      if (e.stateT <= 0) {
        // World II knights chain a second lunge before resting
        if (state.chainLeft > 0) {
          state.chainLeft -= 1;
          e.state = 'telegraph';
          e.stateT = 0.35;
          const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
          state.dir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
          sfx('tel');
        } else {
          e.state = 'active';
          state.cd = 2.2;
        }
      }
      return;
    }
    // elite shockwave
    if (e.def.waveEvery) {
      state.waveCd -= dt;
      if (state.waveCd <= 0 && dist < e.def.waveR! * 1.5) {
        state.waveCd = e.def.waveEvery;
        const ex = e.x;
        const ey = e.y;
        game.telegraphs.push({
          shape: 'circle', x: ex, y: ey, r: e.def.waveR!, t: 0, dur: e.def.waveTel!, color: e.def.glow,
          onDone: (g) => {
            if (Math.hypot(g.player.x - ex, g.player.y - ey) < e.def.waveR! + g.player.r) damagePlayer(g, e.def.waveDmg!, ex, ey);
            g.fx.push({ kind: 'blast', x: ex, y: ey, r: e.def.waveR!, color: e.def.glow, t: 0, life: 0.5 });
            shake(g, 9);
            sfx('boom');
          },
        });
        sfx('fuse');
      }
    }
    if (!rooted) {
      if (dist < e.def.lungeRange! && state.cd <= 0) {
        e.state = 'telegraph';
        e.stateT = e.def.lungeTel!;
        state.chainLeft = e.def.lungeChain || 0;
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        state.dir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
        sfx('tel');
      } else {
        e.x += ux * spd * dt;
        e.y += uy * spd * dt;
      }
    }
    touchAttack(game, e, dist, dt);
  },
});
