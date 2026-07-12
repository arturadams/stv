import type { GameState } from '../types.js';

export function updateTelegraphs(game: GameState, dt: number): void {
  for (const tg of game.telegraphs) {
    tg.t += dt;
    if (tg.t >= tg.dur) {
      tg.done = true;
      if (tg.onDone) tg.onDone(game);
    }
  }
  game.telegraphs = game.telegraphs.filter((tg) => !tg.done);
}
