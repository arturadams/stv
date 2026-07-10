import type { GameState } from '../types.js';

// ── the tide ── World III's signature: currents that move the player's feet
// for them. Dashing cuts most of the drag — a well-timed dash escapes any
// undertow — and blink i-frames ignore it entirely.
export function pullPlayer(game: GameState, x: number, y: number, force: number, dt: number): void {
  const p = game.player;
  if (p.untargetable > 0) return;
  const dx = x - p.x;
  const dy = y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const f = p.dashT > 0 ? force * 0.3 : force;
  const step = Math.min(f * dt, d);
  p.x += (dx / d) * step;
  p.y += (dy / d) * step;
}
