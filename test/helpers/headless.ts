import { createGame, startRun, updateGame } from '../../js/world.js';
import type { ClassId } from '../../js/data/types.js';

export type HeadlessGame = ReturnType<typeof createGame>;

export interface HeadlessInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
}

export function makeHeadlessGame(
  seed: number,
  classId: ClassId = 'mage',
  world = 1,
): HeadlessGame {
  const game = createGame({ seed });
  startRun(game, classId, { world });
  return game;
}

export function stepGame(
  game: HeadlessGame,
  seconds: number,
  inputSeed = 1,
): void {
  const inputRng = game.rng.fork('headless-input:' + inputSeed);
  const frames = Math.round(seconds * 60);
  let direction = 0;

  for (let frame = 0; frame < frames; frame++) {
    if (frame % 90 === 0) direction = inputRng.int(8);
    const input: HeadlessInput = {
      up: direction === 0 || direction === 1 || direction === 7,
      right: direction === 1 || direction === 2 || direction === 3,
      down: direction === 3 || direction === 4 || direction === 5,
      left: direction === 5 || direction === 6 || direction === 7,
      dash: frame % 120 === 0,
    };
    updateGame(game, 1 / 60, input);
  }
}
