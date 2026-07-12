import { describe, expect, it } from 'vitest';

import { makeRng } from '../js/core/rng.js';
import { draftWeight } from '../js/sim/run/rewards.js';
import { resetMetaProgress, rollStartingDeck, startRun } from '../js/world.js';
import { cardDef, readDeckEntries } from './helpers/data.js';
import { makeHeadlessGame } from './helpers/headless.js';

const SCHOOL = {
  mage: 'Mage',
  warrior: 'Warrior',
  rogue: 'Rogue',
} as const;

describe('starting deck rules', () => {
  // Superseded by the fixed decks in STARTING_DECKS (Card System v2 §15) —
  // rollStartingDeck is no longer on the default run-start path, but stays
  // in source for a possible future draft-style mode, so its own shape
  // guarantees are still worth locking in here.
  it.each([
    ['mage', 11],
    ['warrior', 22],
    ['rogue', 33],
  ] as const)('rolls a valid %s starting deck', (classId, seed) => {
    const deck = readDeckEntries(rollStartingDeck(classId, 1, 1, makeRng(seed)));
    const defs = deck.map((entry) => cardDef(entry.id));
    const ownSchool = SCHOOL[classId];
    const counts = new Map<string, number>();
    for (const entry of deck) counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);

    // The curated 30-card core library (§17) leaves each school with only a
    // handful of live Commons, so the historical exact 10-card/2-copy-cap
    // roll can no longer always fill up — bound it instead of pinning it.
    expect(deck.length).toBeGreaterThan(0);
    expect(deck.length).toBeLessThanOrEqual(10);
    expect(defs.filter((card) => card.school === ownSchool && card.cat === 'Power').length).toBeGreaterThanOrEqual(2);
    expect(defs.some((card) => card.school === ownSchool && card.cat === 'Signature')).toBe(true);
    expect(defs.some((card) => card.school === ownSchool && card.cat === 'Technique')).toBe(true);
    expect(defs.every((card) => !card.disabled)).toBe(true);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(defs.every((card) => (card.world ?? 1) <= 1)).toBe(true);
  });
});

describe('draft weighting', () => {
  it('never offers a disabled card, regardless of school match', () => {
    resetMetaProgress();
    const game = makeHeadlessGame(44, 'mage', 1);

    // 'draw' (Colorless) and 'shield_wall' (Warrior) are both outside the
    // curated 30-card core library (Card System v2 §17) and disabled.
    expect(draftWeight(game, cardDef('draw'))).toBe(0);
    expect(draftWeight(game, cardDef('shield_wall'))).toBe(0);
    game.hasCrossClass = true;
    expect(draftWeight(game, cardDef('shield_wall'))).toBe(0);
  });

  it('weights own-school, colorless, and cross-class cards', () => {
    resetMetaProgress();
    const game = makeHeadlessGame(44, 'mage', 1);
    const own = { world: 1, rarity: 'Common', school: 'Mage', disabled: false } as const;
    const colorless = { world: 1, rarity: 'Common', school: 'Colorless', disabled: false } as const;
    const other = { world: 1, rarity: 'Common', school: 'Warrior', disabled: false } as const;

    expect(draftWeight(game, own)).toBe(55);
    expect(draftWeight(game, colorless)).toBe(55 * 0.35);
    expect(draftWeight(game, other)).toBe(0);

    game.hasCrossClass = true;
    expect(draftWeight(game, other)).toBe(55 * 0.2);
  });

  it('blocks unreached worlds, bleeds unlocked cards down, and favors fresh sets', () => {
    resetMetaProgress();
    const game = makeHeadlessGame(55, 'mage', 1);
    const world2Mage = { world: 2, rarity: 'Common', school: 'Mage', disabled: false } as const;
    expect(draftWeight(game, world2Mage)).toBe(0);

    startRun(game, 'mage', { world: 2 });
    game.world = 1;
    expect(draftWeight(game, world2Mage)).toBe(55 * 0.3);

    game.world = 2;
    expect(draftWeight(game, world2Mage)).toBe(55 * 1.6);
  });
});
