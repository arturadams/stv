// Reaching a world once unlocks its card set for every later run — even back
// in World 1 there's a chance to draft it. Persisted to localStorage when
// available, in-memory otherwise (private browsing, or headless tests).
//
// `localStorage` isn't declared under this project's no-DOM sim tsconfig
// (see tsconfig.sim.json), so it's read off `globalThis` through a narrow
// local interface instead of the ambient DOM `Storage` type. R3.8 replaces
// this module-singleton with an injectable MetaStore.
interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): MinimalStorage | undefined {
  return (globalThis as { localStorage?: MinimalStorage }).localStorage;
}

const META_KEY = 'arcana_meta';

function loadMeta(): { unlockedWorld?: number } {
  try {
    const ls = storage();
    if (ls) return JSON.parse(ls.getItem(META_KEY) || '{}') as { unlockedWorld?: number } || {};
  } catch {
    /* private mode etc. — fall back to memory */
  }
  return {};
}

const META: { unlockedWorld: number } = { unlockedWorld: 1, ...loadMeta() };

export function metaUnlockedWorld(): number {
  return META.unlockedWorld || 1;
}

export function recordWorldReached(n: number): void {
  if (n <= (META.unlockedWorld || 1)) return;
  META.unlockedWorld = n;
  try {
    storage()?.setItem(META_KEY, JSON.stringify(META));
  } catch {
    /* ignore */
  }
}

export function resetMetaProgress(): void {
  META.unlockedWorld = 1;
  try {
    storage()?.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}
