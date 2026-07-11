import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { shake } from '../fx.js';
import type { Vec2 } from '../types.js';
import { strikeBeam, strikeCircle } from './bossKit.js';
import { makeTrail, sampleTrail, trailAt } from './echo.js';
import type { EchoTrail } from './echo.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface AntiphonState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
  orbitDir: 1 | -1;
  trail: EchoTrail;
  dir: Vec2 | null;
  rushT: number;
  hit: boolean;
  refrainFrom: Vec2 | null;
}

const ANTIPHON_ATTACKS = ['versicle', 'response', 'refrain'] as const;
const RUSH_SPEED = 640;
const RUSH_DIST = 560;

// ═══ boss: The Antiphon ═══ call and answer — you are the call. It fights
// you with your own last few seconds: versicles that replay your steps as
// strikes, responses that land mirrored across its body, and a refrain that
// dashes your line twice — once as itself, once as its own echo. The only
// safe ground is ground you have never used.
registerBehavior<AntiphonState>('boss_antiphon', {
  init: (e, game) => ({
    phase: 1, attackT: 2.2, attackIdx: 0,
    orbitDir: game.rng.chance(0.5) ? 1 : -1,
    trail: makeTrail(), dir: null, rushT: 0, hit: false, refrainFrom: null,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    sampleTrail(state.trail, p, dt);
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'CALL AND ANSWER', sub: 'The Antiphon sings both parts now', t: 2.2 };
      shake(game, 12);
      sfx('bossphase');
    }

    if (e.state === 'telegraph') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'lunging';
        state.rushT = RUSH_DIST / RUSH_SPEED;
        state.hit = false;
        state.refrainFrom = { x: e.x, y: e.y };
        sfx('lunge');
      }
      return;
    }
    if (e.state === 'lunging') {
      const dir = state.dir!;
      const step = RUSH_SPEED * dt;
      e.x += dir.x * step;
      e.y += dir.y * step;
      if (!state.hit && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 8) {
        state.hit = true;
        damagePlayer(game, e.def.dmg, e.x, e.y);
      }
      state.rushT -= dt;
      if (state.rushT <= 0) {
        e.state = 'active';
        // the refrain: the dash line answers itself a beat later
        const from = state.refrainFrom!;
        const ang = Math.atan2(dir.y, dir.x);
        strikeBeam(game, (from.x + e.x) / 2, (from.y + e.y) / 2, RUSH_DIST + e.r * 2, e.r * 2.4, ang,
          { dmg: 18, dur: 0.9, color: '#e6e0f2' });
        shake(game, 8);
        sfx('slam');
      }
      return;
    }

    // it circles like a second voice waiting for its entrance
    const orbitR = 280;
    const err = t.dist - orbitR;
    e.x += (t.ux * err * 1.3 + -t.uy * t.spd * state.orbitDir) * dt;
    e.y += (t.uy * err * 1.3 + t.ux * t.spd * state.orbitDir) * dt;
    if (game.rng.chance(dt * 0.15)) state.orbitDir = state.orbitDir === 1 ? -1 : 1;
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.35 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 2.8 : 3.6;
    const atk = ANTIPHON_ATTACKS[state.attackIdx % ANTIPHON_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'versicle') {
      // your last two seconds, sung back as strikes — oldest lands first,
      // so the echo chases you up your own footprints
      const n = state.phase === 2 ? 7 : 5;
      let stamped = 0;
      for (let i = 0; i < n; i++) {
        const at = trailAt(state.trail, 2.0 - i * (1.6 / n));
        if (!at) continue;
        strikeCircle(game, at.x, at.y, 72, { dmg: 15, dur: 0.7 + i * 0.13, color: '#e6e0f2' });
        stamped++;
      }
      // before the memory reaches back far enough, it answers your feet
      if (stamped === 0) strikeCircle(game, p.x, p.y, 90, { dmg: 15, dur: 0.9, color: '#e6e0f2' });
      sfx('tel');
    } else if (atk === 'response') {
      // the response lands mirrored across its body — where you are, and
      // where you would be if you were it answering you
      const mx = 2 * e.x - p.x;
      const my = 2 * e.y - p.y;
      strikeCircle(game, p.x, p.y, 105, { dmg: 17, dur: 1.0, color: '#c9a0ff' });
      strikeCircle(game, mx, my, 105, { dmg: 17, dur: 1.0, color: '#c9a0ff' });
      if (state.phase === 2) {
        // the second couplet, a quarter-turn round the verse
        const rx = e.x - (p.y - e.y);
        const ry = e.y + (p.x - e.x);
        strikeCircle(game, rx, ry, 95, { dmg: 15, dur: 1.25, color: '#c9a0ff' });
        strikeCircle(game, 2 * e.x - rx, 2 * e.y - ry, 95, { dmg: 15, dur: 1.25, color: '#c9a0ff' });
      }
      sfx('tel');
    } else {
      // refrain: it takes your line — and the echo will take it again
      state.dir = { x: t.ux, y: t.uy };
      e.state = 'telegraph';
      e.stateT = state.phase === 2 ? 0.65 : 0.85;
      game.telegraphs.push({
        shape: 'rect', x: e.x + state.dir.x * RUSH_DIST / 2, y: e.y + state.dir.y * RUSH_DIST / 2,
        w: RUSH_DIST + e.r * 2, h: e.r * 2.4, ang: Math.atan2(state.dir.y, state.dir.x),
        t: 0, dur: e.stateT, color: '#e6e0f2', decorative: true,
      });
      sfx('tel');
    }
  },
});
