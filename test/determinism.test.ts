import { describe, expect, it } from 'vitest';

import { advanceWorld, createGame, startRun, updateGame } from '../js/world.js';

interface CardView {
  uid: number;
  def: { id: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCardView(value: unknown): value is CardView {
  return isRecord(value)
    && typeof value.uid === 'number'
    && isRecord(value.def)
    && typeof value.def.id === 'string';
}

function readCards(value: unknown): CardView[] {
  if (!Array.isArray(value) || !value.every(isCardView)) {
    throw new TypeError('expected an array of card instances');
  }
  return value;
}

function readChannelCard(value: unknown): CardView[] {
  if (value === null) return [];
  if (!isRecord(value) || !isCardView(value.inst)) {
    throw new TypeError('expected a channel card instance');
  }
  return [value.inst];
}

function inputAt(frame: number) {
  const direction = Math.floor(frame / 180) % 4;
  return {
    up: direction === 0,
    right: direction === 1,
    down: direction === 2,
    left: direction === 3,
    dash: frame % 120 === 0,
  };
}

function simulate(seed: number) {
  const game = createGame({ seed });
  startRun(game, 'mage');

  const initialCardUids = readCards(game.engine.deck).map((card) => card.uid);
  for (let frame = 0; frame < 60 * 60; frame++) {
    updateGame(game, 1 / 60, inputAt(frame));
  }

  const cardIds = [
    ...readCards(game.engine.deck),
    ...readCards(game.engine.discard),
    ...readCards(game.engine.queue),
    ...readChannelCard(game.engine.channel),
  ].map((card) => card.def.id).sort();

  return {
    initialCardUids,
    snapshot: {
      kills: game.kills,
      runTime: game.runTime,
      hp: game.player.hp,
      gold: game.gold,
      worldSeed: game.worldSeed,
      deckIds: game.deckIds,
      cardIds,
    },
  };
}

describe('seeded game simulation', () => {
  it('honors explicit world seeds when starting and advancing a run', () => {
    const game = createGame({ seed: 1 });

    startRun(game, 'mage', { seed: 12345 });
    expect(game.worldSeed).toBe(12345);

    advanceWorld(game, { seed: 67890 });
    expect(game.worldSeed).toBe(67890);
  });

  it('replays identical state and per-game card IDs for the same seed', () => {
    const first = simulate(0x51a7);
    const second = simulate(0x51a7);

    expect(second.initialCardUids).toEqual(first.initialCardUids);
    expect(second.snapshot).toEqual(first.snapshot);
  });
});
