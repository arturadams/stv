import { sfx } from '../../audio.js';
import { STATUS_DEFS, damageEnemy, damagePlayer, enemiesIn, killEnemy } from '../combat.js';
import { spawnEnemy } from '../entities/spawn.js';
import { shake, spark } from '../fx.js';
import { chunksNear, clampToRegion } from '../map/chunks.js';
import type { EnemyState, EnemyStatusState, StatusName } from '../../data/types.js';
import type { GameState } from '../types.js';
import { updateBoss } from './boss.js';
import { updateRivalDuel } from './rival.js';

// This module is deliberately still switch-based (see R2.6 in
// REFACTOR_PLAN.md): each behavior branch below reads EnemyDef fields that
// are optional on the type but always present for enemies using that
// behavior (e.g. `range`/`fireRate` for 'ranged'). The `!` assertions below
// encode that data convention; R3.2's typed behavior registry replaces it
// with per-behavior config types instead.

export function touchAttack(game: GameState, e: EnemyState, dist: number, dt: number): void {
  const p = game.player;
  e.touchCd -= dt;
  if (dist < e.r + p.r + 2 && e.touchCd <= 0) {
    e.touchCd = 0.8;
    damagePlayer(game, e.def.dmg, e.x, e.y);
  }
}

export function updateLunger(
  game: GameState,
  e: EnemyState,
  dt: number,
  dist: number,
  ux: number,
  uy: number,
  spd: number,
  rooted: boolean,
): void {
  const p = game.player;
  e.lungeCd -= dt;
  if (e.state === 'telegraph') {
    e.stateT -= dt;
    if (e.stateT <= 0) {
      e.state = 'lunging';
      e.stateT = 0.35;
      sfx('lunge');
    }
    return;
  }
  if (e.state === 'lunging') {
    e.stateT -= dt;
    const dir = e.lungeDir!;
    e.x += dir.x * e.def.lungeSpeed! * dt;
    e.y += dir.y * e.def.lungeSpeed! * dt;
    if (dist < e.r + p.r + 6) damagePlayer(game, e.def.dmg, e.x, e.y);
    if (e.stateT <= 0) {
      // World II knights chain a second lunge before resting
      if ((e.chainLeft || 0) > 0) {
        e.chainLeft = (e.chainLeft || 0) - 1;
        e.state = 'telegraph';
        e.stateT = 0.35;
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        e.lungeDir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
        sfx('tel');
      } else {
        e.state = 'active';
        e.lungeCd = 2.2;
      }
    }
    return;
  }
  // elite shockwave
  if (e.def.waveEvery) {
    e.waveCd -= dt;
    if (e.waveCd <= 0 && dist < e.def.waveR! * 1.5) {
      e.waveCd = e.def.waveEvery;
      const ex = e.x;
      const ey = e.y;
      game.telegraphs.push({
        shape: 'circle', x: ex, y: ey, r: e.def.waveR!, t: 0, dur: e.def.waveTel!, color: e.def.glow,
        onDone: (g) => {
          if (Math.hypot(g.player.x - ex, g.player.y - ey) < e.def.waveR! + g.player.r) damagePlayer(g, e.def.waveDmg!, ex, ey);
          g.fx.push({ kind: 'blast', x: ex, y: ey, r: e.def.waveR!, color: e.def.glow, t: 0, life: 0.5 });
          shake(g, 9);
          sfx('boom');
        },
      });
      sfx('fuse');
    }
  }
  if (!rooted) {
    if (dist < e.def.lungeRange! && e.lungeCd <= 0) {
      e.state = 'telegraph';
      e.stateT = e.def.lungeTel!;
      e.chainLeft = e.def.lungeChain || 0;
      const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      e.lungeDir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
      sfx('tel');
    } else {
      e.x += ux * spd * dt;
      e.y += uy * spd * dt;
    }
  }
  touchAttack(game, e, dist, dt);
}

export function updateEnemy(game: GameState, e: EnemyState, dt: number): void {
  const p = game.player;
  e.wobble += dt * 4;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.kt > 0) {
    e.x += e.kvx * dt;
    e.y += e.kvy * dt;
    e.kt -= dt;
  }
  if (e.mark) {
    e.mark.t -= dt;
    if (e.mark.t <= 0) e.mark = null;
  }

  if (e.state === 'spawn') {
    e.stateT -= dt;
    if (e.stateT <= 0) e.state = 'active';
    return;
  }

  // status ticks
  let slowFactor = 1;
  const statusEntries = Object.entries(e.statuses) as Array<[StatusName, EnemyStatusState]>;
  for (const [name, st] of statusEntries) {
    const sd = STATUS_DEFS[name];
    st.t -= dt;
    if (sd.dps > 0) {
      st.acc = (st.acc || 0) + sd.dps * st.stacks * dt;
      if (st.acc >= 1) {
        const whole = Math.floor(st.acc);
        st.acc -= whole;
        damageEnemy(game, e, whole, { color: sd.color, quiet: true, dot: true });
        if (e.dead) return;
      }
    }
    if (name === 'chill') slowFactor *= 0.5;
    if (st.t <= 0) delete e.statuses[name];
  }
  if (e.freeze > 0) {
    e.freeze -= dt;
    return;
  }
  if (e.stun > 0) {
    e.stun -= dt;
    return;
  }
  const rooted = e.root > 0;
  if (rooted) e.root -= dt;

  for (const ch of chunksNear(game, e.x, e.y, 1)) {
    for (const pool of ch.pools) {
      if (Math.hypot(e.x - pool.x, e.y - pool.y) < pool.r) slowFactor *= 0.7;
    }
  }
  for (const z of game.zones) {
    if (z.slow && Math.hypot(e.x - z.x, e.y - z.y) < z.r) slowFactor *= z.slow;
  }

  const spd = e.def.speed * slowFactor;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const b = e.def.behavior;
  if (b === 'chase') {
    if (!rooted) {
      e.x += (ux * spd + Math.cos(e.wobble) * 22) * dt;
      e.y += (uy * spd + Math.sin(e.wobble * 1.3) * 22) * dt;
    }
    touchAttack(game, e, dist, dt);
  } else if (b === 'ranged') {
    if (!rooted) {
      if (dist > e.def.range!) {
        e.x += ux * spd * dt;
        e.y += uy * spd * dt;
      } else if (dist < e.def.range! * 0.6) {
        e.x -= ux * spd * dt;
        e.y -= uy * spd * dt;
      } else {
        e.x += -uy * spd * 0.6 * dt;
        e.y += ux * spd * 0.6 * dt;
      }
    }
    e.fireT -= dt;
    if (e.fireT <= 0 && dist < e.def.range! * 1.25) {
      e.fireT = e.def.fireRate!;
      const a = Math.atan2(dy, dx);
      game.enemyProjectiles.push({
        x: e.x, y: e.y, vx: Math.cos(a) * e.def.projSpeed!, vy: Math.sin(a) * e.def.projSpeed!,
        r: 7, dmg: e.def.dmg, color: e.def.glow, t: 0,
      });
      sfx('efire');
    }
    touchAttack(game, e, dist, dt);
  } else if (b === 'exploder') {
    if (e.state === 'fuse') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const r = e.def.boomR!;
        if (Math.hypot(p.x - e.x, p.y - e.y) < r + p.r) damagePlayer(game, e.def.dmg, e.x, e.y);
        for (const o of enemiesIn(game, e.x, e.y, r)) {
          if (o !== e) damageEnemy(game, o, e.def.dmg * 0.5, { quiet: true });
        }
        game.fx.push({ kind: 'blast', x: e.x, y: e.y, r, color: e.def.glow, t: 0, life: 0.5 });
        shake(game, 8);
        sfx('boom');
        killEnemy(game, e, {});
      }
      return;
    }
    if (!rooted) {
      e.x += ux * spd * dt;
      e.y += uy * spd * dt;
    }
    if (dist < 95) {
      e.state = 'fuse';
      e.stateT = e.def.fuse!;
      game.telegraphs.push({
        shape: 'circle', x: e.x, y: e.y, r: e.def.boomR!, t: 0, dur: e.def.fuse!, color: e.def.glow, decorative: true,
      });
      sfx('fuse');
    }
  } else if (b === 'stalker') {
    // phase-shifts through ash, reappearing at the player's flank
    e.stalkT = (e.stalkT ?? 3) - dt;
    if (e.state === 'vanish') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const a = game.rng.range(0, Math.PI * 2);
        e.x = p.x + Math.cos(a) * 170;
        e.y = p.y + Math.sin(a) * 170;
        e.state = 'active';
        e.stalkT = game.rng.range(3.5, 5);
        game.fx.push({ kind: 'spawn', x: e.x, y: e.y, r: e.r * 2, color: e.def.glow, t: 0, life: 0.5 });
        sfx('blink');
      }
      return;
    }
    if (e.stalkT <= 0 && dist > 130) {
      e.state = 'vanish';
      e.stateT = 0.9;
      spark(game, e.x, e.y, e.def.glow, 8, 120);
      sfx('blink');
    } else if (!rooted) {
      e.x += ux * spd * dt;
      e.y += uy * spd * dt;
    }
    touchAttack(game, e, dist, dt);
  } else if (b === 'mortar') {
    // artillery: lobs telegraphed magma at your feet; backs off if crowded
    if (!rooted && dist < 180) {
      e.x -= ux * spd * dt;
      e.y -= uy * spd * dt;
    }
    e.fireT -= dt;
    if (e.fireT <= 0 && dist < e.def.range!) {
      e.fireT = e.def.fireRate!;
      const tx = p.x + game.rng.range(-40, 40);
      const ty = p.y + game.rng.range(-40, 40);
      const def = e.def;
      game.telegraphs.push({
        shape: 'circle', x: tx, y: ty, r: def.mortarR!, t: 0, dur: def.mortarTel!, color: def.glow,
        onDone: (g) => {
          if (Math.hypot(g.player.x - tx, g.player.y - ty) < def.mortarR! + g.player.r) damagePlayer(g, def.dmg, tx, ty);
          g.fx.push({ kind: 'blast', x: tx, y: ty, r: def.mortarR!, color: def.glow, t: 0, life: 0.5 });
          sfx('boom');
        },
      });
      sfx('tel');
    }
  } else if (b === 'lunge') {
    // elites that call reinforcements
    if (e.def.summonEvery) {
      e.summonCd = (e.summonCd ?? e.def.summonEvery) - dt;
      if (e.summonCd <= 0 && dist < 600) {
        e.summonCd = e.def.summonEvery;
        for (let i = 0; i < 2; i++) {
          const a = game.rng.range(0, Math.PI * 2);
          spawnEnemy(game, e.def.summonId || 'wisp', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60);
        }
        sfx('summon');
      }
    }
    updateLunger(game, e, dt, dist, ux, uy, spd, rooted);
  } else if (b === 'boss') {
    updateBoss(game, e, dt, dist, ux, uy, spd);
  } else if (b === 'rival') {
    updateRivalDuel(game, e, dt, dist, ux, uy, spd, rooted);
  }
  clampToRegion(game, e);
  // sanctuary wards: enemies cannot enter the rest circle
  for (const ch of chunksNear(game, e.x, e.y, 1)) {
    if (!ch.sanctuary) continue;
    const s = ch.sanctuary;
    const d = Math.hypot(e.x - s.x, e.y - s.y);
    if (d < s.r + e.r) {
      const a = Math.atan2(e.y - s.y, e.x - s.x);
      e.x = s.x + Math.cos(a) * (s.r + e.r);
      e.y = s.y + Math.sin(a) * (s.r + e.r);
    }
  }
}
