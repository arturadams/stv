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
  [4, 'requiem'],
  [5, 'requiem'],
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

// The themed-render smoke above never happens to queue telegraphs or fx, so
// it doesn't exercise those draw paths at all. This sweeps every fx/telegraph
// kind — including the "arcane machinery" pass (directional blast fronts,
// impact flashes, teleport sigils, branching bolts, urgency-pulsing
// telegraphs) — across its full progress range to catch crashes, NaNs, or
// malformed gradient stops that per-frame `Math.random()` jitter can hide.
describe('fx/telegraph render sweep', () => {
  afterAll(() => {
    delete (globalThis as Record<string, unknown>).document;
  });

  it('renders every fx and telegraph kind across its full progress range', () => {
    const calls: Calls = {};
    (globalThis as Record<string, unknown>).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => makeBlackHole(calls) }),
    };

    const game = makeHeadlessGame(777, 'mage', 1);
    stepGame(game, 2, 1);
    const ch = getChunk(game, 0, 0);
    game.camera.x = ch.cx * CHUNK + CHUNK / 2;
    game.camera.y = ch.cy * CHUNK + CHUNK / 2;

    const ctx = makeBlackHole(calls);
    const life = 0.5;
    const dur = 1.0;
    let frames = 0;
    for (let frac = 0; frac <= 1.001; frac += 0.02) {
      const { x, y } = game.camera;
      game.telegraphs = [
        { shape: 'circle', x, y, r: 120, t: frac * dur, dur, color: '#c23b4a' },
        { shape: 'circle', x, y, r: 120, t: frac * dur, dur, color: '#c23b4a', friendly: true },
        { shape: 'rect', x, y: y + 100, w: 220, h: 80, ang: 0.5, t: frac * dur, dur, color: '#c23b4a' },
        { shape: 'ring', x, y, r: 140, band: 30, t: frac * dur, dur, color: '#c23b4a' },
      ] as never;
      game.fx = [
        { kind: 'blast', x, y, r: 110, color: '#ffe66d', dir: 0.7, t: frac * life, life },
        { kind: 'blast', x: x + 150, y, r: 160, color: '#e8dcc0', t: frac * life, life },
        { kind: 'rectblast', x, y: y + 150, w: 200, h: 60, ang: 0.4, color: '#e8dcc0', t: frac * life, life },
        { kind: 'ring', x: x - 100, y: y - 100, r: 80, color: '#b48cff', t: frac * life, life },
        { kind: 'spawn', x: x - 80, y: y - 80, r: 40, color: '#8fd8ff', t: frac * life, life },
        { kind: 'arc', x, y, ang: 1.2, arc: 1.9, range: 130, color: '#e8dcc0', t: frac * life, life },
        { kind: 'bolt', x1: x - 100, y1: y - 100, x2: x + 100, y2: y - 40, color: '#ffe66d', t: frac * life, life },
        { kind: 'streak', x1: x - 200, y1: y - 200, x2: x - 120, y2: y - 160, color: '#e8dcc0', t: frac * life, life },
        { kind: 'cast', x, y, color: '#b48cff', t: frac * life, life },
        { kind: 'impactFlash', x: x + 50, y: y - 20, color: '#e8dcc0', dir: 2.1, crit: false, t: frac * life, life },
        { kind: 'impactFlash', x: x + 60, y: y - 10, color: '#ffd97a', dir: 0.3, crit: true, t: frac * life, life },
        { kind: 'sigil', x, y, color: '#b48cff', phase: 'collapse', t: frac * life, life },
        { kind: 'sigil', x: x + 20, y, color: '#b48cff', phase: 'reconstruct', t: frac * life, life },
      ] as never;
      game.camera.impulseX = Math.sin(frac * 10) * 8;
      game.camera.impulseY = Math.cos(frac * 10) * 8;

      expect(() => render(game, ctx, 1280, 800)).not.toThrow();
      frames++;
    }

    expect(frames).toBeGreaterThan(45);
    expect(calls.createRadialGradient).toBeGreaterThan(0);
    expect(calls.createLinearGradient).toBeGreaterThan(0);
  });
});
