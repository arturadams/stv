import { BIOMES, BIOME_IDS, WORLDS } from '../../data/index.js';
import type { BiomeDef, Chunk, WorldDef } from '../../data/types.js';
import { hash2, makeRng } from '../../core/rng.js';
import type { GameState } from '../types.js';

export const CHUNK = 560;
const biomeDefs: Record<string, BiomeDef> = BIOMES;

type WorldState = Pick<GameState, 'world'>;
type ChunkState = Pick<GameState, 'chunks' | 'worldSeed' | 'world'>;
type RegionState = Pick<GameState, 'zoneRegion'>;

export interface RegionObject {
  x: number;
  y: number;
  r?: number;
}

export function worldDef(game: WorldState): WorldDef {
  return WORLDS[Math.min(game.world || 1, WORLDS.length) - 1];
}

export function biomeOf(
  cx: number,
  cy: number,
  seed: number,
  biomeIds: readonly string[] = BIOME_IDS,
): BiomeDef {
  const rx = Math.floor(cx / 6);
  const ry = Math.floor(cy / 6);
  if (rx === 0 && ry === 0) return biomeDefs[biomeIds[0]];
  return biomeDefs[biomeIds[hash2(rx, ry, seed + 77) % biomeIds.length]];
}

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function getChunk(game: ChunkState, cx: number, cy: number): Chunk {
  const key = chunkKey(cx, cy);
  let chunk = game.chunks.get(key);
  if (chunk) return chunk;

  const rng = makeRng(hash2(cx, cy, game.worldSeed));
  const bx = cx * CHUNK;
  const by = cy * CHUNK;
  const distance = Math.max(Math.abs(cx), Math.abs(cy));
  const at = (margin = 80) => ({
    x: bx + margin + rng.float() * (CHUNK - 2 * margin),
    y: by + margin + rng.float() * (CHUNK - 2 * margin),
  });

  chunk = {
    cx,
    cy,
    biome: biomeOf(cx, cy, game.worldSeed, worldDef(game).biomes),
    pillars: [],
    pools: [],
    candles: [],
    deco: [],
  };

  const pillarCount = rng.chance(0.55) ? 0 : 1 + rng.int(2);
  for (let i = 0; i < pillarCount; i++) {
    const point = at(70);
    chunk.pillars.push({ x: point.x, y: point.y, r: 26 + rng.float() * 20 });
  }
  if (rng.chance(0.22)) {
    const point = at(120);
    chunk.pools.push({ x: point.x, y: point.y, r: 70 + rng.float() * 50 });
  }
  const candleCount = rng.int(3);
  for (let i = 0; i < candleCount; i++) chunk.candles.push(at(50));
  for (let i = 0; i < 4 + rng.int(4); i++) {
    chunk.deco.push({
      ...at(30),
      rot: rng.float() * Math.PI * 2,
      kind: rng.chance(0.6) ? 'card' : 'rune',
      g: rng.int(4),
    });
  }
  if (rng.chance(0.06) && distance >= 1) {
    chunk.shrine = { ...at(90), r: 26, cd: 0 };
  }
  if (rng.chance(0.11) && distance >= 2) {
    const point = at(180);
    chunk.camp = {
      x: point.x,
      y: point.y,
      r: 230,
      size: 4 + Math.min(6, distance),
      cleared: false,
      engaged: false,
      alive: 0,
    };
  }
  if (rng.chance(0.035) && distance >= 4) {
    const point = at(200);
    chunk.landmark = {
      x: point.x,
      y: point.y,
      r: 120,
      zoneR: 430,
      cleared: false,
      engaged: false,
    };
  }
  if (rng.chance(0.05) && distance >= 1 && !chunk.camp) {
    chunk.treasure = { ...at(90), opened: false };
  }
  if (
    rng.chance(0.055) &&
    distance >= 2 &&
    !chunk.camp &&
    !chunk.landmark
  ) {
    chunk.sanctuary = {
      ...at(160),
      r: 190,
      seed: hash2(cx, cy, game.worldSeed + 1234),
      lock: false,
      stock: null,
    };
  }
  if (cx === 0 && cy === 0) {
    chunk.pillars = chunk.pillars.slice(0, 1);
    chunk.pools = [];
    chunk.shrine = { x: bx + 140, y: by + 140, r: 26, cd: 0 };
  }

  game.chunks.set(key, chunk);
  return chunk;
}

export function chunksNear(
  game: ChunkState,
  x: number,
  y: number,
  radius = 1,
): Chunk[] {
  const cx = Math.floor(x / CHUNK);
  const cy = Math.floor(y / CHUNK);
  const chunks: Chunk[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      chunks.push(getChunk(game, cx + dx, cy + dy));
    }
  }
  return chunks;
}

export function clampToRegion(
  game: RegionState,
  object: RegionObject,
  padding = 0,
): void {
  const region = game.zoneRegion;
  if (!region) return;
  const dx = object.x - region.x;
  const dy = object.y - region.y;
  const distance = Math.hypot(dx, dy);
  const maxDistance = region.r - (object.r || 12) - padding;
  if (distance > maxDistance) {
    object.x = region.x + dx / distance * maxDistance;
    object.y = region.y + dy / distance * maxDistance;
  }
}
