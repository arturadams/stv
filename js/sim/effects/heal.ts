import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import { registerEffect } from './registry.js';

registerEffect('heal', (game, eff) => {
  const p = game.player;
  const amount = Math.min(eff.amount, p.maxHp - p.hp);
  if (amount <= 0) return;
  p.hp += amount;
  floater(game, p.x, p.y - 30, '+' + amount + ' HEALTH', '#7fd6a8', 13);
  sfx('heal');
});
