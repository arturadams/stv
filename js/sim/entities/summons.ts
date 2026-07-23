import { sfx } from '../../audio.js';
import { EVT } from '../../core/events.js';
import { nearestEnemy, spawnPlayerProj } from '../combat.js';
import type { GameState } from '../types.js';

export function updateSummons(game: GameState, dt: number): void {
  const p = game.player;
  for (const s of game.summons) {
    s.t += dt;
    // hover near the player
    const dx = p.x + 40 - s.x;
    const dy = p.y - 20 - s.y;
    s.x += dx * dt * 3;
    s.y += dy * dt * 3;
    s.fireT -= dt;
    if (s.fireT <= 0) {
      const t = nearestEnemy(game, s.x, s.y);
      if (t) {
        // Grave Command (design doc-adjacent card fix): +35% attack speed
        // while its 8s window is active, read live off the timer rather than
        // baked into fireRate, so it can't outlive the card or stack on recast
        const graveCommandActive = (game.core.active.graveCommand || 0) > 0;
        s.fireT = graveCommandActive ? s.fireRate * 0.65 : s.fireRate;
        const a = Math.atan2(t.y - s.y, t.x - s.x);
        spawnPlayerProj(
          game, s.x, s.y, a,
          { dmg: s.dmg, speed: 700, radius: 5, critChance: 0.15, element: 'shadow', life: 1.6 },
          s.ctx,
        );
        sfx('cast', 'shadow');
      }
    }
  }
  const alive = [];
  for (const s of game.summons) {
    if (s.t < s.dur) alive.push(s);
    else game.bus.emit(EVT.summonExpired, { summon: s });
  }
  game.summons = alive;
}
