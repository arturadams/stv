import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { shake } from '../fx.js';
import type { EnemyState } from '../../data/types.js';
import type { GameState, PlayerState, Vec2 } from '../types.js';
import { interceptPoint, leadPoint } from './aim.js';
import { strikeRing } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

export interface ColossusState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
  dir: Vec2 | null;
  chargeT: number;
  chargesLeft: number;
  hit: boolean;
  trailD: number;
  staggerT: number;
}

const COL_ATTACKS = ['charge', 'quake', 'spit'] as const;
const CHARGE_SPEED = 640;
const CHARGE_DIST = 700;

function windUpCharge(game: GameState, e: EnemyState, state: ColossusState, p: PlayerState): void {
  const aim = interceptPoint(p, e.x, e.y, CHARGE_SPEED);
  const d = Math.hypot(aim.x - e.x, aim.y - e.y) || 1;
  state.dir = { x: (aim.x - e.x) / d, y: (aim.y - e.y) / d };
  e.state = 'telegraph';
  e.stateT = 1.0;
  game.telegraphs.push({
    shape: 'rect', x: e.x + state.dir.x * CHARGE_DIST / 2, y: e.y + state.dir.y * CHARGE_DIST / 2,
    w: CHARGE_DIST + e.r * 2, h: e.r * 2.6, ang: Math.atan2(state.dir.y, state.dir.x),
    t: 0, dur: 1.0, color: '#ff7a2f', decorative: true,
  });
  sfx('tel');
}

// ═══ boss: The Slagheart Colossus ═══ a kiln the size of a keep, walking.
// Everything it does breaks the arena: charges that burn a scar across the
// court, quake rings you dodge between, slag it spits along your stride.
// After a charge it must catch its breath — that pause is your window.
registerBehavior<ColossusState>('boss_colossus', {
  init: () => ({
    phase: 1, attackT: 2.6, attackIdx: 0, dir: null, chargeT: 0,
    chargesLeft: 0, hit: false, trailD: 0, staggerT: 0,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE SLAG HEART BARES ITSELF', sub: 'The Colossus no longer stops to breathe', t: 2.2 };
      shake(game, 15);
      sfx('bossphase');
    }

    if (e.state === 'telegraph') {
      e.stateT -= dt;
      shake(game, 1.5);
      if (e.stateT <= 0) {
        e.state = 'lunging';
        state.chargeT = CHARGE_DIST / CHARGE_SPEED;
        state.hit = false;
        state.trailD = 0;
        sfx('lunge');
      }
      return;
    }
    if (e.state === 'lunging') {
      const dir = state.dir!;
      const step = CHARGE_SPEED * dt;
      e.x += dir.x * step;
      e.y += dir.y * step;
      state.trailD += step;
      if (state.trailD > 48) {
        state.trailD = 0;
        dropHazard(game, e.x - dir.x * 26, e.y - dir.y * 26, 52, 8, 4, '#ff7a2f');
      }
      if (!state.hit && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 8) {
        state.hit = true;
        damagePlayer(game, e.def.dmg, e.x, e.y);
      }
      state.chargeT -= dt;
      if (state.chargeT <= 0) {
        e.state = 'active';
        shake(game, 11);
        sfx('slam');
        // the slam ripples outward
        for (let i = 0; i < 2; i++) {
          strikeRing(game, e.x, e.y, 170 + i * 130, 60, { dmg: 16, dur: 0.85 + i * 0.3, color: '#ff7a2f' });
        }
        if (state.chargesLeft > 0) {
          state.chargesLeft--;
          windUpCharge(game, e, state, p);
        } else {
          // winded: the one honest window to unload on it
          state.staggerT = state.phase === 2 ? 0.8 : 1.5;
        }
      }
      return;
    }

    if (state.staggerT > 0) {
      state.staggerT -= dt;
      return;
    }

    // ponderous walk
    if (t.dist > 120) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.3 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.6 : 4.6;
    const atk = COL_ATTACKS[state.attackIdx % COL_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'charge') {
      state.chargesLeft = state.phase === 2 ? 1 : 0;
      windUpCharge(game, e, state, p);
    } else if (atk === 'quake') {
      const n = state.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        strikeRing(game, e.x, e.y, 160 + i * 135, 64, { dmg: 16, dur: 1.0 + i * 0.32, color: '#ffb347' });
      }
      sfx('fuse');
    } else {
      // molten spit: globs arc onto the player's line of retreat
      const n = state.phase === 2 ? 7 : 5;
      const aim = leadPoint(p, 0.7);
      const base = Math.atan2(aim.y - e.y, aim.x - e.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.24;
        const d = t.dist * (0.75 + game.rng.float() * 0.5);
        const x = e.x + Math.cos(a) * d;
        const y = e.y + Math.sin(a) * d;
        const rr = 62;
        game.telegraphs.push({
          shape: 'circle', x, y, r: rr, t: 0, dur: 1.1 + i * 0.08, color: '#ff7a2f',
          onDone: (g) => {
            if (Math.hypot(g.player.x - x, g.player.y - y) < rr + g.player.r) damagePlayer(g, 12, x, y);
            dropHazard(g, x, y, 44, 6, 3.5, '#ff7a2f');
            g.fx.push({ kind: 'blast', x, y, r: rr, color: '#ff7a2f', t: 0, life: 0.4 });
            sfx('boom');
          },
        });
      }
      sfx('tel');
    }
  },
});
