import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake, spark } from '../fx.js';
import { leadPoint } from './aim.js';
import { strikeCircle, strikeRing } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

export interface ReliquaryState {
  phase: 1 | 2;
  mode: 'open' | 'closed';
  modeT: number;
  attackT: number;
  attackIdx: number;
  spiralAng: number;
  chaseT: number;
}

const REL_ATTACKS = ['pearls', 'lament', 'brood'] as const;
const OPEN_TIME = 6.5;
const CLOSED_TIME = 3.4;

// ═══ boss: The Weeping Reliquary ═══ the court's grief, given a shell. It
// cannot walk and does not need to: open, it weeps volleys of pearl and salt;
// sealed, nothing you own can scratch it — it sinks, drifts, and surfaces
// somewhere crueler. Hurt it while it grieves; endure it while it hides.
registerBehavior<ReliquaryState>('boss_reliquary', {
  init: (e, game) => ({
    phase: 1, mode: 'open', modeT: OPEN_TIME, attackT: 1.8, attackIdx: 0,
    spiralAng: game.rng.range(0, Math.PI * 2), chaseT: 1.2,
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE PEARL CRACKS', sub: 'What the Reliquary kept is getting out', t: 2.2 };
      shake(game, 12);
      sfx('bossphase');
    }

    if (state.mode === 'closed') {
      // sealed beneath the tiles — untargetable, but the grief still leaks
      e.state = 'vanish';
      e.stateT = 1;
      state.modeT -= dt;
      state.chaseT -= dt;
      if (state.chaseT <= 0) {
        state.chaseT = state.phase === 2 ? 0.9 : 1.2;
        const aim = leadPoint(p, 0.7);
        strikeCircle(game, aim.x + game.rng.range(-60, 60), aim.y + game.rng.range(-60, 60), 80,
          { dmg: 14, dur: 0.9, color: '#8fd8ff' });
      }
      if (state.modeT <= 0) {
        // it surfaces at your flank with a shockwave of salt
        const a = game.rng.range(0, Math.PI * 2);
        e.x = p.x + Math.cos(a) * 320;
        e.y = p.y + Math.sin(a) * 320;
        state.mode = 'open';
        state.modeT = OPEN_TIME;
        state.attackT = 1.2;
        e.state = 'active';
        spark(game, e.x, e.y, '#c9a0ff', 22, 190, 0.7);
        strikeRing(game, e.x, e.y, 200, 80, { dmg: 18, dur: 1.0, color: '#c9a0ff' });
        shake(game, 10);
        sfx('bossintro');
      }
      return;
    }

    // open: anchored, weeping, killable
    state.modeT -= dt;
    if (state.modeT <= 0) {
      state.mode = 'closed';
      state.modeT = state.phase === 2 ? CLOSED_TIME * 0.75 : CLOSED_TIME;
      state.chaseT = 1.0;
      game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r * 2.6, color: '#c9a0ff', t: 0, life: 0.6 });
      spark(game, e.x, e.y, '#8fd8ff', 16, 150, 0.6);
      sfx('blink');
      return;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.3 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 2.4 : 3.0;
    const atk = REL_ATTACKS[state.attackIdx % REL_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'pearls') {
      // pearls on strings: interleaved spiral arms — walk the seam between
      const arms = state.phase === 2 ? 4 : 3;
      const speed = 250;
      state.spiralAng += 0.5;
      for (let ring = 0; ring < 3; ring++) {
        for (let arm = 0; arm < arms; arm++) {
          const a = state.spiralAng + (arm / arms) * Math.PI * 2 + ring * 0.28;
          const s = speed + ring * 60;
          game.enemyProjectiles.push({
            x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            r: 6, dmg: 11, color: '#e6e0f2', t: 0,
          });
        }
      }
      sfx('efire');
    } else if (atk === 'lament') {
      // it weeps: salt tears fall along your stride and pool as brine
      const n = state.phase === 2 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const aim = i % 2 === 0 ? leadPoint(p, 0.4 + i * 0.2) : p;
        const x = aim.x + game.rng.range(-140, 140);
        const y = aim.y + game.rng.range(-140, 140);
        const rr = 78;
        game.telegraphs.push({
          shape: 'circle', x, y, r: rr, t: 0, dur: 1.0 + i * 0.15, color: '#8fd8ff',
          onDone: (g) => {
            if (Math.hypot(g.player.x - x, g.player.y - y) < rr + g.player.r) damagePlayer(g, 13, x, y);
            dropHazard(g, x, y, 48, 5, 4, '#8fd8ff', 'brine');
            g.fx.push({ kind: 'blast', x, y, r: rr, color: '#8fd8ff', t: 0, life: 0.4 });
            sfx('boom');
          },
        });
      }
      sfx('tel');
    } else {
      // the brood: motes crawl out from under the shell
      const n = state.phase === 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + state.spiralAng;
        spawnEnemy(game, e.def.minion || 'mote', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
      }
      sfx('summon');
    }
  },
});
