import { damagePlayer } from '../combat.js';
import type { GameState, GroundHazard } from '../types.js';

// ── ground hazards ── burning slag, ink pools: the floor itself as a weapon.
// Ticks damage while the player stands inside; damagePlayer's own i-frames
// keep the cadence honest.

export function dropHazard(
  game: GameState,
  x: number,
  y: number,
  r: number,
  dmg: number,
  dur: number,
  color: string,
  kind: GroundHazard['kind'] = 'ember',
): void {
  game.hazards.push({ x, y, r, t: 0, dur, dmg, tickT: 0.35, color, kind });
}

export function updateHazards(game: GameState, dt: number): void {
  const p = game.player;
  for (const hz of game.hazards) {
    hz.t += dt;
    if (Math.hypot(p.x - hz.x, p.y - hz.y) < hz.r + p.r * 0.5) {
      hz.tickT -= dt;
      if (hz.tickT <= 0) {
        hz.tickT = 0.55;
        damagePlayer(game, hz.dmg, hz.x, hz.y);
      }
    }
  }
  game.hazards = game.hazards.filter((hz) => hz.t < hz.dur);
}
