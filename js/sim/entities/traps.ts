import { EVT } from '../../core/events.js';
import { sfx } from '../../audio.js';
import { applyStatus, enemiesIn, hitEnemy, targetable } from '../combat.js';
import { shake } from '../fx.js';
import type { GameState } from '../types.js';

// ═══ traps ═══
export function updateTraps(game: GameState, dt: number): void {
  for (const tr of game.traps) {
    if (tr.armT > 0) {
      tr.armT -= dt;
      continue;
    }
    tr.ttl -= dt;
    if (tr.ttl <= 0) {
      tr.dead = true;
      continue;
    }
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      if (Math.hypot(e.x - tr.x, e.y - tr.y) > tr.r * 0.55 + e.r) continue;
      // sprung!
      for (const o of enemiesIn(game, tr.x, tr.y, tr.r)) {
        hitEnemy(game, o, tr.dmg, tr.ctx, { critChance: 0 });
        if (o.dead) continue;
        if (tr.root && !o.def.boss && !o.def.rival) o.root = Math.max(o.root || 0, tr.root);
        if (tr.status) applyStatus(game, o, tr.status[0], tr.status[1]);
      }
      game.fx.push({ kind: 'blast', x: tr.x, y: tr.y, r: tr.r, color: tr.color, t: 0, life: 0.4 });
      shake(game, 5);
      sfx('boom');
      tr.dead = true;
      game.bus.emit(EVT.trapTriggered, { x: tr.x, y: tr.y });
      break;
    }
  }
  game.traps = game.traps.filter((tr) => !tr.dead);
}
