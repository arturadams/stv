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

    expect(deck).toHaveLength(10);
    expect(defs.filter((card) => card.rarity === 'Common')).toHaveLength(9);
    expect(defs.filter((card) => card.rarity === 'Uncommon')).toHaveLength(1);
    expect(defs.filter((card) => card.school === ownSchool && card.cat === 'Power').length).toBeGreaterThanOrEqual(2);
    expect(defs.some((card) => card.school === ownSchool && card.cat === 'Spell')).toBe(true);
    expect(defs.some((card) => card.school === ownSchool && card.cat === 'Skill')).toBe(true);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(defs.every((card) => (card.world ?? 1) <= 1)).toBe(true);
  });
});

describe('draft weighting', () => {
  it('weights own-school, colorless, and cross-class cards', () => {
    resetMetaProgress();
    const game = makeHeadlessGame(44, 'mage', 1);

    expect(draftWeight(game, cardDef('frost_nova'))).toBe(55);
    expect(draftWeight(game, cardDef('draw'))).toBe(55 * 0.35);
    expect(draftWeight(game, cardDef('shield_wall'))).toBe(0);

    game.hasCrossClass = true;
    expect(draftWeight(game, cardDef('shield_wall'))).toBe(55 * 0.2);
  });

  it('blocks unreached worlds, bleeds unlocked cards down, and favors fresh sets', () => {
    resetMetaProgress();
    const game = makeHeadlessGame(55, 'mage', 1);
    expect(draftWeight(game, cardDef('ash_veil'))).toBe(0);

    startRun(game, 'mage', { world: 2 });
    game.world = 1;
    expect(draftWeight(game, cardDef('ash_veil'))).toBe(55 * 0.3);

    game.world = 2;
    expect(draftWeight(game, cardDef('ash_veil'))).toBe(55 * 1.6);
  });
});
