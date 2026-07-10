import { ENEMIES, WORLDS } from '../../data/index.js';
import type { Camp, EnemyDef, Landmark } from '../../data/types.js';
import { sfx } from '../../audio.js';
import { spawnEnemy } from '../entities/spawn.js';
import { floater, ringFx } from '../fx.js';
import { advanceWorld } from '../run/lifecycle.js';
import { makeCardReward, makeRelicReward, offerReward } from '../run/rewards.js';
import { openSanctuary } from '../run/sanctuary.js';
import type { GameState } from '../types.js';
import { chunksNear, worldDef } from './chunks.js';

const enemyDefs: Record<string, EnemyDef> = ENEMIES;

// This used to be a narrow Pick<GameState, ...>, but engageBossGate/
// campCleared/updateWorldFeatures now call into run/lifecycle, run/rewards,
// run/sanctuary and entities/spawn — all of which need the full GameState —
// so the Pick has grown to cover nearly everything anyway. Kept as a named
// alias since combat.ts composes CombatState from it.
export type FeatureState = GameState;

function threatOf(game: FeatureState): number {
  const distance = Math.hypot(game.player.x, game.player.y);
  return (
    1 +
    game.runTime / 55 +
    game.kills / 50 +
    distance / 3800
  ) * worldDef(game).threatMult;
}

export function campComposition(
  game: FeatureState,
  threat: number,
): Array<[id: string, count: number]> {
  const tiers = worldDef(game).tiers.filter((tier) => threat >= tier.minThreat);
  const composition: Array<[string, number]> = [];
  for (const [index, tier] of tiers.entries()) {
    if (enemyDefs[tier.id].elite) {
      if (game.rng.chance(0.4)) composition.push([tier.id, 1]);
    } else {
      composition.push([
        tier.id,
        index === 0 ? 3 + game.rng.int(3) : 1 + game.rng.int(2),
      ]);
    }
  }
  return composition;
}

export function engageCamp(game: FeatureState, camp: Camp): void {
  camp.engaged = true;
  const threat = threatOf(game);
  const hpMult = 1 + (threat - 1) * 0.12;
  let count = 0;
  for (const [id, enemyCount] of campComposition(game, threat)) {
    for (let i = 0; i < enemyCount; i++) {
      const angle = game.rng.range(0, Math.PI * 2);
      const distance = 40 + game.rng.float() * (camp.r - 60);
      spawnEnemy(
        game,
        id,
        camp.x + Math.cos(angle) * distance,
        camp.y + Math.sin(angle) * distance,
        { hpMult, campRef: camp },
      );
      count++;
    }
  }
  camp.alive = count;
  game.banner = {
    title: 'ENEMY CAMP',
    sub: 'Corrupted arcana defends its hoard',
    t: 1.8,
  };
  sfx('wave');
}

export function campCleared(game: FeatureState, camp: Camp): void {
  camp.cleared = true;
  game.campsCleared++;
  for (let i = 0; i < 5; i++) {
    const angle = game.rng.range(0, Math.PI * 2);
    game.pickups.push({
      x: camp.x,
      y: camp.y,
      vx: Math.cos(angle) * 90,
      vy: Math.sin(angle) * 90,
      kind: 'shard',
      t: 0,
    });
  }
  game.banner = { title: 'CAMP CLEARED', sub: '', t: 1.5 };
  game.gold += 15;
  floater(game, camp.x, camp.y - 40, '+15◈', '#ffd97a', 14);
  ringFx(game, camp.x, camp.y, camp.r, '#ffd97a', 0.8);
  if (game.rng.chance(0.5)) {
    offerReward(game, makeCardReward(game), 'The hoard yields a card');
  }
  sfx('reward');
}

export function engageBossGate(game: FeatureState, landmark: Landmark): void {
  landmark.engaged = true;
  game.zoneRegion = {
    x: landmark.x,
    y: landmark.y,
    r: landmark.zoneR,
    kind: 'boss',
    landmark,
  };
  const threat = threatOf(game);
  const bossId = worldDef(game).boss;
  game.activeBoss = spawnEnemy(
    game,
    bossId,
    landmark.x,
    landmark.y - 120,
    { hpMult: 0.75 + threat * 0.12 / worldDef(game).threatMult },
  );
  game.banner = {
    title: enemyDefs[bossId].name.toUpperCase(),
    sub: 'A boss gate seals behind you',
    t: 2.6,
  };
  sfx('bossintro');
}

export function bossCleared(game: FeatureState): void {
  const landmark = game.zoneRegion?.landmark;
  if (landmark) {
    landmark.cleared = true;
    // only the first boss gate cleared each world opens a portal — later
    // gates still fight/reward normally, they just don't add a second exit
    if (!game.portalOpen && game.world < WORLDS.length) {
      landmark.portal = true;
      game.portalOpen = true;
    }
  }
  game.zoneRegion = null;
  game.activeBoss = null;
  game.bossesSlain++;
  game.gold += 40;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
  game.banner = {
    title: 'THE GATE FALLS SILENT',
    sub: landmark?.portal
      ? 'A relic surfaces — and a passage to the next world opens'
      : 'A relic surfaces from the wreckage',
    t: 2.8,
  };
  offerReward(game, makeRelicReward(game), 'Choose a relic');
  sfx('victory');
}

export function updateWorldFeatures(game: FeatureState, dt: number): void {
  const player = game.player;
  for (const chunk of chunksNear(game, player.x, player.y, 2)) {
    if (chunk.shrine) {
      const shrine = chunk.shrine;
      shrine.cd -= dt;
      if (
        shrine.cd <= 0 &&
        Math.hypot(player.x - shrine.x, player.y - shrine.y) <
          shrine.r + player.r + 6
      ) {
        shrine.cd = 12;
        game.engine.gainFlow(3, 'shrine');
        floater(game, shrine.x, shrine.y - 40, '+3 FLOW', '#8fd8ff', 14);
        ringFx(game, shrine.x, shrine.y, 60, '#8fd8ff', 0.6);
        sfx('shrine');
      }
    }
    if (
      chunk.treasure &&
      !chunk.treasure.opened &&
      Math.hypot(
        player.x - chunk.treasure.x,
        player.y - chunk.treasure.y,
      ) < 34
    ) {
      chunk.treasure.opened = true;
      ringFx(
        game,
        chunk.treasure.x,
        chunk.treasure.y,
        70,
        '#ffd97a',
        0.7,
      );
      if (game.rng.chance(0.6)) {
        offerReward(game, makeCardReward(game), 'The cache holds a card');
      } else {
        for (let i = 0; i < 6; i++) {
          const angle = game.rng.range(0, Math.PI * 2);
          game.pickups.push({
            x: chunk.treasure.x,
            y: chunk.treasure.y,
            vx: Math.cos(angle) * 100,
            vy: Math.sin(angle) * 100,
            kind: 'shard',
            t: 0,
          });
        }
        player.hp = Math.min(player.maxHp, player.hp + 10);
        game.gold += 15;
        floater(game, player.x, player.y - 30, 'CACHE +15◈', '#ffd97a', 14);
      }
      sfx('reward');
    }
    if (game.zoneRegion) continue;
    if (chunk.sanctuary) {
      const sanctuary = chunk.sanctuary;
      const distance = Math.hypot(
        player.x - sanctuary.x,
        player.y - sanctuary.y,
      );
      if (sanctuary.lock && distance > 110) sanctuary.lock = false;
      if (!sanctuary.lock && distance < 48) openSanctuary(game, sanctuary);
    }
    if (
      chunk.camp &&
      !chunk.camp.cleared &&
      !chunk.camp.engaged &&
      Math.hypot(player.x - chunk.camp.x, player.y - chunk.camp.y) <
        chunk.camp.r + 240
    ) {
      engageCamp(game, chunk.camp);
    }
    if (
      chunk.landmark &&
      !chunk.landmark.cleared &&
      !chunk.landmark.engaged &&
      Math.hypot(
        player.x - chunk.landmark.x,
        player.y - chunk.landmark.y,
      ) < chunk.landmark.zoneR - 90
    ) {
      engageBossGate(game, chunk.landmark);
    }
    if (
      chunk.landmark?.portal &&
      Math.hypot(
        player.x - chunk.landmark.x,
        player.y - chunk.landmark.y,
      ) < 42
    ) {
      chunk.landmark.portal = false;
      advanceWorld(game);
      return;
    }
  }
}
