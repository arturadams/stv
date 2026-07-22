import { applyStatus, damageEnemy, enemiesIn } from '../combat.js';
import type { GameState } from '../types.js';
import type { Zone } from '../types.js';

// Moonlit Grove / World Tree promise Aspect-reactive behavior their generic
// `zone` effect (tickDmg: 0) can't express on its own — special-cased here
// by card id, same way coreMechanic.ts special-cases individual card ids.
function applyDruidZoneTick(game: GameState, zone: Zone): void {
  const id = zone.ctx?.def?.id;
  if (id !== 'moonlit_grove' && id !== 'world_tree') return;
  const p = game.player;
  if (Math.hypot(p.x - zone.x, p.y - zone.y) > zone.r) return;
  const wolf = (game.core.active.wolfAspect || 0) > 0;
  const bear = (game.core.active.bearAspect || 0) > 0;
  const healPlayer = (amount: number) => {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + amount);
  };
  if (id === 'moonlit_grove') {
    // direct assignment, not Math.max against the shared global — otherwise
    // a higher tier (Wolf) never steps back down once Aspect changes or
    // expires, since later neutral/Bear ticks would just re-affirm the max
    if (wolf) {
      game.engine.hasteMult = 1.25;
      game.engine.hasteTimer = zone.tickRate + 0.2;
    } else if (bear) {
      healPlayer(3);
    } else {
      game.engine.hasteMult = 1.1;
      game.engine.hasteTimer = zone.tickRate + 0.2;
      healPlayer(1.5);
    }
  } else {
    // World Tree: healing sanctuary that briefly roots anything inside it
    healPlayer(4);
    for (const e of enemiesIn(game, zone.x, zone.y, zone.r)) e.root = Math.max(e.root, 0.6);
  }
}

export function updateZones(game: GameState, dt: number): void {
  const p = game.player;
  for (const z of game.zones) {
    z.t += dt;
    if (z.follow) {
      z.x = p.x;
      z.y = p.y;
    }
    z.tickT -= dt;
    if (z.tickT <= 0) {
      z.tickT = z.tickRate;
      if (z.tickDmg > 0) {
        for (const e of enemiesIn(game, z.x, z.y, z.r)) {
          damageEnemy(game, e, z.tickDmg * (z.ctx ? z.ctx.dmgMult : 1), { color: z.color, quiet: true });
          if (!e.dead && z.status) applyStatus(game, e, z.status[0], z.status[1]);
        }
      }
      applyDruidZoneTick(game, z);
    }
  }
  game.zones = game.zones.filter((z) => z.t < z.duration);
}
