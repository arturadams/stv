import { threatOf } from '../combat.js';
import { spawnEnemy, spawnPointNear } from '../entities/spawn.js';
import { chunksNear, worldDef } from '../map/chunks.js';
import type { GameState } from '../types.js';

// ═══ ambient enemy pressure ═══
export function updateAmbientSpawns(game: GameState, dt: number): void {
  if (game.zoneRegion || game.encounterPause || game.mm.state === 'choice') return;
  // resting players are left alone
  for (const ch of chunksNear(game, game.player.x, game.player.y, 1)) {
    if (ch.sanctuary && Math.hypot(game.player.x - ch.sanctuary.x, game.player.y - ch.sanctuary.y) < ch.sanctuary.r) return;
  }
  const threat = threatOf(game);
  let budget = Math.min(4 + threat * 1.6, 16);
  if (game.ally) budget *= 1.7; // party pressure
  const ambient = game.enemies.filter((e) => !e.campRef && !e.def.boss && !e.def.rival).length;
  game.spawnT -= dt;
  if (game.spawnT <= 0 && ambient < budget) {
    game.spawnT = game.rng.range(1, 2.6);
    const tiers = worldDef(game).tiers;
    const pool = tiers.filter((tier) => threat >= tier.minThreat);
    let total = 0;
    for (const tier of pool) total += tier.w;
    let roll = game.rng.float() * total;
    let pick = pool[0];
    for (const tier of pool) {
      roll -= tier.w;
      if (roll <= 0) {
        pick = tier;
        break;
      }
    }
    const pt = spawnPointNear(game);
    const hpMult = (1 + (threat - 1) * 0.12) * (game.ally ? 1.25 : 1);
    const n = pick.id === tiers[0].id ? 2 + game.rng.int(2) : 1;
    for (let i = 0; i < n; i++) {
      spawnEnemy(game, pick.id, pt.x + game.rng.range(-40, 40), pt.y + game.rng.range(-40, 40), { hpMult });
    }
  }
  // cull enemies that fell too far behind (the world is infinite)
  for (const e of game.enemies) {
    if (!e.campRef && !e.def.boss && !e.def.rival
        && Math.hypot(e.x - game.player.x, e.y - game.player.y) > 1700) e.dead = true;
  }
}
