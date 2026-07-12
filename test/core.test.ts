import { describe, expect, it, vi } from 'vitest';

import { hash2, makeRng } from '../js/core/rng.js';
import { makeUidCounter } from '../js/core/ids.js';

describe('makeRng', () => {
  it('uses one random default seed when none is provided', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const implicit = makeRng();
    const explicit = makeRng((0.25 * 0x7fffffff) | 0);

    expect(implicit.float()).toBe(explicit.float());
    expect(random).toHaveBeenCalledTimes(1);
    random.mockRestore();
  });

  it('replays the same sequence for the same seed', () => {
    const a = makeRng(123);
    const b = makeRng(123);

    expect(Array.from({ length: 8 }, () => a.float()))
      .toEqual(Array.from({ length: 8 }, () => b.float()));
  });

  it('provides deterministic range, int, pick, and chance helpers', () => {
    const ranged = makeRng(42);
    const rangedRaw = makeRng(42);
    expect(ranged.range(-5, 7)).toBe(-5 + rangedRaw.float() * 12);

    const integer = makeRng(42);
    const integerRaw = makeRng(42);
    expect(integer.int(9)).toBe(Math.floor(integerRaw.float() * 9));

    const picked = makeRng(42);
    const pickedRaw = makeRng(42);
    const values = ['a', 'b', 'c'] as const;
    expect(picked.pick(values)).toBe(values[Math.floor(pickedRaw.float() * values.length)]);

    const chance = makeRng(42);
    const chanceRaw = makeRng(42);
    expect(chance.chance(0.5)).toBe(chanceRaw.float() < 0.5);
  });

  it('forks stable, label-specific streams', () => {
    const rng = makeRng(987);
    expect(rng.fork('movement').float()).toBe(makeRng(987).fork('movement').float());
    expect(rng.fork('movement').float()).not.toBe(rng.fork('loot').float());
  });

  it('rejects invalid collection and integer requests', () => {
    const rng = makeRng(1);
    expect(() => rng.int(0)).toThrow(/positive integer/);
    expect(() => rng.pick([])).toThrow(/non-empty/);
  });
});

describe('hash2', () => {
  it('preserves the procedural map hash', () => {
    expect(hash2(3, -4, 99)).toBe(2868649874);
  });
});

describe('makeUidCounter', () => {
  it('creates independent resettable counters', () => {
    const a = makeUidCounter();
    const b = makeUidCounter();

    expect([a.next(), a.next(), b.next()]).toEqual([1, 2, 1]);
    a.reset();
    expect(a.next()).toBe(1);
    a.reset(10);
    expect(a.next()).toBe(10);
  });
});
