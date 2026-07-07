import { describe, expect, it } from 'vitest';

import type { ZoneRegion } from '../js/data/types.js';

import {
  CHUNK,
  biomeOf,
  chunksNear,
  clampToRegion,
  getChunk,
  worldDef,
} from '../js/sim/map/chunks.js';
import { campComposition, updateWorldFeatures } from '../js/sim/map/features.js';
import { createGame, startRun } from '../js/world.js';

describe('typed chunk map', () => {
  it('generates deterministic cached chunks and the clean home screen', () => {
    const firstGame = createGame({ seed: 101 });
    const secondGame = createGame({ seed: 101 });

    const first = getChunk(firstGame, 0, 0);
    const cached = getChunk(firstGame, 0, 0);
    const sameSeed = getChunk(secondGame, 0, 0);

    expect(cached).toBe(first);
    expect(sameSeed).toEqual(first);
    expect(first.biome.id).toBe('archive');
    expect(first.shrine).toMatchObject({ x: 140, y: 140, r: 26, cd: 0 });
    expect(first.pools).toEqual([]);
  });

  it('queries nearby chunks and clamps objects to sealed regions', () => {
    const game = createGame({ seed: 202 });
    const nearby = chunksNear(game, CHUNK / 2, CHUNK / 2, 1);

    expect(nearby).toHaveLength(9);
    expect(worldDef(game).num).toBe(1);
    expect(biomeOf(0, 0, game.worldSeed).id).toBe('archive');

    const regionState = {
      zoneRegion: { x: 0, y: 0, r: 100, kind: 'duel' } satisfies ZoneRegion,
    };
    const object = { x: 200, y: 0, r: 10 };
    clampToRegion(regionState, object, 5);
    expect(object).toEqual({ x: 85, y: 0, r: 10 });
  });
});

describe('typed world features', () => {
  it('composes and engages a nearby enemy camp', () => {
    const game = createGame({ seed: 303 });
    startRun(game, 'mage', { seed: 303 });
    const chunk = getChunk(game, 0, 0);
    chunk.camp = {
      x: game.player.x,
      y: game.player.y,
      r: 230,
      size: 4,
      cleared: false,
      engaged: false,
      alive: 0,
    };

    const composition = campComposition(game, 1);
    updateWorldFeatures(game, 1 / 60);

    expect(composition.length).toBeGreaterThan(0);
    expect(chunk.camp.engaged).toBe(true);
    expect(chunk.camp.alive).toBeGreaterThan(0);
    expect(game.enemies.length).toBe(chunk.camp.alive);
  });
});
