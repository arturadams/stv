import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake } from '../fx.js';
import { leadPoint } from './aim.js';
import { strikeBeam, strikeCircle } from './bossKit.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface SovereignState {
  phase: 1 | 2;
  attackT: number;
  attackIdx: number;
  crownAng: number;
}

const SOV_ATTACKS = ['fissures', 'meteors', 'crown', 'legion'] as const;

// ═══ boss: The Cinder Sovereign ═══ the forge-king on its cracked throne.
// It fights with the floor itself: fissures race to where you're running,
// meteors fall along your stride, and its crown sweeps the court in spokes.
registerBehavior<SovereignState>('boss_sovereign', {
  init: (e, game) => ({ phase: 1, attackT: 2.2, attackIdx: 0, crownAng: game.rng.range(0, Math.PI) }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    if (state.phase === 1 && e.hp < e.maxHp * 0.5) {
      state.phase = 2;
      game.banner = { title: 'THE FORGE BURNS WHITE', sub: 'The Sovereign spends its throne to kill you', t: 2.2 };
      shake(game, 14);
      sfx('bossphase');
    }
    // hold the throne at mid range
    if (t.dist > 390) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    } else if (t.dist < 230) {
      e.x -= t.ux * t.spd * dt;
      e.y -= t.uy * t.spd * dt;
    }
    touchAttack(game, e, t.dist, dt);

    state.attackT -= dt * (state.phase === 2 ? 1.35 : 1);
    if (state.attackT > 0) return;
    state.attackT = state.phase === 2 ? 3.2 : 4.0;
    const atk = SOV_ATTACKS[state.attackIdx % SOV_ATTACKS.length];
    state.attackIdx++;

    if (atk === 'fissures') {
      // cracks race from the throne through the player's predicted line —
      // each eruption leaves slag burning on the tiles
      const lines = state.phase === 2 ? 3 : 2;
      for (let l = 0; l < lines; l++) {
        const aim = leadPoint(p, 0.5 + l * 0.45);
        const dx = aim.x - e.x;
        const dy = aim.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        for (let i = 1; i <= 6; i++) {
          const x = e.x + ux * i * 92;
          const y = e.y + uy * i * 92;
          const rr = 68;
          game.telegraphs.push({
            shape: 'circle', x, y, r: rr, t: 0, dur: 0.55 + i * 0.13 + l * 0.1, color: '#ff8a4a',
            onDone: (g) => {
              if (Math.hypot(g.player.x - x, g.player.y - y) < rr + g.player.r) damagePlayer(g, 14, x, y);
              dropHazard(g, x, y, 46, 6, 3.2, '#ff8a4a');
              g.fx.push({ kind: 'blast', x, y, r: rr, color: '#ff8a4a', t: 0, life: 0.4 });
              sfx('boom');
            },
          });
        }
      }
      sfx('fuse');
    } else if (atk === 'meteors') {
      const n = state.phase === 2 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        // half fall along the player's stride, half scatter to cut retreats
        const aim = i % 2 === 0 ? leadPoint(p, 0.5 + i * 0.2) : p;
        const x = aim.x + game.rng.range(-130, 130);
        const y = aim.y + game.rng.range(-130, 130);
        strikeCircle(game, x, y, 95, { dmg: 18, dur: 1.15 + i * 0.14, color: '#ffb347' });
      }
      sfx('tel');
    } else if (atk === 'crown') {
      // the crown of flame: six beam-spokes around the throne, offset each
      // cast so last fight's safe wedge is this fight's pyre
      state.crownAng += 0.6;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const ang = state.crownAng + (i / n) * Math.PI * 2;
        const w = 640;
        strikeBeam(game, e.x + Math.cos(ang) * w * 0.5, e.y + Math.sin(ang) * w * 0.5, w, 72, ang,
          { dmg: 20, dur: 1.4, color: '#ff5d3a' });
      }
      sfx('tel');
    } else {
      const n = state.phase === 2 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawnEnemy(game, e.def.minion || 'imp', e.x + Math.cos(a) * 75, e.y + Math.sin(a) * 75);
      }
      if (state.phase === 2) spawnEnemy(game, 'shardling', e.x, e.y - 80);
      sfx('summon');
    }
  },
});
