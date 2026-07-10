import { sfx } from '../../audio.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake } from '../fx.js';
import { leadPoint } from './aim.js';
import { strikeBeam, strikeCircle, strikeRing } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface KingState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
}

const KING_ATTACKS = ['verdict', 'cage', 'erasure', 'heralds'] as const;

// ═══ boss: The Unwritten King ═══ a crowned absence where a statue's
// inscription was chiselled out. It doesn't chase — it writes judgments over
// the places you are about to stand.
registerBehavior<KingState>('boss_king', {
  init: () => ({ phase: 1, attackT: 2.4, attackIdx: 0 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE CROWN REMEMBERS NOTHING', sub: 'Its verdicts multiply', t: 2.2 };
      shake(game, 13);
      sfx('bossphase');
    }
    // hold court at mid range
    if (t.dist > 400) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    } else if (t.dist < 240) {
      e.x -= t.ux * t.spd * dt;
      e.y -= t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.3 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.6 : 4.4;
    let atk = KING_ATTACKS[state.attackIdx % KING_ATTACKS.length];
    if (atk === 'heralds' && state.phase === 1) atk = 'verdict'; // heralds only rise in phase 2
    state.attackIdx++;

    if (atk === 'verdict') {
      // judgment strokes: long beams fanned through the player's lead point
      const aim = leadPoint(p, 0.7);
      const axis = Math.atan2(aim.y - e.y, aim.x - e.x);
      const n = state.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const ang = axis + (i - (n - 1) / 2) * 0.38;
        strikeBeam(game, aim.x, aim.y, 880, 88, ang,
          { dmg: 20, dur: 1.2 + i * 0.12, color: '#e8dcc0' });
      }
      sfx('tel');
    } else if (atk === 'cage') {
      // a hexagon of glyph seals around where you're headed — one seal is
      // left unwritten; find the gap and walk out through it
      const aim = leadPoint(p, 0.65);
      const gap = game.rng.int(6);
      const base = game.rng.range(0, Math.PI * 2);
      for (let i = 0; i < 6; i++) {
        if (i === gap) continue;
        const a = base + (i / 6) * Math.PI * 2;
        strikeCircle(game, aim.x + Math.cos(a) * 150, aim.y + Math.sin(a) * 150, 86,
          { dmg: 16, dur: 1.45, color: '#b48cff' });
      }
      // the cage's centre seals last — standing still is also wrong
      strikeCircle(game, aim.x, aim.y, 92, { dmg: 16, dur: 1.85, color: '#b48cff' });
      sfx('tel');
    } else if (atk === 'erasure') {
      // concentric rings of un-writing sweep outward from the throne
      const n = state.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        strikeRing(game, e.x, e.y, 150 + i * 125, 62,
          { dmg: 14, dur: 1.0 + i * 0.34, color: '#e8dcc0' });
      }
      sfx('fuse');
    } else {
      // heralds: two glyph sentinels rise to enforce the court
      for (let i = 0; i < 2; i++) {
        const a = game.rng.range(0, Math.PI * 2);
        spawnEnemy(game, e.def.minion || 'sentinel', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
      }
      sfx('summon');
    }
  },
});
