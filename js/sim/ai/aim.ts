import type { PlayerState } from '../types.js';
import type { Vec2 } from '../types.js';

// ── predictive aiming ── enemies that are dangerous because they read your
// movement, not because their numbers are big. Both helpers work off the
// smoothed velocity updatePlayer maintains.

// Where the player will be `time` seconds from now, with the lead capped so a
// standing-start dash doesn't send attacks absurdly far off target.
export function leadPoint(p: PlayerState, time: number, cap = 300): Vec2 {
  const dx = p.vx * time;
  const dy = p.vy * time;
  const d = Math.hypot(dx, dy);
  const s = d > cap ? cap / d : 1;
  return { x: p.x + dx * s, y: p.y + dy * s };
}

// Classic quadratic intercept: where must a projectile fired from (sx, sy) at
// `speed` aim to meet the player mid-stride? Falls back to the current
// position when no intercept exists (player outrunning the shot).
export function interceptPoint(
  p: PlayerState,
  sx: number,
  sy: number,
  speed: number,
  maxLead = 1.1,
): Vec2 {
  const rx = p.x - sx;
  const ry = p.y - sy;
  const a = p.vx * p.vx + p.vy * p.vy - speed * speed;
  const b = 2 * (rx * p.vx + ry * p.vy);
  const c = rx * rx + ry * ry;
  let t = 0;
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) > 1e-6) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const t1 = (-b - sq) / (2 * a);
      const t2 = (-b + sq) / (2 * a);
      if (t1 > 0) t = t1;
      else if (t2 > 0) t = t2;
    }
  }
  if (!(t > 0)) t = 0;
  t = Math.min(t, maxLead);
  return { x: p.x + p.vx * t, y: p.y + p.vy * t };
}

// Is the player inside a rotated rectangle centred at (cx, cy)? Used by the
// beam attacks whose telegraphs carry an `ang`.
export function inRotRect(
  px: number,
  py: number,
  pr: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  ang: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  const cos = Math.cos(-ang);
  const sin = Math.sin(-ang);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) < w / 2 + pr && Math.abs(ly) < h / 2 + pr;
}
