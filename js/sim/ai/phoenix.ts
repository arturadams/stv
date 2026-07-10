import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { shake, spark } from '../fx.js';
import type { Vec2 } from '../types.js';
import { interceptPoint, leadPoint } from './aim.js';
import { strikeCircle, strikeRing } from './bossKit.js';
import { registerBehavior } from './registry.js';

export interface PhoenixState {
  phase: 1 | 2;
  reborn: boolean;
  eggT: number;
  attackT: number;
  attackIdx: number;
  orbitDir: 1 | -1;
  dir: Vec2 | null;
  diveT: number;
  hit: boolean;
  trailD: number;
}

const PHX_ATTACKS = ['dive', 'volley', 'immolate'] as const;
const DIVE_SPEED = 880;
const DIVE_DIST = 760;

// ═══ boss: The Pyre Matriarch ═══ the last phoenix, gone to ash and spite.
// She never stands where you can trade — she wheels around you and dives
// through where your feet are taking you. Burn her down twice: the first
// death is just her moult.
registerBehavior<PhoenixState>('boss_phoenix', {
  init: (e, game) => ({
    phase: 1, reborn: false, eggT: 0, attackT: 2.0, attackIdx: 0,
    orbitDir: game.rng.chance(0.5) ? 1 : -1, dir: null, diveT: 0, hit: false, trailD: 0,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;

    // the moult: burn to ash once, hatch hotter
    if (!state.reborn && state.eggT <= 0 && e.hp < e.maxHp * 0.25) {
      state.reborn = true;
      state.phase = 2;
      state.eggT = 2.6;
      e.state = 'vanish';
      e.stateT = 2.6;
      game.banner = { title: 'FROM ASH, AGAIN', sub: 'The Matriarch folds into her ember shell', t: 2.4 };
      strikeRing(game, e.x, e.y, 210, 90, { dmg: 22, dur: 2.5, color: '#ffb347' });
      spark(game, e.x, e.y, '#ffb347', 26, 200, 0.8);
      sfx('bossphase');
    }
    if (state.eggT > 0) {
      state.eggT -= dt;
      e.stateT = Math.max(e.stateT, 0.1);
      if (state.eggT <= 0) {
        e.state = 'active';
        e.hp = Math.round(e.maxHp * 0.5);
        game.fx.push({ kind: 'blast', x: e.x, y: e.y, r: 240, color: '#ffb347', t: 0, life: 0.6 });
        if (Math.hypot(p.x - e.x, p.y - e.y) < 240 + p.r) damagePlayer(game, 20, e.x, e.y);
        shake(game, 13);
        game.banner = { title: 'REBORN IN SPITE', sub: 'Her fire has learned your gait', t: 2.0 };
        sfx('bossintro');
      }
      return;
    }

    if (e.state === 'lunging') {
      // mid-dive: a burning line stitched across the court
      const dir = state.dir!;
      const step = DIVE_SPEED * dt;
      e.x += dir.x * step;
      e.y += dir.y * step;
      state.trailD += step;
      if (state.trailD > 42) {
        state.trailD = 0;
        dropHazard(game, e.x - dir.x * 22, e.y - dir.y * 22,
          state.phase === 2 ? 52 : 40, 7, 3.2, '#ffb347');
      }
      if (!state.hit && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 6) {
        state.hit = true;
        damagePlayer(game, e.def.dmg, e.x, e.y);
      }
      state.diveT -= dt;
      if (state.diveT <= 0) {
        e.state = 'active';
        sfx('wave');
      }
      return;
    }
    if (e.state === 'telegraph') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'lunging';
        state.diveT = DIVE_DIST / DIVE_SPEED;
        state.hit = false;
        state.trailD = 0;
        sfx('lunge');
      }
      return;
    }

    // wheel around the player just outside comfortable range
    const orbitR = 330;
    const err = t.dist - orbitR;
    e.x += (t.ux * err * 1.6 + -t.uy * t.spd * state.orbitDir) * dt;
    e.y += (t.uy * err * 1.6 + t.ux * t.spd * state.orbitDir) * dt;
    if (game.rng.chance(dt * 0.15)) state.orbitDir = state.orbitDir === 1 ? -1 : 1;

    state.attackT -= dt * (state.phase === 2 ? 1.35 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 2.6 : 3.4;
    const atk = PHX_ATTACKS[state.attackIdx % PHX_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'dive') {
      // dive through the intercept of the player's stride, overshooting past
      const aim = interceptPoint(p, e.x, e.y, DIVE_SPEED);
      const d = Math.hypot(aim.x - e.x, aim.y - e.y) || 1;
      state.dir = { x: (aim.x - e.x) / d, y: (aim.y - e.y) / d };
      e.state = 'telegraph';
      e.stateT = state.phase === 2 ? 0.7 : 0.9;
      game.telegraphs.push({
        shape: 'rect', x: e.x + state.dir.x * DIVE_DIST / 2, y: e.y + state.dir.y * DIVE_DIST / 2,
        w: DIVE_DIST + e.r * 2, h: e.r * 2.4, ang: Math.atan2(state.dir.y, state.dir.x),
        t: 0, dur: e.stateT, color: '#ffb347', decorative: true,
      });
      sfx('tel');
    } else if (atk === 'volley') {
      // cinder feathers, every one aimed at the intercept, fanned wide
      const speed = 340;
      const aim = interceptPoint(p, e.x, e.y, speed);
      const base = Math.atan2(aim.y - e.y, aim.x - e.x);
      const n = state.phase === 2 ? 9 : 7;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.14;
        game.enemyProjectiles.push({
          x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          r: 6, dmg: 10, color: '#ffb347', t: 0,
        });
      }
      sfx('efire');
    } else {
      // immolation: a broken circle of pyres around where you're headed —
      // one gap, and the centre lights last
      const aim = leadPoint(p, 0.8);
      const gap = game.rng.int(8);
      const base = game.rng.range(0, Math.PI * 2);
      for (let i = 0; i < 8; i++) {
        if (i === gap) continue;
        const a = base + (i / 8) * Math.PI * 2;
        strikeCircle(game, aim.x + Math.cos(a) * 185, aim.y + Math.sin(a) * 185, 78,
          { dmg: 15, dur: 1.35, color: '#ff8a4a' });
      }
      strikeCircle(game, aim.x, aim.y, 95, { dmg: 15, dur: 1.75, color: '#ff8a4a' });
      sfx('fuse');
    }
  },
});
