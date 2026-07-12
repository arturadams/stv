import { applyStatus, damageEnemy, enemiesIn } from '../combat.js';
import type { GameState } from '../types.js';

export function updateZones(game: GameState, dt: number): void {
  const p = game.player;
  for (const z of game.zones) {
    z.t += dt;
    if (z.follow) {
      z.x = p.x;
      z.y = p.y;
    }
    z.tickT -= dt;
    if (z.tickT <= 0 && z.tickDmg > 0) {
      z.tickT = z.tickRate;
      for (const e of enemiesIn(game, z.x, z.y, z.r)) {
        damageEnemy(game, e, z.tickDmg * (z.ctx ? z.ctx.dmgMult : 1), { color: z.color, quiet: true });
        if (!e.dead && z.status) applyStatus(game, e, z.status[0], z.status[1]);
      }
    }
  }
  game.zones = game.zones.filter((z) => z.t < z.duration);
}
