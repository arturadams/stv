export interface Rng {
  float(): number;
  range(a: number, b: number): number;
  int(n: number): number;
  pick<T>(values: readonly T[]): T;
  chance(p: number): boolean;
  fork(label: string): Rng;
}

export function hash2(x: number, y: number, seed: number): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 974711 + 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function hashLabel(label: string): number {
  let hash = 2166136261;
  for (let i = 0; i < label.length; i++) {
    hash ^= label.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRng(seed = (Math.random() * 0x7fffffff) | 0): Rng {
  const initialSeed = seed | 0;
  let state = initialSeed;

  const float = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    float,
    range: (a, b) => a + float() * (b - a),
    int: (n) => {
      if (!Number.isInteger(n) || n <= 0) {
        throw new RangeError('int(n) requires a positive integer');
      }
      return Math.floor(float() * n);
    },
    pick: <T>(values: readonly T[]): T => {
      if (values.length === 0) {
        throw new RangeError('pick(values) requires a non-empty collection');
      }
      return values[Math.floor(float() * values.length)];
    },
    chance: (p) => float() < p,
    fork: (label) => makeRng(hash2(hashLabel(label), label.length, initialSeed)),
  };
}
