import type { GameState } from '../types.js';

export function updateCosmetics(game: GameState, dt: number): void {
  for (const pt of game.particles) {
    pt.t += dt;
    if (pt.drag) {
      pt.vx *= 1 - Math.min(1, dt * pt.drag);
      pt.vy *= 1 - Math.min(1, dt * pt.drag);
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
  game.particles = game.particles.filter((pt) => pt.t < pt.life);
  if (game.particles.length > 600) game.particles.splice(0, game.particles.length - 600);
  for (const f of game.floaters) {
    f.t += dt;
    f.y -= 34 * dt;
  }
  game.floaters = game.floaters.filter((f) => f.t < f.life);
  for (const fx of game.fx) fx.t += dt;
  game.fx = game.fx.filter((fx) => fx.t < fx.life);
}
