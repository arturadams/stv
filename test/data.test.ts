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
  it('preserves all 109 uniquely identified cards', () => {
    const ids = CARD_LIST.map((card) => card.id);

    expect(CARD_LIST).toHaveLength(109);
    expect(new Set(ids)).toHaveLength(109);
    expect(Object.keys(CARDS)).toHaveLength(109);
  });

  it('exports every gameplay data collection', () => {
    expect(Object.keys(CLASSES)).toHaveLength(3);
    expect(Object.keys(RELICS).length).toBeGreaterThan(0);
    expect(Object.keys(ENEMIES).length).toBeGreaterThan(0);
    expect(Object.keys(BIOMES).length).toBeGreaterThan(0);
    expect(WORLDS).toHaveLength(5);
  });
});
