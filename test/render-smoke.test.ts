import { afterAll, describe, expect, it } from 'vitest';

import { render } from '../js/render.js';
import { CHUNK, getChunk, worldTheme } from '../js/world.js';
import { makeHeadlessGame, stepGame } from './helpers/headless.js';
import type { HeadlessGame } from './helpers/headless.js';

// The renderer is canvas-only, so headless coverage uses a "black hole"
// context: every method exists, records its call count, and returns the
// proxy itself (so gradient chaining etc. works). A crash in any themed
// drawing path — floors, pools, pillars, lights, atmosphere — fails the test.

type Calls = Record<string, number>;

function makeBlackHole(calls: Calls): Record<string, unknown> {
  const target: Record<PropertyKey, unknown> = {};
  const proxy: Record<string, unknown> = new Proxy(target, {
    get(t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (!(prop in t)) {
        t[prop] = (...args: unknown[]) => {
          void args;
          calls[String(prop)] = (calls[String(prop)] ?? 0) + 1;
          return proxy;
        };
      }
      return t[prop];
    },
  });
  return proxy;
}

// a chunk that owns every themed prop type, so all draw paths execute
function findDressedChunk(game: HeadlessGame) {
  for (let cy = -4; cy <= 4; cy++) {
    for (let cx = -4; cx <= 4; cx++) {
      const ch = getChunk(game, cx, cy);
      if (ch.pools.length && ch.pillars.length && ch.candles.length) return ch;
    }
  }
  return null;
}

const WORLD_THEMES = [
  [1, 'arcane'],
  [2, 'ember'],
  [3, 'abyss'],
  [4, 'abyss'],
] as const;

describe('themed render smoke', () => {
  afterAll(() => {
    delete (globalThis as Record<string, unknown>).document;
  });

  it.each(WORLD_THEMES)('world %i renders its %s dressing headlessly', (world, theme) => {
    const calls: Calls = {};
    (globalThis as Record<string, unknown>).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => makeBlackHole(calls) }),
    };

    const game = makeHeadlessGame(500 + world, 'mage', world);
    expect(worldTheme(game)).toBe(theme);
    stepGame(game, 3, world);

    const dressed = findDressedChunk(game);
    expect(dressed).not.toBeNull();
    if (!dressed) return;
    game.camera.x = dressed.cx * CHUNK + CHUNK / 2;
    game.camera.y = dressed.cy * CHUNK + CHUNK / 2;

    const ctx = makeBlackHole(calls);
    render(game, ctx, 1280, 800);
    game.time += 0.5;
    render(game, ctx, 1280, 800); // second frame animates pools and lights

    expect(calls.drawImage).toBeGreaterThan(0); // chunk floors composited
    expect(calls.fillRect).toBeGreaterThan(0);
    expect((calls.arc ?? 0) + (calls.ellipse ?? 0)).toBeGreaterThan(0);
    expect(calls.createRadialGradient).toBeGreaterThan(0); // glows & world tint
  });
});
