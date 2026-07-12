import { chainFrom, nearestEnemy } from '../combat.js';
import { registerEffect } from './registry.js';

registerEffect('chain', (game, eff, ctx) => {
  const p = game.player;
  const start = nearestEnemy(game, p.x, p.y);
  if (start) chainFrom(game, start, eff, ctx, p.x, p.y);
});
