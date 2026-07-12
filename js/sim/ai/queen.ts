import { sfx } from '../../audio.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake } from '../fx.js';
import { leadPoint } from './aim.js';
import { strikeBeam, strikeCircle, strikeRing } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';
import { pullPlayer } from './tide.js';

interface QueenState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
  orbitDir: 1 | -1;
  curtsyT: number;
}

const QUEEN_ATTACKS = ['pavane', 'fan', 'curtsy', 'court'] as const;

// ═══ boss: The Sunless Queen ═══ the ballroom's last hostess. She fights in
// figures — checkerboard pavanes you step through on the off-beat, her gown
// opening in fans of cold light — and when she curtsies, the whole court
// leans toward her. The dance has one rule: never stand where a step ended.
registerBehavior<QueenState>('boss_queen', {
  init: (e, game) => ({
    phase: 1, attackT: 2.2, attackIdx: 0,
    orbitDir: game.rng.chance(0.5) ? 1 : -1, curtsyT: 0,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE LAST DANCE', sub: 'The Queen no longer waits for the music', t: 2.2 };
      shake(game, 12);
      sfx('bossphase');
    }

    if (state.curtsyT > 0) {
      // mid-curtsy she is still; the court is not
      state.curtsyT -= dt;
      pullPlayer(game, e.x, e.y, 240, dt);
    } else {
      // a stately waltz around the player
      const orbitR = 300;
      const err = t.dist - orbitR;
      e.x += (t.ux * err * 1.2 + -t.uy * t.spd * state.orbitDir) * dt;
      e.y += (t.uy * err * 1.2 + t.ux * t.spd * state.orbitDir) * dt;
      if (game.rng.chance(dt * 0.12)) state.orbitDir = state.orbitDir === 1 ? -1 : 1;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.35 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.0 : 3.8;
    const atk = QUEEN_ATTACKS[state.attackIdx % QUEEN_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'pavane') {
      // the pavane: two interleaved checkerboards of steps — the safe tile
      // now is the struck tile next. Move on the off-beat.
      const grid = state.phase === 2 ? 5 : 4;
      const spacing = 150;
      const aim = leadPoint(p, 0.6);
      const half = (grid - 1) / 2;
      for (let i = 0; i < grid; i++) {
        for (let j = 0; j < grid; j++) {
          const x = aim.x + (i - half) * spacing;
          const y = aim.y + (j - half) * spacing;
          const beat = (i + j) % 2 === 0 ? 1.0 : 1.75;
          strikeCircle(game, x, y, 64, { dmg: 15, dur: beat, color: '#7ee8d0' });
        }
      }
      sfx('fuse');
    } else if (atk === 'fan') {
      // her gown opens: blades of cold light sweep out one by one
      const n = state.phase === 2 ? 6 : 5;
      const base = Math.atan2(p.y - e.y, p.x - e.x);
      const w = 560;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.38;
        strikeBeam(game, e.x + Math.cos(a) * w * 0.5, e.y + Math.sin(a) * w * 0.5, w, 64, a,
          { dmg: 18, dur: 0.85 + i * 0.14, color: '#e6e0f2' });
      }
      sfx('tel');
    } else if (atk === 'curtsy') {
      // she curtsies and the court leans in: the current drags you toward
      // her while her hem becomes a closing ring — dash out, or drown in silk
      state.curtsyT = 1.6;
      strikeRing(game, e.x, e.y, 150, 80, { dmg: 20, dur: 1.6, color: '#c9a0ff' });
      game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 360, color: '#c9a0ff', t: 0, life: 0.8 });
      sfx('enchant');
    } else {
      // the court answers its queen
      const n = state.phase === 2 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawnEnemy(game, e.def.minion || 'pallid', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80);
      }
      if (state.phase === 2) spawnEnemy(game, 'chorister', e.x, e.y - 90);
      sfx('summon');
    }
  },
});
