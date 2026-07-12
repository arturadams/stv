import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import { registerEffect } from './registry.js';

registerEffect('armor', (game, eff) => {
  const p = game.player;
  p.armor = Math.min(60, p.armor + eff.amount);
  floater(game, p.x, p.y - 30, '+' + eff.amount + ' ARMOR', '#ffd97a', 13);
  sfx('armor');
});

registerEffect('stabilize', (game, eff) => {
  const p = game.player;
  const amt = game.engine.powers.length > 0 ? eff.high : eff.low;
  p.armor = Math.min(60, p.armor + amt);
  floater(game, p.x, p.y - 30, '+' + amt + ' ARMOR', '#ffd97a', 13);
  sfx('armor');
});
