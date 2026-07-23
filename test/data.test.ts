import { describe, expect, it } from 'vitest';

import {
  BIOMES,
  CARDS,
  CARD_LIST,
  CLASSES,
  ENEMIES,
  RELICS,
  WORLDS,
} from '../js/data/index.js';

describe('typed data layer', () => {
  it('preserves all 154 uniquely identified cards', () => {
    const ids = CARD_LIST.map((card) => card.id);

    expect(CARD_LIST).toHaveLength(154);
    expect(new Set(ids)).toHaveLength(154);
    expect(Object.keys(CARDS)).toHaveLength(154);
  });

  it('enables ten focused cards for each of the six classes', () => {
    const enabled = CARD_LIST.filter((card) => !card.disabled);
    const schools = ['Mage', 'Warrior', 'Rogue', 'Necromancer', 'Druid', 'Warlock'];

    expect(enabled).toHaveLength(60);
    for (const school of schools) {
      expect(enabled.filter((card) => card.school === school)).toHaveLength(10);
    }
  });

  it('exports every gameplay data collection', () => {
    expect(Object.keys(CLASSES)).toHaveLength(6);
    expect(Object.keys(RELICS).length).toBeGreaterThan(0);
    expect(Object.keys(ENEMIES).length).toBeGreaterThan(0);
    expect(Object.keys(BIOMES).length).toBeGreaterThan(0);
    expect(WORLDS).toHaveLength(5);
  });
});
