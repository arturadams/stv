import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { shake } from '../fx.js';
import { spawnEnemy } from '../entities/spawn.js';
import type { CardInstance } from '../../data/types.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface BossState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
}

const BOSS_ATTACKS = ['books', 'pages', 'runes', 'theft'] as const;

// ═══ boss: The Gilded Librarian (boss gates + fallback guardian fights) ═══
registerBehavior<BossState>('boss', {
  init: () => ({ phase: 1, attackT: 2.2, attackIdx: 0 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE ARCHIVE AWAKENS', sub: 'The Librarian misfires reality itself', t: 2.2 };
      shake(game, 14);
      sfx('bossphase');
    }
    // drift: hold mid range
    if (t.dist > 380) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    } else if (t.dist < 220) {
      e.x -= t.ux * t.spd * dt;
      e.y -= t.uy * t.spd * dt;
    }

    touchAttack(game, e, t.dist, dt);
    state.attackT -= dt * (state.phase === 2 ? 1.35 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.4 : 4.2;
    const atk = BOSS_ATTACKS[state.attackIdx % BOSS_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'books') {
      const n = state.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawnEnemy(game, e.def.minion || 'book', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
      }
      sfx('summon');
    } else if (atk === 'pages') {
      for (let i = 0; i < 3; i++) {
        const x = p.x + (i - 1) * 190 + game.rng.range(-40, 40);
        const y = p.y;
        game.telegraphs.push({
          shape: 'rect', x, y, w: 130, h: 460, t: 0, dur: 1.15 + i * 0.18, color: '#ffd97a',
          onDone: (g) => {
            if (Math.abs(g.player.x - x) < 65 + g.player.r && Math.abs(g.player.y - y) < 230 + g.player.r) damagePlayer(g, 20, x, y);
            g.fx.push({ kind: 'rectblast', x, y, w: 130, h: 460, color: '#ffd97a', t: 0, life: 0.4 });
            shake(g, 8);
            sfx('slam');
          },
        });
      }
      sfx('tel');
    } else if (atk === 'runes') {
      const n = state.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const ang = game.rng.range(0, Math.PI * 2);
        const d = game.rng.float() * 160;
        const x = p.x + Math.cos(ang) * d;
        const y = p.y + Math.sin(ang) * d;
        game.telegraphs.push({
          shape: 'circle', x, y, r: 130, t: 0, dur: 1.3 + i * 0.15, color: '#c23b4a',
          onDone: (g) => {
            if (Math.hypot(g.player.x - x, g.player.y - y) < 130 + g.player.r) damagePlayer(g, 18, x, y);
            g.fx.push({ kind: 'blast', x, y, r: 130, color: '#c23b4a', t: 0, life: 0.5 });
            sfx('boom');
          },
        });
      }
      sfx('tel');
    } else if (atk === 'theft') {
      const q = game.engine.queue;
      if (q.length > 0 && !game.stolen) {
        // engine.queue isn't typed until R3.6 — CardEngine internals are still
        // plain JS; this is the same shape `CardEngine.makeCard` produces.
        const inst = q.shift() as CardInstance;
        game.stolen = { inst, t: 6 };
        game.engine.uiDirty = true;
        game.banner = { title: 'CARD STOLEN', sub: `The Librarian takes “${inst.def.name}”`, t: 1.8 };
        game.fx.push({ kind: 'bolt', x1: p.x, y1: p.y, x2: e.x, y2: e.y, color: '#ffd97a', t: 0, life: 0.4 });
        sfx('theft');
      }
    }
    // phase 2 misfires: stray rune circles anywhere near the player
    if (state.phase === 2 && game.rng.chance(0.6)) {
      const x = p.x + (game.rng.float() * 700 - 350);
      const y = p.y + (game.rng.float() * 700 - 350);
      game.telegraphs.push({
        shape: 'circle', x, y, r: 100, t: 0, dur: 1.6, color: '#8f6fff',
        onDone: (g) => {
          if (Math.hypot(g.player.x - x, g.player.y - y) < 100 + g.player.r) damagePlayer(g, 12, x, y);
          g.fx.push({ kind: 'blast', x, y, r: 100, color: '#8f6fff', t: 0, life: 0.4 });
        },
      });
    }
  },
});
