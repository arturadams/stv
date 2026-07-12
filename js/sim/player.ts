import { CLASSES } from '../data/index.js';
import type { CardDef } from '../data/types.js';
import { EVT } from '../core/events.js';
import { distToSegment } from '../core/math.js';
import { sfx } from '../audio.js';
import { applyStatus, hitEnemy, nearestEnemy, targetable } from './combat.js';
import type { FxState } from './fx.js';
import { floater, shake, spark } from './fx.js';
import { chunksNear, clampToRegion } from './map/chunks.js';
import type { DashOverride, GameState, Input } from './types.js';

type ResourceState = Pick<GameState, 'playerClass' | 'rage' | 'rageDecayT'>;
type OpportunityState = Pick<GameState, 'playerClass' | 'opportunity' | 'player'> & FxState;
type ChannelMultState = Pick<GameState, 'playerClass' | 'rage' | 'opportunity' | 'player'> & FxState;

// ═══ class resources ═══
export function gainRage(game: ResourceState, n: number): void {
  if (game.playerClass !== 'warrior') return;
  game.rage = Math.min(100, game.rage + n);
  game.rageDecayT = 2.5;
}

export function gainOpportunity(game: OpportunityState, n: number): void {
  if (game.playerClass !== 'rogue') return;
  const before = game.opportunity;
  game.opportunity = Math.min(CLASSES.rogue.resource.max, game.opportunity + n);
  if (game.opportunity > before) {
    floater(game, game.player.x, game.player.y - 34, 'OPPORTUNITY', '#8ade6a', 11);
  }
}

export function classChannelMult(game: ChannelMultState, def: CardDef): number {
  if (game.playerClass === 'warrior' && def.school === 'Warrior' && game.rage > 0) {
    return 1 / (1 + (game.rage / 100) * 0.8); // up to 80% faster at full Rage
  }
  if (game.playerClass === 'rogue' && def.school === 'Rogue' && game.opportunity > 0) {
    game.opportunity -= 1; // spend a stack to quicken the card
    floater(game, game.player.x, game.player.y - 30, 'QUICKENED', '#8ade6a', 12);
    return 0.6;
  }
  return 1;
}

// ═══ movement, dash, and the card-granted dash override ═══
export function updatePlayer(game: GameState, dt: number, input: Input): void {
  const p = game.player;
  const px0 = p.x;
  const py0 = p.y;
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const mlen = Math.hypot(mx, my);
  if (mlen > 0) {
    mx /= mlen;
    my /= mlen;
    p.moveDir = { x: mx, y: my };
  }

  p.dashCd -= dt;
  p.iframes -= dt;
  p.untargetable -= dt;
  p.touchCd -= dt;

  if (input.dash && p.dashCd <= 0) {
    const ov = game.dashOverride;
    if (ov) {
      p.dashCd = ov.spec.cd || 0.9;
      performOverrideDash(game, ov);
    } else {
      p.dashT = 0.22;
      p.dashCd = 0.9;
      p.iframes = Math.max(p.iframes, 0.3);
      p.dashDir = { ...p.moveDir };
      p.dodgeCredited = false;
    }
    game.bus.emit(EVT.dash, {});
    sfx('dash');
  }
  input.dash = false;

  let speed = p.speed;
  for (const ch of chunksNear(game, p.x, p.y, 1)) {
    for (const pool of ch.pools) {
      if (Math.hypot(p.x - pool.x, p.y - pool.y) < pool.r) speed *= 0.6;
    }
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += p.dashDir.x * 640 * dt;
    p.y += p.dashDir.y * 640 * dt;
    p.trail.push({ x: p.x, y: p.y, t: 0 });
  } else {
    p.x += mx * speed * dt;
    p.y += my * speed * dt;
  }

  // pillar collision from nearby chunks
  for (const ch of chunksNear(game, p.x, p.y, 1)) {
    for (const pil of ch.pillars) {
      const d = Math.hypot(p.x - pil.x, p.y - pil.y);
      if (d < pil.r + p.r) {
        const a = Math.atan2(p.y - pil.y, p.x - pil.x);
        p.x = pil.x + Math.cos(a) * (pil.r + p.r);
        p.y = pil.y + Math.sin(a) * (pil.r + p.r);
      }
    }
  }
  clampToRegion(game, p);

  // smoothed velocity — enemies that lead their shots read this
  if (dt > 0) {
    const k = Math.min(1, dt * 10);
    p.vx += ((p.x - px0) / dt - p.vx) * k;
    p.vy += ((p.y - py0) / dt - p.vy) * k;
  }

  if (mlen > 0) p.facing = Math.atan2(my, mx);
  const t = nearestEnemy(game, p.x, p.y);
  if (t && Math.hypot(t.x - p.x, t.y - p.y) < 520) p.facing = Math.atan2(t.y - p.y, t.x - p.x);

  for (const tr of p.trail) tr.t += dt;
  p.trail = p.trail.filter((tr) => tr.t < 0.3);
}

// the card-granted dash: Teleport / Shadowstep / Charge replace the plain dodge
export function performOverrideDash(game: GameState, ov: DashOverride): void {
  const p = game.player;
  const s = ov.spec;
  const dir = p.moveDir.x || p.moveDir.y
    ? p.moveDir
    : { x: Math.cos(p.facing), y: Math.sin(p.facing) };
  const x0 = p.x;
  const y0 = p.y;
  p.dodgeCredited = false;
  p.iframes = Math.max(p.iframes, 0.35);
  p.dashT = 0.1;
  p.dashDir = { x: 0, y: 0 }; // grazing projectiles still count as perfect dodges
  spark(game, x0, y0, ov.color, 10, 140);
  p.x += dir.x * s.dist;
  p.y += dir.y * s.dist;
  clampToRegion(game, p);
  for (let i = 1; i <= 4; i++) {
    p.trail.push({
      x: x0 + (p.x - x0) * i / 4,
      y: y0 + (p.y - y0) * i / 4,
      t: 0,
      color: ov.color,
    });
  }
  if (s.kind === 'blink') {
    if (s.untargetable) p.untargetable = Math.max(p.untargetable, s.untargetable);
    if (s.empower) {
      p.empower = { ...s.empower };
      floater(game, p.x, p.y - 30, 'EMPOWERED', ov.color, 12);
    }
    spark(game, p.x, p.y, ov.color, 10, 140);
    sfx('blink');
  } else {
    // charge: damage and drag everything along the path
    const ctx = { def: { element: ov.def.element || 'physical' as const }, buffs: {}, dmgMult: 1 };
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      if (distToSegment(e.x, e.y, x0, y0, p.x, p.y) < 60 + e.r) {
        hitEnemy(game, e, s.dmg, ctx, { critChance: 0 });
        if (!e.dead && s.status) applyStatus(game, e, s.status[0], s.status[1]);
        if (!e.dead && s.gather) {
          const ka = Math.atan2(p.y - e.y, p.x - e.x);
          e.kvx = Math.cos(ka) * s.gather;
          e.kvy = Math.sin(ka) * s.gather;
          e.kt = 0.3;
        }
      }
    }
    game.fx.push({
      kind: 'streak', x1: x0, y1: y0, x2: p.x, y2: p.y, color: ov.color, t: 0, life: 0.3,
    });
    shake(game, 5);
    sfx('charge');
  }
}
