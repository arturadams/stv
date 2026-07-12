import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { shake, spark } from '../fx.js';
import type { GameState, Vec2 } from '../types.js';
import { interceptPoint, leadPoint } from './aim.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

export interface LeviathanState {
  phase: 1 | 2;
  mode: 'surfaced' | 'diving';
  modeT: number;
  fireT: number;
  breachesLeft: number;
  target: Vec2 | null;
  // trailing spine positions, oldest last — render reads these
  segs: Vec2[];
}

const SURFACE_TIME = 5.2;
const BREACH_R = 150;

function beginDive(game: GameState, e: Vec2, state: LeviathanState): void {
  state.mode = 'diving';
  state.modeT = 1.15;
  spark(game, e.x, e.y, '#5fa8ff', 14, 160, 0.5);
  sfx('blink');
}

// ═══ boss: The Ink Leviathan ═══ a serpent of drowned ink that swims beneath
// the tiles. It breaches where you are GOING — its telegraph is a promise
// about your own momentum. Phase 2 chains three breaches before it surfaces.
registerBehavior<LeviathanState>('boss_leviathan', {
  init: (e) => ({
    phase: 1, mode: 'surfaced', modeT: 3.5, fireT: 1.6, breachesLeft: 0,
    target: null, segs: Array.from({ length: 9 }, () => ({ x: e.x, y: e.y })),
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE DEEP STIRS', sub: 'The Leviathan hunts in long arcs beneath the floor', t: 2.2 };
      shake(game, 12);
      sfx('bossphase');
    }

    // spine follow-through: each segment eases toward the one ahead of it
    let ahead: Vec2 = e;
    for (const s of state.segs) {
      s.x += (ahead.x - s.x) * Math.min(1, dt * 9);
      s.y += (ahead.y - s.y) * Math.min(1, dt * 9);
      ahead = s;
    }

    if (state.mode === 'diving') {
      // untargetable beneath the tiles, gliding toward the marked breach
      e.state = 'vanish';
      e.stateT = 1;
      if (state.target) {
        const d = Math.hypot(state.target.x - e.x, state.target.y - e.y) || 1;
        const step = Math.min(d, t.spd * 1.6 * dt);
        e.x += (state.target.x - e.x) / d * step;
        e.y += (state.target.y - e.y) / d * step;
      }
      state.modeT -= dt;
      if (state.modeT > 0) return;

      if (state.target === null) {
        // mark the next breach at the player's predicted position
        const lead = state.phase === 2 ? 1.0 : 1.2;
        const aim = leadPoint(p, lead);
        const bx = aim.x;
        const by = aim.y;
        state.target = { x: bx, y: by };
        state.modeT = 1.05;
        game.telegraphs.push({
          shape: 'circle', x: bx, y: by, r: BREACH_R, t: 0, dur: 1.05, color: '#5fa8ff',
          onDone: (g) => {
            if (Math.hypot(g.player.x - bx, g.player.y - by) < BREACH_R + g.player.r) damagePlayer(g, 22, bx, by);
            g.fx.push({ kind: 'blast', x: bx, y: by, r: BREACH_R, color: '#5fa8ff', t: 0, life: 0.5 });
            shake(g, 9);
            sfx('boom');
          },
        });
        sfx('tel');
        return;
      }

      // the breach just resolved — erupt here, leave ink, maybe chain
      e.x = state.target.x;
      e.y = state.target.y;
      dropHazard(game, e.x, e.y, 105, 6, 4.5, '#3a4a80', 'ink');
      state.target = null;
      if (state.breachesLeft > 0) {
        state.breachesLeft--;
        state.modeT = 0.15;
      } else {
        state.mode = 'surfaced';
        state.modeT = SURFACE_TIME;
        state.fireT = 0.9;
        e.state = 'active';
        game.fx.push({ kind: 'spawn', x: e.x, y: e.y, r: e.r * 2.5, color: '#5fa8ff', t: 0, life: 0.6 });
        sfx('wave');
      }
      return;
    }

    // surfaced: heavy, slow drift + fans of intercept-aimed ink bolts
    if (t.dist > 140) {
      e.x += t.ux * t.spd * 0.22 * dt;
      e.y += t.uy * t.spd * 0.22 * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.fireT -= dt;
    if (state.fireT <= 0) {
      state.fireT = state.phase === 2 ? 1.15 : 1.5;
      const speed = 300;
      const aim = interceptPoint(p, e.x, e.y, speed);
      const base = Math.atan2(aim.y - e.y, aim.x - e.x);
      const n = state.phase === 2 ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.16;
        game.enemyProjectiles.push({
          x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          r: 7, dmg: 11, color: '#5fa8ff', t: 0,
        });
      }
      sfx('efire');
    }

    state.modeT -= dt;
    if (state.modeT <= 0) {
      state.breachesLeft = state.phase === 2 ? 2 : 0;
      beginDive(game, e, state);
    }
  },
});
