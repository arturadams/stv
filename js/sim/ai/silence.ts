import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake } from '../fx.js';
import { leadPoint } from './aim.js';
import { registerBehavior } from './registry.js';
import { touchAttack } from './index.js';

interface SilenceState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
  wallAng: number;
}

const SILENCE_ATTACKS = ['swallow', 'rest', 'procession'] as const;

// ═══ boss: The Grand Silence ═══ the hole the song left. It is not quiet —
// it is where the sound GOES: circles of floor swallowed whole and left
// tolling, walls of stolen notes flung back out with one gap of true silence
// in them, and the hollow congregation processing in to fill the space.
// Find the rest in every bar; it is the only part that won't kill you.
registerBehavior<SilenceState>('boss_silence', {
  init: (e, game) => ({
    phase: 1, attackT: 2.4, attackIdx: 0, wallAng: game.rng.range(0, Math.PI * 2),
  }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'NOTHING LEFT TO SING', sub: 'The Silence stops pretending to be a place', t: 2.2 };
      shake(game, 14);
      sfx('bossphase');
    }

    // it drifts toward you the way a held breath runs out — slow, certain
    if (t.dist > 190 && !t.rooted) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.3 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.2 : 4.0;
    const atk = SILENCE_ATTACKS[state.attackIdx % SILENCE_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'swallow') {
      // it swallows the ground under your stride — what's left keeps tolling
      const n = state.phase === 2 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const aim = i === 0 ? leadPoint(p, 0.7) : p;
        const x = aim.x + game.rng.range(-50, 50);
        const y = aim.y + game.rng.range(-50, 50);
        const rr = state.phase === 2 ? 170 : 150;
        game.telegraphs.push({
          shape: 'circle', x, y, r: rr, t: 0, dur: 1.4 + i * 0.3, color: '#b48cff',
          onDone: (g) => {
            if (Math.hypot(g.player.x - x, g.player.y - y) < rr + g.player.r) damagePlayer(g, 20, x, y);
            dropHazard(g, x, y, rr * 0.55, 6, 5, '#b48cff', 'toll');
            g.fx.push({ kind: 'blast', x, y, r: rr, color: '#b48cff', t: 0, life: 0.5 });
            shake(g, 8);
            sfx('boom');
          },
        });
      }
      sfx('fuse');
    } else if (atk === 'rest') {
      // every note it ever swallowed, flung back out at once — a full-circle
      // wall with one bar of true silence in it. Stand in the rest.
      state.wallAng += game.rng.range(1.5, 3.5);
      const n = state.phase === 2 ? 34 : 26;
      const gaps = state.phase === 2 ? 1 : 2;
      const gapHalf = state.phase === 2 ? 0.30 : 0.34;
      const speed = 235;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        let inGap = false;
        for (let gi = 0; gi < gaps; gi++) {
          const ga = state.wallAng + gi * ((Math.PI * 2) / gaps);
          const diff = Math.atan2(Math.sin(a - ga), Math.cos(a - ga));
          if (Math.abs(diff) < gapHalf) inGap = true;
        }
        if (inGap) continue;
        game.enemyProjectiles.push({
          x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          r: 6, dmg: 12, color: '#e6e0f2', t: 0,
        });
      }
      game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r * 2.2, color: '#b48cff', t: 0, life: 0.5 });
      sfx('efire');
    } else {
      // the procession: the congregation files in to stand where you might
      const n = state.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + state.wallAng;
        spawnEnemy(game, e.def.minion || 'hollow', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
      }
      if (state.phase === 2) spawnEnemy(game, 'chorus', e.x, e.y - 100);
      sfx('summon');
    }
  },
});
