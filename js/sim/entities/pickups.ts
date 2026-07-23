import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import type { GameState } from '../types.js';

export function updatePickups(game: GameState, dt: number): void {
  const p = game.player;
  for (const pk of game.pickups) {
    pk.t += dt;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < 120) {
      // magnetism
      const a = Math.atan2(p.y - pk.y, p.x - pk.x);
      const pull = 420 * (1 - d / 130);
      pk.vx += Math.cos(a) * pull * dt * 8;
      pk.vy += Math.sin(a) * pull * dt * 8;
    }
    pk.vx *= 1 - Math.min(1, dt * 4);
    pk.vy *= 1 - Math.min(1, dt * 4);
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    if (d < p.r + 12) {
      pk.dead = true;
      if (pk.kind === 'shard') {
        game.engine.gainFlow(1, 'shard');
        sfx('shard');
      } else if (pk.kind === 'gold') {
        const amount = Math.round((pk.value || 1) * game.goldMult);
        game.gold += amount;
        floater(game, p.x, p.y - 26, `+${amount}◈`, '#ffd97a', 12);
        sfx('shard');
      } else {
        p.hp = Math.min(p.maxHp, p.hp + 10);
        floater(game, p.x, p.y - 26, '+10', '#7fe08a', 13);
        sfx('heal');
      }
    }
    if (pk.t > 14) pk.dead = true;
  }
  game.pickups = game.pickups.filter((pk) => !pk.dead);
}
