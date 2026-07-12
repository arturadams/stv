import { updateBasicAttack } from './basicAttack.js';
import { updateAlly } from './ai/ally.js';
import { updateEnemy } from './ai/index.js';
import { updateCosmetics } from './entities/cosmetics.js';
import { updateHazards } from './entities/hazards.js';
import { updatePickups } from './entities/pickups.js';
import { updateProjectiles } from './entities/projectiles.js';
import { updateSummons } from './entities/summons.js';
import { updateSustains } from './entities/sustains.js';
import { updateTelegraphs } from './entities/telegraphs.js';
import { updateTraps } from './entities/traps.js';
import { updateZones } from './entities/zones.js';
import { floater } from './fx.js';
import { CHUNK, biomeOf, chunksNear, worldDef } from './map/chunks.js';
import { updateWorldFeatures } from './map/features.js';
import { updatePlayer } from './player.js';
import { updateDeniedEncounter, updateMatchmaking } from './run/matchmaking.js';
import { updateAmbientSpawns } from './run/spawning.js';
import type { GameState, Input } from './types.js';

// ═══ master update ═══
export function updateGame(game: GameState, dt: number, input: Input): void {
  game.time += dt;
  if (game.state !== 'combat') return;
  if (game.hitstop > 0) {
    game.hitstop -= dt;
    return;
  }
  let ts = 1;
  if (game.slowmo > 0) {
    game.slowmo -= dt;
    ts = 0.35;
  }
  dt *= ts;

  // the choice moment: world holds still, only cosmetics breathe
  if (game.encounterPause) {
    if (game.rival) game.rival.wob = (game.rival.wob || 0) + dt;
    updateCosmetics(game, dt);
    updateStateLabel(game);
    if (game.mm.state === 'denied') updateDeniedEncounter(game, dt);
    if (game.banner) {
      game.banner.t -= dt;
      if (game.banner.t <= 0) game.banner = null;
    }
    return;
  }

  game.runTime += dt;

  updatePlayer(game, dt, input);
  chunksNear(game, game.player.x, game.player.y, 3); // keep the world generated ahead

  // engine
  const eng = game.engine;
  eng.followPos = { x: game.player.x, y: game.player.y };
  eng.update(dt);

  updateBasicAttack(game, dt);
  updateSustains(game, dt);
  updateTraps(game, dt);

  // class resources
  if (game.rageDecayT > 0) game.rageDecayT -= dt;
  else if (game.rage > 0) game.rage = Math.max(0, game.rage - 4 * dt);

  // the card that owns the Dash counts down
  if (game.dashOverride) {
    game.dashOverride.timeLeft -= dt;
    if (game.dashOverride.timeLeft <= 0) {
      floater(game, game.player.x, game.player.y - 30, 'DASH RESTORED', '#d9b45b', 11);
      game.dashOverride = null;
    }
  }

  // proximity flow: staying near danger builds momentum
  const near = game.enemies.some((e) => e.state !== 'spawn' && Math.hypot(e.x - game.player.x, e.y - game.player.y) < 230);
  if (near) {
    game.dangerT += dt;
    if (game.dangerT >= 2) {
      game.dangerT = 0;
      eng.gainFlow(1, 'danger');
    }
  }

  // stolen card returns
  if (game.stolen) {
    game.stolen.t -= dt;
    if (game.stolen.t <= 0) {
      eng.queue.unshift(game.stolen.inst);
      game.stolen = null;
      eng.uiDirty = true;
      floater(game, game.player.x, game.player.y - 40, 'CARD RETURNED', '#ffd97a', 13);
    }
  }

  updateWorldFeatures(game, dt);
  updateAmbientSpawns(game, dt);
  updateMatchmaking(game, dt);
  updateAlly(game, dt);

  // enemies
  for (const e of game.enemies) if (!e.dead) updateEnemy(game, e, dt);
  game.enemies = game.enemies.filter((e) => !e.dead);

  updateProjectiles(game, dt);
  updateZones(game, dt);
  updateHazards(game, dt);
  updateTelegraphs(game, dt);
  updateSummons(game, dt);
  updatePickups(game, dt);
  updateCosmetics(game, dt);
  updateStateLabel(game);

  // camera
  const cam = game.camera;
  cam.x += (game.player.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (game.player.y - cam.y) * Math.min(1, dt * 5);
  cam.shake = Math.max(0, cam.shake - dt * 40);

  if (game.banner) {
    game.banner.t -= dt;
    if (game.banner.t <= 0) game.banner = null;
  }
}

function updateStateLabel(game: GameState): void {
  const p = game.player;
  const biome = biomeOf(Math.floor(p.x / CHUNK), Math.floor(p.y / CHUNK), game.worldSeed, worldDef(game).biomes);
  let label = `${worldDef(game).sub} · ${biome.name}`;
  if (game.zoneRegion) label = game.zoneRegion.kind === 'duel' ? 'DUEL ZONE' : `${label} — Boss Gate`;
  else if (game.mm.state === 'party' && game.ally) label += ' — Party of 2';
  else if (game.mm.state === 'searching') label += ' — seeking a rival soul…';
  game.stateLabel = label;
}
