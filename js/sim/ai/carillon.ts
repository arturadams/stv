import { sfx } from '../../audio.js';
import { dropHazard } from '../entities/hazards.js';
import { shake } from '../fx.js';
import { leadPoint } from './aim.js';
import { strikeBeam, strikeCircle, strikeRing } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface CarillonState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
}

const CARILLON_ATTACKS = ['peal', 'changes', 'clapper'] as const;

// ═══ boss: The Ninefold Carillon ═══ the belfry did not fall — it stood up.
// Nine bells in a walking frame, rung by nothing. It fights in rings: peals
// that resolve outward band by band, changes that march across the floor in
// sequence, and a clapper that swings once and leaves the stone tolling.
// Every attack is a rhythm; learn the beat and stand in the rests.
registerBehavior<CarillonState>('boss_carillon', {
  init: () => ({ phase: 1, attackT: 2.4, attackIdx: 0 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE NINTH CHANGE', sub: 'Every bell that ever hung here rings at once', t: 2.2 };
      shake(game, 14);
      sfx('bossphase');
    }

    // it advances at a processional pace — the rings do the running
    if (t.dist > 220 && !t.rooted) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.3 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.4 : 4.3;
    const atk = CARILLON_ATTACKS[state.attackIdx % CARILLON_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'peal') {
      // the peal: concentric bands resolve outward — walk between them,
      // in time with them, out to the silence past the last ring
      const bands = state.phase === 2 ? 4 : 3;
      for (let i = 0; i < bands; i++) {
        strikeRing(game, e.x, e.y, 150 + i * 130, 78, {
          dmg: 17, dur: 0.95 + i * 0.4, color: '#d9985b',
        });
      }
      shake(game, 4);
      sfx('fuse');
    } else if (atk === 'changes') {
      // change-ringing: a sequence of strikes marching down your line,
      // each a beat behind the last — outpace the sequence or cut across it
      const n = state.phase === 2 ? 6 : 5;
      const aim = leadPoint(p, 0.6);
      const dx = aim.x - e.x;
      const dy = aim.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.max(d + 170, 480);
      for (let i = 0; i < n; i++) {
        const f = (i + 1) / n;
        strikeCircle(game, e.x + (dx / d) * reach * f, e.y + (dy / d) * reach * f, 88, {
          dmg: 16, dur: 0.8 + i * 0.22, color: '#e8dcc0',
        });
      }
      sfx('tel');
    } else {
      // the clapper: one full swing through the player's line — the stone
      // it strikes keeps tolling long after the swing is done
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      const w = 720;
      const cx = e.x + Math.cos(ang) * w * 0.5;
      const cy = e.y + Math.sin(ang) * w * 0.5;
      strikeBeam(game, cx, cy, w, 92, ang, { dmg: 22, dur: state.phase === 2 ? 0.95 : 1.15, color: '#d9985b' });
      for (let i = 1; i <= 3; i++) {
        const f = i / 3.5;
        dropHazard(game, e.x + Math.cos(ang) * w * f, e.y + Math.sin(ang) * w * f,
          54, 6, 4.5, '#c9a0ff', 'toll');
      }
      sfx('tel');
    }
  },
});
