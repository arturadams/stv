import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { shake } from '../fx.js';
import type { Vec2 } from '../types.js';
import { interceptPoint, leadPoint } from './aim.js';
import { strikeBeam, strikeCircle, strikeRing } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';
import { pullPlayer } from './tide.js';

interface RegentState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
  dir: Vec2 | null;
  rushT: number;
  trailD: number;
  hit: boolean;
  poolAt: Vec2 | null;
  poolT: number;
}

const REGENT_ATTACKS = ['tidewall', 'whirlpool', 'riptide'] as const;
const RUSH_SPEED = 560;
const RUSH_DIST = 620;

// ═══ boss: The Undertow Regent ═══ not a ruler of the tide — the tide,
// crowned. Walls of water march across the ballroom with one gap apiece,
// whirlpools drink the floor out from under you, and when it rushes, the
// marble is left slick with brine. Find the gap early: they never line up.
registerBehavior<RegentState>('boss_regent', {
  init: () => ({
    phase: 1, attackT: 2.6, attackIdx: 0, dir: null, rushT: 0,
    trailD: 0, hit: false, poolAt: null, poolT: 0,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE TIDE TURNS', sub: 'The Regent stops pretending the floor is yours', t: 2.2 };
      shake(game, 14);
      sfx('bossphase');
    }

    // an open whirlpool keeps drinking while its strike winds up
    if (state.poolT > 0 && state.poolAt) {
      state.poolT -= dt;
      pullPlayer(game, state.poolAt.x, state.poolAt.y, 230, dt);
      if (state.poolT <= 0) {
        dropHazard(game, state.poolAt.x, state.poolAt.y, 52, 6, 4, '#4a90d9', 'brine');
        state.poolAt = null;
      }
    }

    if (e.state === 'telegraph') {
      e.stateT -= dt;
      shake(game, 1);
      if (e.stateT <= 0) {
        e.state = 'lunging';
        state.rushT = RUSH_DIST / RUSH_SPEED;
        state.hit = false;
        state.trailD = 0;
        sfx('lunge');
      }
      return;
    }
    if (e.state === 'lunging') {
      const dir = state.dir!;
      const step = RUSH_SPEED * dt;
      e.x += dir.x * step;
      e.y += dir.y * step;
      state.trailD += step;
      if (state.trailD > 46) {
        state.trailD = 0;
        dropHazard(game, e.x - dir.x * 24, e.y - dir.y * 24, 50, 6, 4, '#4a90d9', 'brine');
      }
      if (!state.hit && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 8) {
        state.hit = true;
        damagePlayer(game, e.def.dmg, e.x, e.y);
      }
      state.rushT -= dt;
      if (state.rushT <= 0) {
        e.state = 'active';
        strikeRing(game, e.x, e.y, 180, 64, { dmg: 16, dur: 0.9, color: '#4a90d9' });
        shake(game, 10);
        sfx('slam');
      }
      return;
    }

    // it wades — slow, certain, displacing everything
    if (t.dist > 150) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.3 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.4 : 4.4;
    const atk = REGENT_ATTACKS[state.attackIdx % REGENT_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'tidewall') {
      // walls of water march over the player's line, one gap apiece
      const rows = state.phase === 2 ? 4 : 3;
      const adv = Math.atan2(p.y - e.y, p.x - e.x);
      const axis = adv + Math.PI / 2;
      const w = 950;
      const gapW = 170;
      for (let i = 0; i < rows; i++) {
        const d = t.dist * 0.55 + i * 190;
        const cx = e.x + Math.cos(adv) * d;
        const cy = e.y + Math.sin(adv) * d;
        const gapOff = game.rng.range(-w * 0.3, w * 0.3);
        const dur = 1.0 + i * 0.4;
        const spans: Array<[number, number]> = [[-w / 2, gapOff - gapW / 2], [gapOff + gapW / 2, w / 2]];
        for (const [s0, s1] of spans) {
          const len = s1 - s0;
          if (len <= 0) continue;
          const mid = (s0 + s1) / 2;
          strikeBeam(game, cx + Math.cos(axis) * mid, cy + Math.sin(axis) * mid, len, 78, axis,
            { dmg: 18, dur, color: '#4a90d9' });
        }
      }
      sfx('fuse');
    } else if (atk === 'whirlpool') {
      // the floor drinks: a vortex opens under your stride and pulls while
      // the strike winds up — brine remains where it drank
      const aim = leadPoint(p, 0.7);
      state.poolAt = { x: aim.x, y: aim.y };
      state.poolT = 1.5;
      game.telegraphs.push({
        shape: 'ring', x: aim.x, y: aim.y, r: 230, band: 22, t: 0, dur: 1.5,
        color: '#4a90d9', decorative: true,
      });
      strikeCircle(game, aim.x, aim.y, 120, { dmg: 20, dur: 1.5, color: '#4a90d9' });
      if (state.phase === 2) {
        const off = game.rng.range(0, Math.PI * 2);
        strikeCircle(game, aim.x + Math.cos(off) * 260, aim.y + Math.sin(off) * 260, 110,
          { dmg: 18, dur: 1.9, color: '#4a90d9' });
      }
      sfx('tel');
    } else {
      // riptide: it rushes the intercept of your stride, brine in its wake
      const aim = interceptPoint(p, e.x, e.y, RUSH_SPEED);
      const d = Math.hypot(aim.x - e.x, aim.y - e.y) || 1;
      state.dir = { x: (aim.x - e.x) / d, y: (aim.y - e.y) / d };
      e.state = 'telegraph';
      e.stateT = state.phase === 2 ? 0.75 : 0.95;
      game.telegraphs.push({
        shape: 'rect', x: e.x + state.dir.x * RUSH_DIST / 2, y: e.y + state.dir.y * RUSH_DIST / 2,
        w: RUSH_DIST + e.r * 2, h: e.r * 2.5, ang: Math.atan2(state.dir.y, state.dir.x),
        t: 0, dur: e.stateT, color: '#4a90d9', decorative: true,
      });
      sfx('tel');
    }
  },
});
