import { ENEMIES, WORLDS } from '../../data/index.js';
import type { Camp, EnemyDef, Landmark } from '../../data/types.js';
import { sfx } from '../../audio.js';
import { spawnEnemy, spawnPointNear } from '../entities/spawn.js';
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

// A sealed arena is a promise: the fight inside is the whole fight. Lesser
// arcana are dismissed, not slain — no loot, no kill credit — and engaged
// camps re-arm so they can be fought properly later.
export function dismissAmbient(game: FeatureState): void {
  for (const e of game.enemies) {
    if (e.dead || e.def.boss || e.def.rival) continue;
    e.dead = true;
    game.fx.push({ kind: 'spawn', x: e.x, y: e.y, r: e.r * 1.6, color: e.def.glow, t: 0, life: 0.4 });
    if (e.campRef) {
      e.campRef.alive = Math.max(0, e.campRef.alive - 1);
      if (e.campRef.alive <= 0) e.campRef.engaged = false;
    }
  }
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
  // the seal sweeps the field — the arena belongs to the boss alone
  dismissAmbient(game);
  const threat = threatOf(game);
  // gates cycle through the world's three bosses, so no two consecutive
  // gates stage the same fight
  const bosses = worldDef(game).bosses;
  const bossId = bosses[game.worldBossesSlain % bosses.length];
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

const PORTAL_OPEN_TIME = 90;
const PORTAL_RESPAWN_DELAY = 10;

export function openPortal(game: FeatureState, x: number, y: number): void {
  game.portal = { x, y, timeLeft: PORTAL_OPEN_TIME };
  game.portalRespawnT = 0;
  ringFx(game, x, y, 140, '#8fd8ff', 1.0);
  sfx('enchant');
}

export function bossCleared(game: FeatureState): void {
  const landmark = game.zoneRegion?.landmark;
  if (landmark) landmark.cleared = true;
  game.zoneRegion = null;
  game.activeBoss = null;
  game.bossesSlain++;
  game.worldBossesSlain++;
  game.gold += 40;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
  // the court dissolves with its ruler, and the field rests a breath before
  // ambient pressure resumes
  dismissAmbient(game);
  game.spawnT = Math.max(game.spawnT, 8);
  // the portal onward opens only when every gate of this world has fallen
  const remaining = Math.max(0, worldDef(game).bosses.length - game.worldBossesSlain);
  if (remaining <= 0 && game.world < WORLDS.length && !game.portal && game.portalRespawnT <= 0) {
    openPortal(game, landmark ? landmark.x : game.player.x, landmark ? landmark.y : game.player.y);
    game.banner = {
      title: 'THE LAST GATE FALLS',
      sub: 'A passage to the next world tears open — enter before it seals',
      t: 3,
    };
  } else {
    game.banner = {
      title: 'THE GATE FALLS SILENT',
      sub: remaining > 0 && game.world < WORLDS.length
        ? `A relic surfaces — ${remaining} ${remaining === 1 ? 'gate still seals' : 'gates still seal'} the passage onward`
        : 'A relic surfaces from the wreckage',
      t: 2.8,
    };
  }
  offerReward(game, makeRelicReward(game), 'Choose a relic');
  sfx('victory');
}

// the portal is patient, not eternal: it counts down (paused while a fight
// has the player sealed in), collapses if missed, and re-manifests nearer
// the player so a run is never softlocked out of progressing
function updatePortal(game: FeatureState, dt: number): void {
  if (game.zoneRegion) return;
  if (game.portalRespawnT > 0) {
    game.portalRespawnT -= dt;
    if (game.portalRespawnT <= 0) {
      const pt = spawnPointNear(game, 480, 640);
      openPortal(game, pt.x, pt.y);
      game.banner = { title: 'THE PASSAGE RETURNS', sub: 'It found you — enter before it seals again', t: 2.6 };
    }
    return;
  }
  const portal = game.portal;
  if (!portal) return;
  portal.timeLeft -= dt;
  if (portal.timeLeft <= 0) {
    game.portal = null;
    game.portalRespawnT = PORTAL_RESPAWN_DELAY;
    ringFx(game, portal.x, portal.y, 160, '#8fd8ff', 0.8);
    game.banner = { title: 'THE PASSAGE COLLAPSES', sub: 'It will tear open again — soon, and nearer', t: 2.6 };
    sfx('blink');
    return;
  }
  const player = game.player;
  if (Math.hypot(player.x - portal.x, player.y - portal.y) < 46) {
    game.portal = null;
    advanceWorld(game);
  }
}

export function updateWorldFeatures(game: FeatureState, dt: number): void {
  updatePortal(game, dt);
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
  }
}
