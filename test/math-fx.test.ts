import { describe, expect, it } from 'vitest';

import { clamp, distToSegment, mustGet, wrapAngle } from '../js/core/math.js';
import { makeRng } from '../js/core/rng.js';
import {
  floater,
  mote,
  ringFx,
  shake,
  spark,
  type FxState,
} from '../js/sim/fx.js';

function makeFxState(seed = 1): FxState {
  return {
    rng: makeRng(seed),
    floaters: [],
    particles: [],
    fx: [],
    camera: { x: 0, y: 0, shake: 0, impulseX: 0, impulseY: 0 },
  };
}

describe('core math', () => {
  it('measures distance to the nearest point on a segment', () => {
    expect(distToSegment(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(distToSegment(15, 4, 0, 0, 10, 0)).toBeCloseTo(Math.hypot(5, 4));
    expect(distToSegment(4, 6, 1, 2, 1, 2)).toBe(5);
  });

  it('normalizes angles while preserving signed pi boundaries', () => {
    expect(wrapAngle(Math.PI)).toBe(Math.PI);
    expect(wrapAngle(-Math.PI)).toBe(-Math.PI);
    expect(wrapAngle(Math.PI * 5 / 2)).toBeCloseTo(Math.PI / 2);
    expect(wrapAngle(-Math.PI * 5 / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('clamps values and retrieves required map entries', () => {
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(4, 0, 10)).toBe(4);

    const values = new Map<string, number | undefined>([['answer', 42], ['empty', undefined]]);
    expect(mustGet(values, 'answer')).toBe(42);
    expect(mustGet(values, 'empty')).toBeUndefined();
    expect(() => mustGet(values, 'missing')).toThrow('Missing map entry: missing');
  });
});

describe('headless simulation FX', () => {
  it('creates floaters with the current default and critical timing', () => {
    const game = makeFxState(7);

    floater(game, 10, 20, '12', '#fff');
    floater(game, 30, 40, 'CRIT', '#ffd97a', 10, true);

    expect(game.floaters[0]).toMatchObject({ y: 20, txt: '12', color: '#fff', t: 0, life: 0.8, size: 13, crit: false });
    expect(game.floaters[0].x).toBeGreaterThanOrEqual(0);
    expect(game.floaters[0].x).toBeLessThan(20);
    expect(game.floaters[1]).toMatchObject({ y: 40, txt: 'CRIT', t: 0, life: 1.1, size: 15, crit: true });
  });

  it('creates particles, rings, and capped camera shake', () => {
    const game = makeFxState(11);

    spark(game, 5, 6, '#abc', 3, 100, 0.5);
    const particle = mote(game, 8, 9, '#def');
    ringFx(game, 1, 2, 30, '#fed', 0.7);
    shake(game, 20);
    shake(game, 20);

    expect(game.particles).toHaveLength(3);
    expect(game.particles.every((item) => item.color === '#abc' && item.drag === 3)).toBe(true);
    expect(particle).toMatchObject({ t: 0, life: 0.7, size: 2.5, color: '#def', add: true, drag: 2 });
    expect(game.fx).toEqual([{ kind: 'ring', x: 1, y: 2, r: 30, color: '#fed', t: 0, life: 0.7 }]);
    expect(game.camera.shake).toBe(26);
  });
});
